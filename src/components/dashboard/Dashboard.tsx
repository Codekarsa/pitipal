import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, TrendingUp, TrendingDown, DollarSign, PiggyBank, Settings } from "lucide-react";
import { PocketCard } from "./PocketCard";
import { CreatePocketDialog } from "./CreatePocketDialog";
import { TransactionDialog } from "./TransactionDialog";
import { DebtOverviewCard } from "./DebtOverviewCard";
import { QuickActionsCard } from "./QuickActionsCard";
import { MonthNavigator } from "./MonthNavigator";
import { TemplateManagementDialog } from "./TemplateManagementDialog";
import { EditPocketDialog } from "./EditPocketDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { format } from "date-fns";
import { calculatePocketSpending, PocketSpending } from "@/utils/pocketCalculations";

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
}

export function Dashboard() {
  const [pockets, setPockets] = useState<PocketSpending[]>([]);
  const [showCreatePocket, setShowCreatePocket] = useState(false);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [showTemplateManagement, setShowTemplateManagement] = useState(false);
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
      if (!user?.id) return { pockets: [], totalBudget: 0, totalSpent: 0, totalRemaining: 0 };
      return await calculatePocketSpending(user.id, selectedMonth);
    },
    enabled: !!user?.id,
  });

  // Update pockets when data changes
  useEffect(() => {
    if (pocketData?.pockets) {
      setPockets(pocketData.pockets);
    }
  }, [pocketData]);

  // Calculate totals from pocketData or fallback to calculating from pockets
  const totalBudget = pocketData?.totalBudget ?? 0;
  const totalSpent = pocketData?.totalSpent ?? 0;
  const totalRemaining = pocketData?.totalRemaining ?? 0;
  const overBudgetPockets = pockets.filter(p => p.currentAmount > p.budgetAmount).length;

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

  const handleEditPocket = (pocket: PocketSpending) => {
    // Convert PocketSpending to BudgetPocket format
    const budgetPocket: BudgetPocket = {
      id: pocket.id,
      name: pocket.name,
      description: null,
      budget_amount: pocket.budgetAmount,
      cycle_type: pocket.cycle_type,
      color: pocket.color,
      is_featured: pocket.is_featured,
      pocket_type: pocket.pocket_type,
      budget_type: pocket.budget_type,
      is_template: false,
      month_year: selectedMonth,
      parent_pocket_id: null,
      auto_renew: true,
      recurring_rule: null,
    };
    setSelectedPocketForEdit(budgetPocket);
    setShowEditPocket(true);
  };

  const handlePocketUpdated = () => {
    setShowEditPocket(false);
    setSelectedPocketForEdit(null);
    queryClient.invalidateQueries({ queryKey: ['pocketSpending', user?.id, selectedMonth] });
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
      // Fetch the pocket from database to get current is_featured state
      const { data: pocketData, error: fetchError } = await supabase
        .from("budget_pockets")
        .select("is_featured")
        .eq("id", pocketId)
        .single();

      if (fetchError) throw fetchError;

      const { error } = await supabase
        .from("budget_pockets")
        .update({ is_featured: !pocketData.is_featured })
        .eq("id", pocketId)
        .eq("user_id", user?.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['pocketSpending', user?.id, selectedMonth] });

      toast({
        title: pocketData.is_featured ? "Pocket unfeatured" : "Pocket featured",
        description: pocketData.is_featured
          ? "Pocket removed from dashboard"
          : "Pocket will now appear on dashboard",
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

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="bg-gradient-card border-0 shadow-lg animate-pulse">
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
    <div className="space-y-8">
      {/* Month Filter */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your financial activity</p>
        </div>
        <MonthNavigator
          selectedMonth={selectedMonth}
          onMonthChange={setSelectedMonth}
        />
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-card border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalBudget, userCurrency)}</div>
            <p className="text-xs text-muted-foreground">
              Across {pockets.length} pockets
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalSpent, userCurrency)}</div>
            <p className="text-xs text-muted-foreground">
              {totalBudget > 0 ? `${formatNumber((totalSpent / totalBudget) * 100)}% of budget` : 'No budget set'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Remaining</CardTitle>
            <PiggyBank className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalRemaining < 0 ? 'text-destructive' : 'text-success'}`}>
              {formatCurrency(Math.abs(totalRemaining), userCurrency)}
            </div>
            <p className="text-xs text-muted-foreground">
              {totalRemaining < 0 ? 'Over budget' : 'Available to spend'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alerts</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overBudgetPockets}</div>
            <p className="text-xs text-muted-foreground">
              Pockets over budget
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Debt Overview */}
      <DebtOverviewCard />

      {/* Budget Pockets */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Budget Pockets</h2>
            <p className="text-muted-foreground">Organize your spending into customizable categories</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button 
              variant="outline" 
              onClick={() => setShowTemplateManagement(true)}
              className="gap-2 text-xs sm:text-sm"
              size="sm"
            >
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Templates</span>
            </Button>
            <Button onClick={() => setShowCreatePocket(true)} variant="hero" size="sm" className="text-xs sm:text-sm">
              <Plus className="mr-1 sm:mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Create Pocket</span>
              <span className="sm:hidden">Create</span>
            </Button>
          </div>
        </div>

        {pockets.length === 0 ? (
          <Card className="bg-gradient-card border-0 shadow-lg">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <PiggyBank className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No pockets yet</h3>
              <p className="text-muted-foreground text-center mb-6 max-w-md">
                Create your first budget pocket to start organizing your finances. 
                Each pocket can track a specific category like groceries, entertainment, or savings.
              </p>
              <Button onClick={() => setShowCreatePocket(true)} variant="hero">
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Pocket
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Featured Pockets */}
            {pockets.filter(pocket => pocket.is_featured).length > 0 ? (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Featured Pockets</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {pockets.filter(pocket => pocket.is_featured).map((pocket) => (
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
                   <QuickActionsCard
                    pockets={pockets}
                    onTransactionAdded={handleTransactionAdded}
                    onPocketCreated={handlePocketCreated}
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <QuickActionsCard
                  pockets={pockets}
                  onTransactionAdded={handleTransactionAdded}
                  onPocketCreated={handlePocketCreated}
                />
              </div>
            )}

          </>
        )}
      </div>

      {/* Dialogs */}
      <CreatePocketDialog
        open={showCreatePocket}
        onOpenChange={setShowCreatePocket}
        onSuccess={handlePocketCreated}
      />
      
      <TransactionDialog
        open={showAddTransaction}
        onOpenChange={setShowAddTransaction}
        onSuccess={handleTransactionAdded}
        pockets={pockets}
      />
      
      <TemplateManagementDialog
        open={showTemplateManagement}
        onOpenChange={setShowTemplateManagement}
      />
      
      <EditPocketDialog
        open={showEditPocket}
        onOpenChange={setShowEditPocket}
        onSuccess={handlePocketUpdated}
        pocket={selectedPocketForEdit}
      />
    </div>
  );
}