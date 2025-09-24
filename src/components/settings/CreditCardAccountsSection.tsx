import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, CreditCard, Edit, Trash2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AddCreditCardAccountDialog } from "./AddCreditCardAccountDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface CreditCardAccount {
  id: string;
  account_name: string;
  institution_name: string;
  card_type: string;
  credit_limit: number;
  current_balance: number;
  minimum_payment: number;
  apr: number;
  due_date: number;
  account_number?: string;
  notes?: string;
  is_active: boolean;
}

export function CreditCardAccountsSection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<CreditCardAccount | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<CreditCardAccount | null>(null);

  // Fetch user's currency preference
  const { data: profile } = useQuery({
    queryKey: ['user-profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");
      
      const { data, error } = await supabase
        .from('profiles')
        .select('currency')
        .eq('user_id', user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  const { data: creditCardAccounts, isLoading } = useQuery({
    queryKey: ['credit-card-accounts'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from('credit_card_accounts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as CreditCardAccount[];
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async (accountId: string) => {
      const { error } = await supabase
        .from('credit_card_accounts')
        .delete()
        .eq('id', accountId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-card-accounts'] });
      toast({
        title: "Credit card deleted",
        description: "The credit card account has been removed successfully.",
      });
      setDeleteDialogOpen(false);
      setAccountToDelete(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete credit card account: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleEdit = (account: CreditCardAccount) => {
    setEditingAccount(account);
    setDialogOpen(true);
  };

  const handleDelete = (account: CreditCardAccount) => {
    setAccountToDelete(account);
    setDeleteDialogOpen(true);
  };

  const handleAddNew = () => {
    setEditingAccount(undefined);
    setDialogOpen(true);
  };

  const formatCurrency = (amount: number) => {
    const currency = profile?.currency || 'USD';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const getCardTypeLabel = (type: string) => {
    switch (type) {
      case 'credit_card': return 'Credit Card';
      case 'store_card': return 'Store Card';
      case 'line_of_credit': return 'Line of Credit';
      default: return type;
    }
  };

  const getUtilizationColor = (utilization: number) => {
    if (utilization >= 90) return 'destructive';
    if (utilization >= 70) return 'destructive';
    if (utilization >= 50) return 'default';
    return 'secondary';
  };

  const totalDebt = creditCardAccounts?.reduce((sum, account) => sum + account.current_balance, 0) || 0;
  const totalCreditLimit = creditCardAccounts?.reduce((sum, account) => sum + account.credit_limit, 0) || 0;
  const overallUtilization = totalCreditLimit > 0 ? (totalDebt / totalCreditLimit) * 100 : 0;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Credit Cards & Debt
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Loading credit card accounts...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Credit Cards & Debt
            </CardTitle>
            <Button onClick={handleAddNew} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Credit Card
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Debt Overview */}
          {creditCardAccounts && creditCardAccounts.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-destructive">
                  {formatCurrency(totalDebt)}
                </div>
                <div className="text-sm text-muted-foreground">Total Debt</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {formatCurrency(totalCreditLimit)}
                </div>
                <div className="text-sm text-muted-foreground">Total Credit Limit</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {overallUtilization.toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">Credit Utilization</div>
              </div>
            </div>
          )}

          {/* Credit Card Accounts List */}
          {!creditCardAccounts || creditCardAccounts.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No credit cards added</h3>
              <p className="text-muted-foreground mb-4">
                Add your credit cards to track debt and manage payments.
              </p>
              <Button onClick={handleAddNew}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Credit Card
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {creditCardAccounts.map((account) => {
                const utilization = account.credit_limit > 0 
                  ? (account.current_balance / account.credit_limit) * 100 
                  : 0;
                
                return (
                  <Card key={account.id} className="relative">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-medium">{account.account_name}</h3>
                            <Badge variant="outline">
                              {getCardTypeLabel(account.card_type)}
                            </Badge>
                            {!account.is_active && (
                              <Badge variant="secondary">Inactive</Badge>
                            )}
                          </div>
                          
                          <div className="text-sm text-muted-foreground mb-3">
                            {account.institution_name}
                            {account.account_number && ` • ****${account.account_number.slice(-4)}`}
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <div className="font-medium text-destructive">
                                {formatCurrency(account.current_balance)}
                              </div>
                              <div className="text-muted-foreground">Current Balance</div>
                            </div>
                            <div>
                              <div className="font-medium">
                                {formatCurrency(account.credit_limit)}
                              </div>
                              <div className="text-muted-foreground">Credit Limit</div>
                            </div>
                            <div>
                              <div className="font-medium">
                                {formatCurrency(account.minimum_payment)}
                              </div>
                              <div className="text-muted-foreground">Min Payment</div>
                            </div>
                            <div>
                              <div className="font-medium">{account.apr}%</div>
                              <div className="text-muted-foreground">APR</div>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 mt-3">
                            <div className="flex items-center gap-2">
                              <Badge variant={getUtilizationColor(utilization)}>
                                {utilization.toFixed(1)}% utilized
                              </Badge>
                              {utilization >= 70 && (
                                <AlertTriangle className="h-4 w-4 text-destructive" />
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Due: {account.due_date}th of each month
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 ml-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(account)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(account)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <AddCreditCardAccountDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingAccount={editingAccount}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Credit Card Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{accountToDelete?.account_name}"? 
              This action cannot be undone and will remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => accountToDelete && deleteAccountMutation.mutate(accountToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}