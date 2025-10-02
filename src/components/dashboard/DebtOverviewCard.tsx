import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, TrendingDown, AlertTriangle, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { CreditCardPaymentDialog } from "./CreditCardPaymentDialog";
import { calculateCreditCardBalances } from "@/utils/creditCardCalculations";


export function DebtOverviewCard() {
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  
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

  // Fetch credit card balances with dynamic calculation
  const { data: creditCardData, isLoading } = useQuery({
    queryKey: ['credit-card-balances'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      return await calculateCreditCardBalances(user.id);
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchOnWindowFocus: false
  });

  const creditCardAccounts = creditCardData?.accounts || [];

  const formatCurrency = (amount: number) => {
    const currency = profile?.currency || 'USD';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const handlePaymentSuccess = () => {
    // This will trigger a refetch of the credit card data
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

  // Use calculated values from creditCardData
  const totalDebt = creditCardData?.totalDebt || 0;
  const totalMinimumPayments = creditCardAccounts.reduce((sum, account) => sum + account.minimumPayment, 0);
  const totalCreditLimit = creditCardData?.totalCreditLimit || 0;
  const overallUtilization = creditCardData?.averageUtilization || 0;

  // Get accounts due soon (within next 7 days)
  const today = new Date();
  const currentDay = today.getDate();
  const accountsDueSoon = creditCardAccounts.filter(account => {
    if (!account.dueDate) return false;
    const dueDate = parseInt(account.dueDate);
    const daysUntilDue = dueDate >= currentDay
      ? dueDate - currentDay
      : (30 - currentDay) + dueDate;
    return daysUntilDue <= 7 && account.currentBalance > 0;
  });

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Debt Overview
            </CardTitle>
            {totalDebt > 0 && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setShowPaymentDialog(true)}
              >
                <DollarSign className="h-4 w-4 mr-1" />
                Pay
              </Button>
            )}
          </div>
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
                  <span className="font-medium">{account.accountName}</span>
                  <div className="text-right">
                    <div className="font-medium">{formatCurrency(account.minimumPayment)}</div>
                    <div className="text-xs text-muted-foreground">Due {account.dueDate}th</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Top Debt Account */}
          {totalDebt > 0 && creditCardAccounts.length > 0 && (
            <div className="space-y-2">
              <span className="text-sm font-medium">Highest Balance</span>
              <div className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded">
                <span className="font-medium">{creditCardAccounts[0].accountName}</span>
                <div className="text-right">
                  <div className="font-medium text-destructive">
                    {formatCurrency(creditCardAccounts[0].currentBalance)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {((creditCardAccounts[0].currentBalance / creditCardAccounts[0].creditLimit) * 100).toFixed(1)}% utilized
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <CreditCardPaymentDialog
        open={showPaymentDialog}
        onOpenChange={setShowPaymentDialog}
        onSuccess={handlePaymentSuccess}
      />
    </>
  );
}