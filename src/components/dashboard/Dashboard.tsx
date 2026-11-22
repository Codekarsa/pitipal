import { useState, useEffect, lazy, Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, PiggyBank, Settings, MoreHorizontal, CreditCard, ArrowDownLeft, ArrowUpRight, Wallet } from "lucide-react";
import { PocketCard } from "./PocketCard";
import { CreatePocketDialog } from "./CreatePocketDialog";
import { TransactionDialog } from "./TransactionDialog";
import { DebtOverviewCard } from "./DebtOverviewCard";
import { CreditCardPaymentDialog } from "./CreditCardPaymentDialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MonthNavigator } from "./MonthNavigator";
import { TemplateManagementDialog } from "./TemplateManagementDialog";
import { BudgetPlanningDialog } from "./BudgetPlanningDialog";
import { EditPocketDialog } from "./EditPocketDialog";
import { SetupChecklist, SetupPocket } from "./SetupChecklist";
import { CompactAmount } from "@/components/ui/compact-amount";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { calculatePocketSpending, PocketSpending } from "@/utils/pocketCalculations";

// Keep the charting library out of the initial sign-in and setup bundle.
const SpendingTrend = lazy(() => import("./DashboardActivity").then(module => ({ default: module.SpendingTrend })));
const DashboardActivity = lazy(() => import("./DashboardActivity").then(module => ({ default: module.DashboardActivity })));

interface BudgetPocket {
  id: string;
  name: string;
  description: string | null;
  budget_amount: number;
  cycle_type: string;
  color: string;
  is_featured: boolean;
  pocket_type: string;
  budget_type: string;
  is_template: boolean;
  month_year: string | null;
  parent_pocket_id: string | null;
  auto_renew: boolean;
  recurring_rule: unknown;
  base_budget_amount?: number | null;
  carried_over_amount?: number | null;
}

export function Dashboard() {
  const [showCreatePocket, setShowCreatePocket] = useState(false);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [firstTransactionPocket, setFirstTransactionPocket] = useState<SetupPocket>();
  const [showTemplateManagement, setShowTemplateManagement] = useState(false);
  const [showPlanning, setShowPlanning] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showEditPocket, setShowEditPocket] = useState(false);
  const [selectedPocketForEdit, setSelectedPocketForEdit] = useState<BudgetPocket | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), "yyyy-MM"));
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Fetch user profile for currency preference
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching profile:", error);
        return { currency: 'USD' }; // fallback
      }

      return data || { currency: 'USD' };
    },
    enabled: !!user?.id,
  });

  const userCurrency = profile?.currency || 'USD';

  // Fetch pocket spending data
  const { data: pocketData, isLoading, error } = useQuery({
    queryKey: ['pocketSpending', user?.id, selectedMonth],
    queryFn: async () => {
      if (!user?.id) return { pockets: [], monthlyTransactions: [], totalBudget: 0, totalSpent: 0, totalRemaining: 0, totalIncome: 0, unassignedSpent: 0, unassignedCount: 0 };
      return await calculatePocketSpending(user.id, selectedMonth);
    },
    enabled: !!user?.id,
  });

  const pockets = pocketData?.pockets || [];

  // Calculate totals from pocketData or fallback to calculating from pockets
  const totalBudget = pocketData?.totalBudget ?? 0;
  const totalSpent = pocketData?.totalSpent ?? 0;
  const totalRemaining = pocketData?.totalRemaining ?? 0;
  const totalIncome = pocketData?.totalIncome ?? 0;
  const expensePockets = pockets.filter(p => p.pocket_type === 'expense');
  const overBudgetPockets = expensePockets.filter(p => p.currentAmount > p.budgetAmount).length;
  const budgetUsed = totalBudget > 0 ? Math.max(0, Math.min(100, totalSpent / totalBudget * 100)) : 0;
  const monthlyTransactions = pocketData?.monthlyTransactions ?? [];

  // Handle errors from React Query
  useEffect(() => {
    if (error) {
      toast({
        title: "Error loading pockets",
        description: "Failed to load pocket data. Please try again.",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  const handleEditPocket = async (pocket: PocketSpending) => {
    try {
      // Fetch the full pocket data to get parent_pocket_id and month_year
      const { data: pocketData, error: fetchError } = await supabase
        .from("budget_pockets")
        .select("*")
        .eq("id", pocket.id)
        .single();

      if (fetchError) throw fetchError;

      setSelectedPocketForEdit(pocketData);
      setShowEditPocket(true);
    } catch (error) {
      console.error("Error loading pocket for edit:", error);
      toast({
        title: "Error",
        description: "Failed to load pocket data.",
        variant: "destructive",
      });
    }
  };

  const handlePocketUpdated = () => {
    setShowEditPocket(false);
    setSelectedPocketForEdit(null);
    queryClient.invalidateQueries({ queryKey: ['pocketSpending', user?.id] });
    toast({
      title: "Pocket updated!",
      description: "Your budget pocket has been updated successfully.",
    });
  };

  const handlePocketCreated = () => {
    setShowCreatePocket(false);
    queryClient.invalidateQueries({ queryKey: ['pocketSpending', user?.id, selectedMonth] });
    toast({
      title: "Pocket created!",
      description: "Your new budget pocket has been created successfully.",
    });
  };

  const handleDeletePocket = async (pocketId: string) => {
    try {
      const { error } = await supabase
        .from("budget_pockets")
        .update({ is_active: false })
        .eq("id", pocketId)
        .eq("user_id", user?.id);

      if (error) throw error;

      // Refresh the pockets data
      queryClient.invalidateQueries({ queryKey: ['pocketSpending', user?.id, selectedMonth] });

      toast({
        title: "Pocket deleted",
        description: "Your pocket has been successfully deleted.",
      });
    } catch (error) {
      console.error("Error deleting pocket:", error);
      toast({
        title: "Error",
        description: "Failed to delete pocket. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleTransactionAdded = () => {
    setShowAddTransaction(false);
    queryClient.invalidateQueries({ queryKey: ['pocketSpending', user?.id, selectedMonth] });
    toast({
      title: "Transaction added!",
      description: "Your transaction has been recorded successfully.",
    });
  };

  const handleToggleFeatured = async (pocketId: string) => {
    try {
      // Fetch the pocket to get parent_pocket_id
      const { data: pocketData, error: fetchError } = await supabase
        .from("budget_pockets")
        .select("parent_pocket_id, is_featured")
        .eq("id", pocketId)
        .single();

      if (fetchError) throw fetchError;

      // If pocket has a template (parent_pocket_id), update the template's featured status
      const targetId = pocketData.parent_pocket_id || pocketId;

      // Get current featured status
      const { data: targetData, error: targetFetchError } = await supabase
        .from("budget_pockets")
        .select("is_featured")
        .eq("id", targetId)
        .single();

      if (targetFetchError) throw targetFetchError;

      // Toggle featured on template (or pocket if no template)
      const { error } = await supabase
        .from("budget_pockets")
        .update({ is_featured: !targetData.is_featured })
        .eq("id", targetId)
        .eq("user_id", user?.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['pocketSpending', user?.id, selectedMonth] });

      toast({
        title: targetData.is_featured ? "Pocket unfeatured" : "Pocket featured",
        description: targetData.is_featured
          ? "Pocket will stay visible with your other pockets"
          : "Pocket moved to the top of your dashboard",
      });
    } catch (error) {
      console.error("Error toggling featured:", error);
      toast({
        title: "Error",
        description: "Failed to update pocket. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (!user || !profile || isLoading) {
    return (
      <div className="space-y-8">
        <div className="grid gap-4 xl:grid-cols-[1fr_1.4fr]" role="status" aria-label="Loading dashboard">
          {[...Array(2)].map((_, i) => (
            <Card key={i} className="h-48 shadow-none animate-pulse">
              <CardHeader className="pb-3">
                <div className="h-4 bg-muted rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-muted rounded w-full"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      {/* Month Filter */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-medium tracking-tight">Dashboard</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">A little more clarity. A little more control.</p>
        </div>
        <MonthNavigator
          selectedMonth={selectedMonth}
          onMonthChange={setSelectedMonth}
          className="rounded-full border-0 px-2"
        />
      </div>

      <SetupChecklist
        currency={userCurrency}
        remaining={totalRemaining}
        hasSpendingBudget={totalBudget > 0}
        onCreatePocket={() => {
          setSelectedMonth(format(new Date(), "yyyy-MM"));
          setShowCreatePocket(true);
        }}
        onAddTransaction={(pocket) => {
          setFirstTransactionPocket(pocket);
          setSelectedMonth(pocket?.month_year ?? format(new Date(), "yyyy-MM"));
          setShowAddTransaction(true);
        }}
      />

      <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_280px] 2xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-7">
      <div className="grid gap-4 min-[380px]:grid-cols-2 sm:grid-cols-[1.15fr_1fr_1fr]">
        <Card className="flex min-w-0 flex-col rounded-[1.75rem] border-0 p-5 shadow-none min-[380px]:col-span-2 sm:col-span-1 sm:p-6">
          <CardTitle className="text-base font-medium">{totalRemaining < 0 ? 'Over budget' : 'Remaining'}</CardTitle>
          <div className="my-4 flex items-center gap-5 sm:my-5 sm:justify-center">
            <div className="relative h-24 w-24 shrink-0 sm:h-28 sm:w-28" role="img" aria-label={totalBudget > 0 ? `${formatNumber(totalSpent / totalBudget * 100)}% of spending budget used` : 'No spending budget set'}>
              <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden="true"><circle cx="50" cy="50" r="43" fill="none" stroke="hsl(var(--muted))" strokeWidth="5" /><circle cx="50" cy="50" r="43" fill="none" stroke={totalRemaining < 0 ? 'hsl(var(--destructive))' : 'hsl(350 80% 70%)'} strokeWidth="5" strokeLinecap="round" pathLength="100" strokeDasharray={`${budgetUsed} 100`} /></svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-2xl font-medium tracking-tight">{totalRemaining < 0 ? 'Over' : totalBudget > 0 ? `${Math.round(budgetUsed)}%` : '—'}</span><span className="mt-0.5 text-[10px] text-muted-foreground">{totalRemaining < 0 ? 'budget' : totalBudget > 0 ? 'budget used' : 'no budget'}</span></div>
            </div>
            <p className="max-w-40 text-xs leading-relaxed text-muted-foreground sm:hidden">{totalBudget > 0 ? 'Your monthly spending limit, at a glance.' : 'Create a pocket to set your spending budget.'}</p>
          </div>
          <p className="mt-auto text-2xl font-medium tracking-tight tabular-nums sm:text-base md:text-2xl xl:text-xl 2xl:text-2xl"><CompactAmount amount={Math.abs(totalRemaining)} currency={userCurrency} label={totalRemaining < 0 ? 'over budget' : 'remaining budget'} /></p>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{totalRemaining < 0 ? 'Over your spending budget' : totalBudget > 0 ? 'Left in your spending budget' : 'Create a pocket to set a budget'}</p>
        </Card>
        <Card className="flex min-w-0 flex-col rounded-[1.75rem] border-0 bg-sky-100 bg-[radial-gradient(at_0%_100%,hsl(174_75%_77%)_0%,transparent_65%),radial-gradient(at_100%_0%,hsl(202_95%_74%)_0%,transparent_65%)] p-5 text-slate-900 shadow-none sm:p-6">
          <div className="flex items-start justify-between gap-2"><CardTitle className="text-sm font-medium md:text-base">Income</CardTitle><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/35 md:h-10 md:w-10 md:rounded-2xl"><ArrowDownLeft className="h-5 w-5" /></span></div>
          <p className="mt-8 text-2xl font-medium tracking-tight tabular-nums min-[380px]:text-base sm:mt-auto sm:pt-16 md:text-2xl xl:text-xl 2xl:text-2xl"><CompactAmount amount={totalIncome} currency={userCurrency} label="income" /></p>
          <p className="mt-2 text-xs leading-relaxed text-slate-700">Received in {format(parseISO(`${selectedMonth}-01`), "MMMM")}</p>
        </Card>
        <Card className="flex min-w-0 flex-col rounded-[1.75rem] border-0 bg-rose-100 bg-[radial-gradient(at_100%_0%,hsl(12_95%_78%)_0%,transparent_65%),radial-gradient(at_0%_100%,hsl(264_85%_86%)_0%,transparent_70%)] p-5 text-slate-900 shadow-none sm:p-6">
          <div className="flex items-start justify-between gap-2"><CardTitle className="text-sm font-medium md:text-base">Total Spent</CardTitle><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/35 md:h-10 md:w-10 md:rounded-2xl"><ArrowUpRight className="h-5 w-5" /></span></div>
          <p className="mt-8 text-2xl font-medium tracking-tight tabular-nums min-[380px]:text-base sm:mt-auto sm:pt-16 md:text-2xl xl:text-xl 2xl:text-2xl"><CompactAmount amount={totalSpent} currency={userCurrency} label="total spent" /></p>
          <p className="mt-2 text-xs leading-relaxed text-slate-700">{totalBudget > 0 ? `${formatNumber((totalSpent / totalBudget) * 100)}% of budget used` : 'No budget set yet'}</p>
        </Card>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-[1.5rem] bg-muted/80 px-5 py-4 sm:px-6">
        <div className="flex items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-card"><Wallet className="h-5 w-5 text-muted-foreground" /></span><div><h2 className="text-sm font-medium">Total Budget</h2><p className="mt-0.5 text-xs text-muted-foreground">Across {expensePockets.length} expense {expensePockets.length === 1 ? 'pocket' : 'pockets'}</p></div></div>
        <p className="text-xl font-medium tracking-tight tabular-nums"><CompactAmount amount={totalBudget} currency={userCurrency} label="total budget" /></p>
      </div>
      <p className="!mt-3 px-1 text-[11px] text-muted-foreground">Remaining = budget minus expenses · not your bank balance</p>

      {(pocketData?.unassignedCount ?? 0) > 0 && <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-4 text-sm">
        <p>{formatCurrency(pocketData!.unassignedSpent, userCurrency)} in {pocketData!.unassignedCount} unassigned {pocketData!.unassignedCount === 1 ? 'expense' : 'expenses'}. Included in Total Spent and Remaining, but not in individual pocket bars.</p>
        <Button variant="link" className="h-auto p-0 mt-2" onClick={() => navigate(`/transactions?month=${selectedMonth}&pocket=unassigned`)}>Review unassigned expenses</Button>
      </div>}
      {selectedMonth > format(new Date(), 'yyyy-MM') && <p className="text-sm text-muted-foreground">Future plan: base allowances only. Carryover is confirmed when the month begins.</p>}

      <Suspense fallback={<div role="status" aria-label="Loading monthly chart" className="h-96 animate-pulse rounded-[1.75rem] bg-card" />}>
        <SpendingTrend transactions={monthlyTransactions} currency={userCurrency} month={selectedMonth} />
      </Suspense>

      {/* Budget Pockets */}
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-medium tracking-tight">Budget Pockets</h2>
            <p className="mt-1 text-sm text-muted-foreground">Your monthly limits for the things that matter.</p>
            {overBudgetPockets > 0 && <p role="status" className="mt-2 text-sm font-medium text-destructive">{overBudgetPockets} {overBudgetPockets === 1 ? 'pocket is' : 'pockets are'} over budget. Review the amounts below.</p>}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => setShowPlanning(true)}>Plan months</Button>
            <Button onClick={() => setShowCreatePocket(true)} variant="outline" size="sm"><Plus className="h-4 w-4" />Create Pocket</Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label="More budget actions"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setShowTemplateManagement(true)}><Settings className="mr-2 h-4 w-4" />Repeating pockets</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setShowPayment(true)}><CreditCard className="mr-2 h-4 w-4" />Pay Credit Card</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {pockets.length === 0 ? (
          <Card className="border-dashed shadow-none">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <PiggyBank className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No pockets yet</h3>
              <p className="text-sm text-muted-foreground text-center max-w-md">
                Use Create Pocket above to set a monthly limit for groceries, transport, or another expense.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-4">
            {[...pockets].sort((a, b) => Number(b.is_featured) - Number(a.is_featured)).map((pocket) => (
              <PocketCard
                key={pocket.id}
                pocket={pocket}
                currency={userCurrency}
                onClick={() => navigate(`/transactions/${pocket.id}`)}
                onEdit={() => handleEditPocket(pocket)}
                onDelete={handleDeletePocket}
                onToggleFeatured={handleToggleFeatured}
              />
            ))}
          </div>
        )}
      </div>
      <DebtOverviewCard />
      </div>
      <Suspense fallback={<div role="status" aria-label="Loading monthly activity" className="h-96 animate-pulse rounded-[1.75rem] bg-card" />}>
        <DashboardActivity transactions={monthlyTransactions} currency={userCurrency} month={selectedMonth} />
      </Suspense>
      </div>

      {/* Dialogs */}
      <CreditCardPaymentDialog open={showPayment} onOpenChange={setShowPayment} onSuccess={handleTransactionAdded} />
      <CreatePocketDialog
        open={showCreatePocket}
        onOpenChange={setShowCreatePocket}
        onSuccess={handlePocketCreated}
        targetMonth={selectedMonth}
      />
      
      <TransactionDialog
        open={showAddTransaction}
        onOpenChange={setShowAddTransaction}
        onSuccess={handleTransactionAdded}
        initialPocketId={firstTransactionPocket?.id}
        initialDate={firstTransactionPocket?.month_year && firstTransactionPocket.month_year !== format(new Date(), 'yyyy-MM') ? `${firstTransactionPocket.month_year}-01` : format(new Date(), 'yyyy-MM-dd')}
        initialType={firstTransactionPocket?.pocket_type === 'income' ? 'income' : firstTransactionPocket?.pocket_type === 'investment' ? 'investment' : 'expense'}
        pockets={pockets}
      />
      
      <TemplateManagementDialog
        open={showTemplateManagement}
        onOpenChange={setShowTemplateManagement}
        targetMonth={selectedMonth}
        currency={userCurrency}
      />
      <BudgetPlanningDialog open={showPlanning} onOpenChange={setShowPlanning} selectedMonth={selectedMonth} currency={userCurrency} onPlanned={setSelectedMonth} />
      
      <EditPocketDialog
        open={showEditPocket}
        onOpenChange={setShowEditPocket}
        onSuccess={handlePocketUpdated}
        pocket={selectedPocketForEdit}
      />
    </div>
  );
}
