import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Banknote, Plus, Edit2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/useAuth";
import { AddSavingsAccountDialog } from "./AddSavingsAccountDialog";
import { toast } from "sonner";

type SavingsAccount = {
  id: string;
  account_name: string;
  institution_name: string;
  account_type: string;
  current_balance: number;
  interest_rate: number;
  is_active: boolean;
  notes?: string;
};

export function SavingsAccountsSection() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<SavingsAccount | null>(null);

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ["savings-accounts", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from("savings_accounts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as SavingsAccount[];
    },
    enabled: !!user?.id,
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async (accountId: string) => {
      const { error } = await supabase
        .from("savings_accounts")
        .delete()
        .eq("id", accountId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savings-accounts"] });
      toast.success("Savings account deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete savings account");
    },
  });

  const handleEdit = (account: SavingsAccount) => {
    setEditingAccount(account);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingAccount(null);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getAccountTypeLabel = (type: string) => {
    switch (type) {
      case 'checking': return 'Checking';
      case 'savings': return 'Savings';
      case 'cd': return 'CD';
      case 'money_market': return 'Money Market';
      case 'high_yield_savings': return 'High Yield Savings';
      default: return type;
    }
  };

  const totalBalance = accounts.reduce((sum, account) => sum + (account.current_balance || 0), 0);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5" />
            Savings Accounts
          </CardTitle>
          <CardDescription>
            Manage your checking, savings, CDs, and money market accounts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="font-semibold">Total Balance</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(totalBalance)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">{accounts.length} accounts</p>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading accounts...</p>
            </div>
          ) : accounts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Banknote className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="font-medium">No savings accounts yet</p>
              <p className="text-sm">Add your first account to start tracking your savings</p>
            </div>
          ) : (
            <div className="space-y-3">
              {accounts.map((account) => (
                <div key={account.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{account.account_name}</h4>
                      <Badge variant="outline">{getAccountTypeLabel(account.account_type)}</Badge>
                      {!account.is_active && <Badge variant="secondary">Inactive</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">{account.institution_name}</p>
                    <p className="text-lg font-semibold text-primary">{formatCurrency(account.current_balance || 0)}</p>
                    {account.interest_rate && account.interest_rate > 0 && (
                      <p className="text-sm text-muted-foreground">APY: {account.interest_rate}%</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(account)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteAccountMutation.mutate(account.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Button onClick={() => setDialogOpen(true)} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Savings Account
          </Button>
        </CardContent>
      </Card>

      <AddSavingsAccountDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        editingAccount={editingAccount}
      />
    </>
  );
}