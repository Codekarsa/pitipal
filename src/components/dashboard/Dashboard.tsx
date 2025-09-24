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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { format } from "date-fns";

interface BudgetPocket {
  id: string;
  name: string;
  description: string | null;
  budget_amount: number;
  current_amount: number;
  cycle_type: string;
  color: string;
  is_featured: boolean;
  pocket_type: string;
  budget_type: string;
  is_template: boolean;
  month_year: string | null;
  parent_pocket_id: string | null;
  auto_renew: boolean;
  recurring_rule: any;
}

export function Dashboard() {
  const [pockets, setPockets] = useState<BudgetPocket[]>([]);
  const [showCreatePocket, setShowCreatePocket] = useState(false);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [showTemplateManagement, setShowTemplateManagement] = useState(false);
  const [loading, setLoading] = useState(true);
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

  // Calculate totals
  const totalBudget = pockets.reduce((sum, pocket) => sum + pocket.budget_amount, 0);
  const totalSpent = pockets.reduce((sum, pocket) => sum + pocket.current_amount, 0);
  const totalRemaining = totalBudget - totalSpent;
  const overBudgetPockets = pockets.filter(p => p.current_amount > p.budget_amount).length;

  useEffect(() => {
    if (user) {
      fetchPockets();
    }
  }, [user, selectedMonth]);

  const fetchPockets = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('budget_pockets')
        .select('*')
        .eq('user_id', user?.id)
        .eq('is_active', true)
        .eq('is_template', false)
        .eq('month_year', selectedMonth)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPockets(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading pockets",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePocketCreated = () => {
    setShowCreatePocket(false);
    fetchPockets();
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
      fetchPockets();
      
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
    fetchPockets();
    toast({
      title: "Transaction added!",
      description: "Your transaction has been recorded successfully.",
    });
  };

  const handleToggleFeatured = async (pocketId: string) => {
    try {
      const pocket = pockets.find(p => p.id === pocketId);
      if (!pocket) return;

      const { error } = await supabase
        .from("budget_pockets")
        .update({ is_featured: !pocket.is_featured })
        .eq("id", pocketId)
        .eq("user_id", user?.id);

      if (error) throw error;

      fetchPockets();
      
      toast({
        title: pocket.is_featured ? "Pocket unfeatured" : "Pocket featured",
        description: pocket.is_featured 
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

  if (loading) {
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
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowTemplateManagement(true)}
              className="gap-2"
            >
              <Settings className="h-4 w-4" />
              Templates
            </Button>
            <Button onClick={() => setShowCreatePocket(true)} variant="hero">
              <Plus className="mr-2 h-4 w-4" />
              Create Pocket
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
                        onEdit={() => {
                          // TODO: Open edit dialog
                        }}
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
    </div>
  );
}