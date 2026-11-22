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
        <h2 className="text-xl font-semibold tracking-tight">Financial accounts</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Keep savings, investments, credit cards, and assets in one place.
        </p>
      </div>

      <Tabs defaultValue="investment" className="space-y-6">
        <TabsList aria-label="Account types" className="grid h-auto w-full grid-cols-2 gap-1 rounded-2xl bg-muted/60 p-1.5 sm:w-fit sm:grid-cols-4">
          <TabsTrigger value="investment" className="min-h-10 gap-2 rounded-full">
            <TrendingUp className="h-4 w-4" />
            <span>Investment</span>
          </TabsTrigger>
          <TabsTrigger value="savings" className="min-h-10 gap-2 rounded-full">
            <PiggyBank className="h-4 w-4" />
            <span>Savings</span>
          </TabsTrigger>
          <TabsTrigger value="credit" className="min-h-10 gap-2 rounded-full">
            <CreditCard className="h-4 w-4" />
            <span>Credit Cards</span>
          </TabsTrigger>
          <TabsTrigger value="assets" className="min-h-10 gap-2 rounded-full">
            <Building2 className="h-4 w-4" />
            <span>Assets</span>
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
