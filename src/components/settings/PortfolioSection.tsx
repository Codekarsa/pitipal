import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, BarChart3, DollarSign } from "lucide-react";
import { HoldingsSection } from "../portfolio/HoldingsSection";

export function PortfolioSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Portfolio Management</h2>
        <p className="text-muted-foreground">
          Track and manage your investment holdings and portfolio performance
        </p>
      </div>

      <div className="grid gap-6">
        {/* Holdings Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Investment Holdings
            </CardTitle>
            <CardDescription>
              Manage individual stocks, bonds, ETFs, and other investments in your portfolio
            </CardDescription>
          </CardHeader>
          <CardContent>
            <HoldingsSection />
          </CardContent>
        </Card>

        {/* Portfolio Analytics Placeholder */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Portfolio Analytics
            </CardTitle>
            <CardDescription>
              View performance metrics, allocation charts, and investment insights
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center py-8">
            <div className="space-y-4">
              <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                <BarChart3 className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-medium">Coming Soon</h3>
                <p className="text-sm text-muted-foreground">
                  Advanced portfolio analytics and performance tracking will be available in a future update
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Rebalancing Tools Placeholder */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Rebalancing Tools
            </CardTitle>
            <CardDescription>
              Set target allocations and get rebalancing recommendations
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center py-8">
            <div className="space-y-4">
              <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                <DollarSign className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-medium">Coming Soon</h3>
                <p className="text-sm text-muted-foreground">
                  Portfolio rebalancing tools and allocation management features
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}