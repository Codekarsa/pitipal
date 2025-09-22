import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, TrendingUp, TrendingDown, DollarSign, PiggyBank } from "lucide-react";
import { PocketCard } from "./PocketCard";
import { CreatePocketDialog } from "./CreatePocketDialog";
import { TransactionDialog } from "./TransactionDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/useAuth";
import { useToast } from "@/hooks/use-toast";

interface BudgetPocket {
  id: string;
  name: string;
  description: string | null;
  budget_amount: number;
  current_amount: number;
  cycle_type: string;
  color: string;
}

export function Dashboard() {
  const [pockets, setPockets] = useState<BudgetPocket[]>([]);
  const [showCreatePocket, setShowCreatePocket] = useState(false);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  // Calculate totals
  const totalBudget = pockets.reduce((sum, pocket) => sum + pocket.budget_amount, 0);
  const totalSpent = pockets.reduce((sum, pocket) => sum + pocket.current_amount, 0);
  const totalRemaining = totalBudget - totalSpent;
  const overBudgetPockets = pockets.filter(p => p.current_amount > p.budget_amount).length;

  useEffect(() => {
    if (user) {
      fetchPockets();
    }
  }, [user]);

  const fetchPockets = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('budget_pockets')
        .select('*')
        .eq('user_id', user?.id)
        .eq('is_active', true)
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

  const handleTransactionAdded = () => {
    setShowAddTransaction(false);
    fetchPockets();
    toast({
      title: "Transaction added!",
      description: "Your transaction has been recorded successfully.",
    });
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
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-card border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalBudget.toFixed(2)}</div>
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
            <div className="text-2xl font-bold">${totalSpent.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {totalBudget > 0 ? `${((totalSpent / totalBudget) * 100).toFixed(1)}% of budget` : 'No budget set'}
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
              ${Math.abs(totalRemaining).toFixed(2)}
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

      {/* Budget Pockets */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Budget Pockets</h2>
            <p className="text-muted-foreground">Organize your spending into customizable categories</p>
          </div>
          <Button onClick={() => setShowCreatePocket(true)} variant="hero">
            <Plus className="mr-2 h-4 w-4" />
            Create Pocket
          </Button>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pockets.map((pocket) => (
              <PocketCard
                key={pocket.id}
                id={pocket.id}
                name={pocket.name}
                description={pocket.description}
                budgetAmount={pocket.budget_amount}
                currentAmount={pocket.current_amount}
                cycleType={pocket.cycle_type}
                color={pocket.color}
                onClick={() => {
                  // TODO: Open pocket details
                }}
                onEdit={() => {
                  // TODO: Open edit dialog
                }}
                onDelete={() => {
                  // TODO: Delete pocket
                }}
              />
            ))}
          </div>
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
    </div>
  );
}