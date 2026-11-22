import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/useAuth";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, Wallet, ArrowUpRight, PiggyBank } from "lucide-react";
import { CompactAmount } from "@/components/ui/compact-amount";
import { PocketCard } from "@/components/dashboard/PocketCard";
import { CreatePocketDialog } from "@/components/dashboard/CreatePocketDialog";
import { BudgetPlanningDialog } from "@/components/dashboard/BudgetPlanningDialog";
import { EditPocketDialog } from "@/components/dashboard/EditPocketDialog";
import { MonthNavigator } from "@/components/dashboard/MonthNavigator";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { calculatePocketSpending, PocketSpending } from "@/utils/pocketCalculations";
import { analytics } from "@/lib/analytics";

interface BudgetPocket {
  id: string;
  name: string;
  description: string | null;
  budget_amount: number;
  budget_type: string;
  pocket_type: string;
  color: string;
  is_template: boolean;
  auto_renew: boolean;
  cycle_type: string;
  is_featured: boolean;
  month_year: string | null;
  parent_pocket_id: string | null;
  base_budget_amount?: number;
  carried_over_amount?: number;
  recurring_rule?: unknown;
}

export function PocketsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showPlanning, setShowPlanning] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedPocket, setSelectedPocket] = useState<BudgetPocket | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));

  useEffect(() => {
    if (searchParams.get('create') !== '1') return;
    setShowCreateDialog(true);
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

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

  const { data: pocketData, isLoading } = useQuery({
    queryKey: ["pocketSpending", user?.id, selectedMonth],
    queryFn: async () => {
      if (!user?.id) return { pockets: [], totalBudget: 0, totalSpent: 0, totalRemaining: 0, totalIncome: 0 };
      const result = await calculatePocketSpending(user.id, selectedMonth);
      console.log('Pockets data from query:', result.pockets);
      console.log('Pocket IDs:', result.pockets.map(p => ({ id: p.id, name: p.name })));
      return result;
    },
    enabled: !!user?.id,
  });

  const pockets = pocketData?.pockets || [];
  console.log('Pockets after extraction:', pockets.length, pockets.map(p => p.id));

  const handleDeletePocket = async (pocketId: string) => {
    try {
      const { error } = await supabase
        .from("budget_pockets")
        .update({ is_active: false })
        .eq("id", pocketId)
        .eq("user_id", user?.id);

      if (error) throw error;

      analytics.trackPocketDeleted();
      queryClient.invalidateQueries({ queryKey: ["pocketSpending", user?.id, selectedMonth] });
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

  const handleToggleFeatured = async (pocketId: string) => {
    try {
      const currentPocket = pockets?.find(p => p.id === pocketId);
      if (!currentPocket) return;

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

      queryClient.invalidateQueries({ queryKey: ["pocketSpending", user?.id, selectedMonth] });
      toast({
        title: targetData.is_featured ? "Pocket unfeatured" : "Pocket featured",
        description: `"${currentPocket.name}" has been ${targetData.is_featured ? 'removed from' : 'added to'} featured pockets.`,
      });
    } catch (error) {
      console.error("Error toggling featured status:", error);
      toast({
        title: "Error",
        description: "Failed to update pocket status. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEditPocket = async (pocket: PocketSpending) => {
    try {
      // Fetch the full pocket data to get parent_pocket_id and month_year
      const { data: pocketData, error: fetchError } = await supabase
        .from("budget_pockets")
        .select("*")
        .eq("id", pocket.id)
        .single();

      if (fetchError) throw fetchError;

      setSelectedPocket(pocketData);
      setShowEditDialog(true);
    } catch (error) {
      console.error("Error loading pocket for edit:", error);
      toast({
        title: "Error",
        description: "Failed to load pocket data.",
        variant: "destructive",
      });
    }
  };

  const handleEditSuccess = () => {
    setShowEditDialog(false);
    setSelectedPocket(null);
    queryClient.invalidateQueries({ queryKey: ["pocketSpending", user?.id, selectedMonth] });
  };

  if (isLoading) {
    return (
      <div className="space-y-7" role="status" aria-label="Loading pockets">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-medium tracking-tight">
              My Pockets
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">A place for every part of your month.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-card animate-pulse rounded-[1.75rem]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-medium tracking-tight">
            My Pockets
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">A place for every part of your month.</p>
        </div>
        <MonthNavigator
          selectedMonth={selectedMonth}
          onMonthChange={setSelectedMonth}
          className="rounded-full border-0 px-2"
        />
      </div>

      {pockets.length > 0 && <>
        <div className="grid gap-4 min-[380px]:grid-cols-2 md:grid-cols-3">
          {[
            { label: 'Spending budget', amount: pocketData?.totalBudget ?? 0, icon: Wallet, description: 'Your expense-pocket allowances', surface: 'bg-sky-100 bg-[radial-gradient(at_0%_100%,hsl(174_75%_77%)_0%,transparent_65%),radial-gradient(at_100%_0%,hsl(202_95%_74%)_0%,transparent_65%)] text-slate-900' },
            { label: 'Total Spent', amount: pocketData?.totalSpent ?? 0, icon: ArrowUpRight, description: 'All expenses, including unassigned', surface: 'bg-rose-100 bg-[radial-gradient(at_100%_0%,hsl(12_95%_78%)_0%,transparent_65%),radial-gradient(at_0%_100%,hsl(264_85%_86%)_0%,transparent_70%)] text-slate-900' },
            { label: (pocketData?.totalRemaining ?? 0) < 0 ? 'Over budget' : 'Remaining', amount: Math.abs(pocketData?.totalRemaining ?? 0), icon: PiggyBank, description: (pocketData?.totalRemaining ?? 0) < 0 ? 'Over your spending budget' : 'Budget minus all monthly expenses', surface: 'bg-card' },
          ].map(({ label, amount, icon: Icon, description, surface }) => (
            <section key={label} aria-label={label} className={`min-w-0 rounded-[1.75rem] p-5 sm:p-6 ${label === 'Remaining' || label === 'Over budget' ? 'min-[380px]:col-span-2 md:col-span-1' : ''} ${surface}`}>
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-medium">{label}</h2>
                <span className="hidden rounded-2xl bg-white/40 p-2.5 md:inline-flex"><Icon className="h-5 w-5" /></span>
              </div>
              <p className={`mt-3 text-xl font-medium tracking-tight tabular-nums min-[380px]:text-base sm:text-xl md:mt-7 xl:text-2xl ${label === 'Over budget' ? 'text-destructive' : ''}`}><CompactAmount amount={amount} currency={userCurrency} label={label} /></p>
              <p className="mt-2 text-xs leading-relaxed opacity-75">{description}</p>
            </section>
          ))}
        </div>
        <p className="!mt-3 px-1 text-xs text-muted-foreground">Spending budget excludes income and investment pockets · Remaining is not your bank balance.</p>
      </>}

      <section aria-label="Monthly pockets" className="space-y-5">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-medium tracking-tight">Your monthly pockets <span className="ml-1 text-sm text-muted-foreground">{pockets.length}</span></h2>
            <p className="mt-1 text-xs text-muted-foreground">Set a limit. See what’s left. Adjust as you go.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" className="rounded-full bg-card px-4" onClick={() => setShowPlanning(true)}>Plan months</Button>
          <Button className="rounded-full px-4" onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Pocket
          </Button>
          </div>
        </div>

      {selectedMonth > format(new Date(), 'yyyy-MM') && <p className="rounded-2xl bg-accent/50 px-5 py-4 text-sm text-muted-foreground">Future plan: base allowances only. Carryover is confirmed when the month begins.</p>}

      {pockets && pockets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {pockets
            // Remove duplicates by pocket ID
            .filter((pocket, index, self) =>
              index === self.findIndex((p) => p.id === pocket.id)
            )
            .sort((a, b) => {
              // Sort featured pockets first
              if (a.is_featured && !b.is_featured) return -1;
              if (!a.is_featured && b.is_featured) return 1;
              return 0;
            })
            .map((pocket) => (
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
      ) : (
        <div className="rounded-[1.75rem] bg-card text-center px-5 py-14">
          <div className="w-14 h-14 bg-accent/70 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Wallet className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-xl font-medium mb-2">No pockets yet</h3>
          <p className="mx-auto max-w-sm text-sm leading-relaxed text-muted-foreground mb-6">
            A pocket is a monthly limit for groceries, transport, or anything you want to plan for.
          </p>
          <Button className="rounded-full px-5" onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Your First Pocket
          </Button>
        </div>
      )}
      </section>

      <CreatePocketDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        targetMonth={selectedMonth}
        onSuccess={() => {
          setShowCreateDialog(false);
          queryClient.invalidateQueries({ queryKey: ["pocketSpending", user?.id, selectedMonth] });
        }}
      />

      <BudgetPlanningDialog open={showPlanning} onOpenChange={setShowPlanning} selectedMonth={selectedMonth} currency={userCurrency} onPlanned={setSelectedMonth} />

      <EditPocketDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onSuccess={handleEditSuccess}
        pocket={selectedPocket}
      />
    </div>
  );
}
