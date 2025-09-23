import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2, Plus, Edit2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/useAuth";
import { AddInvestmentAccountDialog } from "./AddInvestmentAccountDialog";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

type InvestmentAccount = {
  id: string;
  account_name: string;
  institution_name: string;
  account_type: string;
  total_value: number;
  is_active: boolean;
  notes?: string;
};

export function InvestmentAccountsSection() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<InvestmentAccount | null>(null);

  const { data: userProfile } = useQuery({
    queryKey: ["user-profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from("profiles")
        .select("currency")
        .eq("user_id", user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ["investment-accounts", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await (supabase as any)
        .from("investment_accounts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as InvestmentAccount[];
    },
    enabled: !!user?.id,
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async (accountId: string) => {
      const { error } = await (supabase as any)
        .from("investment_accounts")
        .delete()
        .eq("id", accountId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["investment-accounts"] });
      toast.success("Investment account deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete investment account");
    },
  });

  const handleEdit = (account: InvestmentAccount) => {
    setEditingAccount(account);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingAccount(null);
  };

  const userCurrency = userProfile?.currency || 'USD';

  const getAccountTypeLabel = (type: string) => {
    switch (type) {
      case 'brokerage': return 'Brokerage';
      case '401k': return '401(k)';
      case 'traditional_ira': return 'Traditional IRA';
      case 'roth_ira': return 'Roth IRA';
      case 'sep_ira': return 'SEP IRA';
      case 'simple_ira': return 'SIMPLE IRA';
      case 'crypto_exchange': return 'Crypto Exchange';
      case 'pension': return 'Pension';
      default: return type;
    }
  };

  const totalValue = accounts.reduce((sum, account) => sum + (account.total_value || 0), 0);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Investment Accounts
          </CardTitle>
          <CardDescription>
            Manage your brokerage accounts, 401k, IRA, and other investment accounts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="font-semibold">Total Portfolio Value</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(totalValue, userCurrency)}</p>
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
              <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="font-medium">No investment accounts yet</p>
              <p className="text-sm">Add your first account to start tracking your investments</p>
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
                    <p className="text-lg font-semibold text-primary">{formatCurrency(account.total_value || 0, userCurrency)}</p>
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
            Add Investment Account
          </Button>
        </CardContent>
      </Card>

      <AddInvestmentAccountDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        editingAccount={editingAccount}
      />
    </>
  );
}