import { Coins, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

const sampleAssets = [
  { symbol: "AAPL", name: "Apple Inc.", type: "stock" },
  { symbol: "GOOGL", name: "Alphabet Inc.", type: "stock" },
  { symbol: "SPY", name: "SPDR S&P 500 ETF", type: "etf" },
  { symbol: "BTC", name: "Bitcoin", type: "crypto" },
  { symbol: "VTSAX", name: "Vanguard Total Stock Market", type: "mutual_fund" },
];

export function AssetsSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins className="h-5 w-5" />
          Assets Management
        </CardTitle>
        <CardDescription>
          Manage your investment assets including stocks, ETFs, crypto, and custom assets
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <Coins className="h-4 w-4" />
          <AlertDescription>
            Asset management is ready! The database includes popular assets and supports custom ones. 
            This feature will be fully functional once the database types are refreshed.
          </AlertDescription>
        </Alert>

        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-muted-foreground">
              12 default assets • 0 custom assets
            </p>
          </div>
          <Button size="sm" disabled>
            <Plus className="h-4 w-4 mr-2" />
            Add Custom Asset (Coming Soon)
          </Button>
        </div>

        <div>
          <h4 className="font-medium mb-3">Sample Available Assets</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {sampleAssets.map((asset) => (
              <div
                key={asset.symbol}
                className="flex items-center justify-between p-3 border rounded-lg opacity-60"
              >
                <div>
                  <h5 className="font-medium">{asset.symbol}</h5>
                  <p className="text-sm text-muted-foreground">{asset.name}</p>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {asset.type}
                </Badge>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            + 7 more assets (ETH, TSLA, MSFT, AMZN, VTI, QQQ, VTIAX)
          </p>
        </div>
      </CardContent>
    </Card>
  );
}