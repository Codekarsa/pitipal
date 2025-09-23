import { Building2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function InvestmentAccountsSection() {
  return (
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
        <Alert>
          <Building2 className="h-4 w-4" />
          <AlertDescription>
            Investment account management is ready! The database has been set up with investment tracking capabilities. 
            This feature will be fully functional once the database types are refreshed.
          </AlertDescription>
        </Alert>
        
        <div className="text-center py-8 text-muted-foreground">
          <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <p className="font-medium">Investment Accounts Coming Soon</p>
          <p className="text-sm">Database structure is ready for:</p>
          <ul className="text-sm mt-2 space-y-1">
            <li>• Brokerage accounts (Fidelity, Schwab, Robinhood)</li>
            <li>• Retirement accounts (401k, IRA, Roth IRA)</li>
            <li>• Crypto exchanges</li>
            <li>• Pension funds</li>
          </ul>
        </div>

        <Button size="sm" disabled className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Add Investment Account (Coming Soon)
        </Button>
      </CardContent>
    </Card>
  );
}