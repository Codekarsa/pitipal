import { useQuery } from "@tanstack/react-query";
import { TrendingUp, Wallet } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/useAuth";
import { formatCurrency, formatNumber } from "@/lib/utils";

interface Holding {
  id: string;
  quantity: number;
  average_cost: number;
  current_value: number;
  assets: {
    symbol: string;
    name: string;
    asset_type: string;
    currency: string;
  };
  investment_accounts: {
    account_name: string;
    institution_name: string;
  };
}

export function HoldingsSection() {
  const { user } = useAuth();

  // Fetch user's currency preference
  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('currency')
        .eq('user_id', user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  // Fetch holdings
  const { data: holdings = [], isLoading } = useQuery({
    queryKey: ['holdings', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('holdings')
        .select(`
          *,
          assets (
            symbol,
            name,
            asset_type,
            currency
          ),
          investment_accounts (
            account_name,
            institution_name
          )
        `)
        .eq('user_id', user.id)
        .gt('quantity', 0)
        .order('current_value', { ascending: false });
      
      if (error) throw error;
      return data as Holding[];
    },
    enabled: !!user?.id
  });

  const currency = profile?.currency || 'USD';
  const totalPortfolioValue = holdings.reduce((sum, holding) => sum + (holding.current_value || (holding.quantity * holding.average_cost)), 0);

  const getAssetTypeLabel = (type: string) => {
    const typeLabels: Record<string, string> = {
      stock: "Stock",
      etf: "ETF",
      crypto: "Crypto",
      mutual_fund: "Mutual Fund",
      bond: "Bond",
      commodity: "Commodity",
      other: "Other"
    };
    return typeLabels[type] || type;
  };

  const getAssetTypeColor = (type: string) => {
    const typeColors: Record<string, string> = {
      stock: "bg-blue-500",
      etf: "bg-green-500",
      crypto: "bg-orange-500",
      mutual_fund: "bg-purple-500",
      bond: "bg-gray-500",
      commodity: "bg-yellow-500",
      other: "bg-gray-400"
    };
    return typeColors[type] || "bg-gray-400";
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Portfolio Holdings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Loading holdings...</div>
        </CardContent>
      </Card>
    );
  }

  if (holdings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Portfolio Holdings
          </CardTitle>
          <CardDescription>
            Your investment holdings and positions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Holdings Yet</h3>
            <p className="text-muted-foreground mb-4">
              Start investing to see your portfolio here.
            </p>
            <p className="text-sm text-muted-foreground">
              Create investment transactions to automatically track your holdings.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Portfolio Holdings
        </CardTitle>
        <CardDescription>
          Your investment positions and current values
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-4 bg-gradient-subtle rounded-lg">
          <div className="text-sm text-muted-foreground mb-1">Total Portfolio Value</div>
          <div className="text-2xl font-bold">
            {formatCurrency(totalPortfolioValue, currency)}
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="font-medium">Holdings by Account</h4>
          
          {Object.entries(
            holdings.reduce((accounts, holding) => {
              const accountKey = `${holding.investment_accounts.account_name} - ${holding.investment_accounts.institution_name}`;
              if (!accounts[accountKey]) {
                accounts[accountKey] = [];
              }
              accounts[accountKey].push(holding);
              return accounts;
            }, {} as Record<string, Holding[]>)
          ).map(([accountName, accountHoldings]) => (
            <div key={accountName} className="space-y-2">
              <h5 className="text-sm font-medium text-muted-foreground">{accountName}</h5>
              <div className="space-y-2">
                {accountHoldings.map((holding) => {
                  const currentValue = holding.current_value || (holding.quantity * holding.average_cost);
                  const totalCost = holding.quantity * holding.average_cost;
                  const gainLoss = currentValue - totalCost;
                  const gainLossPercent = totalCost > 0 ? (gainLoss / totalCost) * 100 : 0;
                  
                  return (
                    <div
                      key={holding.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className={`w-3 h-3 rounded-full ${getAssetTypeColor(holding.assets.asset_type)}`}
                        />
                        <div>
                          <h6 className="font-medium">{holding.assets.symbol}</h6>
                          <p className="text-sm text-muted-foreground">{holding.assets.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatNumber(holding.quantity, 5)} shares @ {formatCurrency(holding.average_cost, holding.assets.currency)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="font-medium">
                          {formatCurrency(currentValue, currency)}
                        </div>
                        {gainLoss !== 0 && (
                          <div className={`text-sm ${gainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {gainLoss >= 0 ? '+' : ''}{formatCurrency(gainLoss, currency)}
                            {' '}({gainLoss >= 0 ? '+' : ''}{formatNumber(gainLossPercent, 1)}%)
                          </div>
                        )}
                        <Badge variant="outline" className="text-xs mt-1">
                          {getAssetTypeLabel(holding.assets.asset_type)}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}