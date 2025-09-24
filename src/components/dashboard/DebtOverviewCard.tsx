import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, TrendingDown, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

interface CreditCardAccount {
  id: string;
  account_name: string;
  institution_name: string;
  current_balance: number;
  minimum_payment: number;
  credit_limit: number;
  due_date: number;
}

export function DebtOverviewCard() {
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
        .eq('is_active', true)
        .order('current_balance', { ascending: false });

      if (error) throw error;
      return data as CreditCardAccount[];
    },
  });

  const formatCurrency = (amount: number) => {
    const currency = profile?.currency || 'USD';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Debt Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Loading debt information...</div>
        </CardContent>
      </Card>
    );
  }

  if (!creditCardAccounts || creditCardAccounts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Debt Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <CreditCard className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground text-sm">No credit cards added yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalDebt = creditCardAccounts.reduce((sum, account) => sum + account.current_balance, 0);
  const totalMinimumPayments = creditCardAccounts.reduce((sum, account) => sum + account.minimum_payment, 0);
  const totalCreditLimit = creditCardAccounts.reduce((sum, account) => sum + account.credit_limit, 0);
  const overallUtilization = totalCreditLimit > 0 ? (totalDebt / totalCreditLimit) * 100 : 0;

  // Get accounts due soon (within next 7 days)
  const today = new Date();
  const currentDay = today.getDate();
  const accountsDueSoon = creditCardAccounts.filter(account => {
    const daysUntilDue = account.due_date >= currentDay 
      ? account.due_date - currentDay 
      : (30 - currentDay) + account.due_date;
    return daysUntilDue <= 7 && account.current_balance > 0;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Debt Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-lg font-bold text-destructive">
              {formatCurrency(totalDebt)}
            </div>
            <div className="text-xs text-muted-foreground">Total Debt</div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-lg font-bold">
              {formatCurrency(totalMinimumPayments)}
            </div>
            <div className="text-xs text-muted-foreground">Min Payments</div>
          </div>
        </div>

        {/* Credit Utilization */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Credit Utilization</span>
          <div className="flex items-center gap-2">
            <Badge variant={overallUtilization >= 70 ? "destructive" : overallUtilization >= 50 ? "default" : "secondary"}>
              {overallUtilization.toFixed(1)}%
            </Badge>
            {overallUtilization >= 70 && <AlertTriangle className="h-4 w-4 text-destructive" />}
          </div>
        </div>

        {/* Payments Due Soon */}
        {accountsDueSoon.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span className="text-sm font-medium">Due Soon</span>
            </div>
            {accountsDueSoon.slice(0, 2).map(account => (
              <div key={account.id} className="flex items-center justify-between text-sm p-2 bg-destructive/10 rounded">
                <span className="font-medium">{account.account_name}</span>
                <div className="text-right">
                  <div className="font-medium">{formatCurrency(account.minimum_payment)}</div>
                  <div className="text-xs text-muted-foreground">Due {account.due_date}th</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Top Debt Account */}
        {totalDebt > 0 && (
          <div className="space-y-2">
            <span className="text-sm font-medium">Highest Balance</span>
            <div className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded">
              <span className="font-medium">{creditCardAccounts[0].account_name}</span>
              <div className="text-right">
                <div className="font-medium text-destructive">
                  {formatCurrency(creditCardAccounts[0].current_balance)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {((creditCardAccounts[0].current_balance / creditCardAccounts[0].credit_limit) * 100).toFixed(1)}% utilized
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}