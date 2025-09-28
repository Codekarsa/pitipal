import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { runCreditCardBalanceRecalculation } from "@/utils/recalculateCreditCardBalances";
import { RefreshCw, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface RecalculationResult {
  success: boolean;
  summary?: {
    accountsProcessed: number;
    totalStoredBalance: number;
    totalCalculatedBalance: number;
    totalDifference: number;
    dryRun: boolean;
  };
  details?: Array<{
    accountId: string;
    accountName: string;
    storedBalance: number;
    calculatedBalance: number;
    difference: number;
    transactionCount: number;
    updateStatus?: string;
    updateError?: string;
  }>;
  error?: string;
}

export function CreditCardBalanceDebug() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RecalculationResult | null>(null);

  const { data: userProfile } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('user_profiles')
        .select('currency')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      return data;
    }
  });

  const handleRecalculate = async (dryRun: boolean) => {
    setLoading(true);
    try {
      const result = await runCreditCardBalanceRecalculation(dryRun);
      setResult(result);
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    const currency = userProfile?.currency || 'USD';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Credit Card Balance Recalculation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              This tool recalculates credit card balances based on actual transactions.
              The current discrepancy suggests that stored balances don't match transaction history.
            </AlertDescription>
          </Alert>

          <div className="flex gap-2">
            <Button
              onClick={() => handleRecalculate(true)}
              disabled={loading}
              variant="outline"
            >
              {loading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Info className="h-4 w-4 mr-2" />}
              Dry Run (Preview Only)
            </Button>
            <Button
              onClick={() => handleRecalculate(false)}
              disabled={loading}
              variant="default"
            >
              {loading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Apply Changes
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {result.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-500" />
              )}
              Recalculation Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!result.success ? (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Error: {result.error}
                </AlertDescription>
              </Alert>
            ) : (
              <>
                {result.summary && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <div className="text-lg font-bold">
                        {result.summary.accountsProcessed}
                      </div>
                      <div className="text-xs text-muted-foreground">Accounts</div>
                    </div>
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <div className="text-lg font-bold text-red-600">
                        {formatCurrency(result.summary.totalStoredBalance)}
                      </div>
                      <div className="text-xs text-muted-foreground">Stored Balance</div>
                    </div>
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <div className="text-lg font-bold text-blue-600">
                        {formatCurrency(result.summary.totalCalculatedBalance)}
                      </div>
                      <div className="text-xs text-muted-foreground">Calculated Balance</div>
                    </div>
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <div className={`text-lg font-bold ${result.summary.totalDifference !== 0 ? 'text-orange-600' : 'text-green-600'}`}>
                        {formatCurrency(result.summary.totalDifference)}
                      </div>
                      <div className="text-xs text-muted-foreground">Difference</div>
                    </div>
                  </div>
                )}

                {result.summary?.dryRun && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      This was a dry run - no changes were made to the database.
                    </AlertDescription>
                  </Alert>
                )}

                {result.details && result.details.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-medium">Account Details:</h4>
                    {result.details.map((detail) => (
                      <div
                        key={detail.accountId}
                        className="p-4 border rounded-lg space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <h5 className="font-medium">{detail.accountName}</h5>
                          <Badge variant={Math.abs(detail.difference) > 0.01 ? "destructive" : "secondary"}>
                            {Math.abs(detail.difference) > 0.01 ? "Needs Update" : "Balanced"}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Stored:</span>
                            <div className="font-medium text-red-600">
                              {formatCurrency(detail.storedBalance)}
                            </div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Calculated:</span>
                            <div className="font-medium text-blue-600">
                              {formatCurrency(detail.calculatedBalance)}
                            </div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Difference:</span>
                            <div className={`font-medium ${detail.difference !== 0 ? 'text-orange-600' : 'text-green-600'}`}>
                              {formatCurrency(detail.difference)}
                            </div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Transactions:</span>
                            <div className="font-medium">
                              {detail.transactionCount}
                            </div>
                          </div>
                        </div>

                        {detail.updateStatus && (
                          <div className="text-sm">
                            <Badge variant={
                              detail.updateStatus === 'success' ? 'default' :
                              detail.updateStatus === 'failed' ? 'destructive' : 'secondary'
                            }>
                              {detail.updateStatus === 'success' && 'Updated Successfully'}
                              {detail.updateStatus === 'failed' && 'Update Failed'}
                              {detail.updateStatus === 'skipped' && 'No Update Needed'}
                            </Badge>
                            {detail.updateError && (
                              <p className="text-red-600 mt-1">{detail.updateError}</p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}