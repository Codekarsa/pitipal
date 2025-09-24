import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, PiggyBank, CreditCard, TrendingUp } from "lucide-react";
import { InvestmentAccountsSection } from "./InvestmentAccountsSection";
import { SavingsAccountsSection } from "./SavingsAccountsSection";
import { CreditCardAccountsSection } from "./CreditCardAccountsSection";
import { AssetsSection } from "./AssetsSection";
import { HoldingsSection } from "../portfolio/HoldingsSection";

export function AccountsSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Financial Accounts</h2>
        <p className="text-muted-foreground">
          Manage all your financial accounts and track your complete financial picture
        </p>
      </div>

      <Tabs defaultValue="investment" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="investment" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Investment</span>
          </TabsTrigger>
          <TabsTrigger value="savings" className="flex items-center gap-2">
            <PiggyBank className="h-4 w-4" />
            <span className="hidden sm:inline">Savings</span>
          </TabsTrigger>
          <TabsTrigger value="credit" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Credit Cards</span>
          </TabsTrigger>
          <TabsTrigger value="assets" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Assets</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="investment" className="space-y-6">
          <div className="grid gap-6">
            <InvestmentAccountsSection />
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Portfolio Holdings
                </CardTitle>
                <CardDescription>
                  Track individual holdings and investments across your accounts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <HoldingsSection />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="savings">
          <SavingsAccountsSection />
        </TabsContent>

        <TabsContent value="credit">
          <CreditCardAccountsSection />
        </TabsContent>

        <TabsContent value="assets">
          <AssetsSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}