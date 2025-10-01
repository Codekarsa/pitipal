import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { 
  Settings, User, Tag, Building2, TrendingUp, 
  DollarSign, Euro, PoundSterling, CircleDollarSign,
  CheckCircle, AlertCircle, Clock, Database
} from "lucide-react";

// Import sections
import { GeneralSettings } from "./GeneralSettings";
import { CategoriesSection } from "./CategoriesSection";
import { AccountsSection } from "./AccountsSection";
import { PortfolioSection } from "./PortfolioSection";
import { DataManagementSection } from "./DataManagementSection";
import { MonthlyRolloverTrigger } from "../debug/MonthlyRolloverTrigger";

const currencies = [
  { code: "USD", symbol: "$", name: "US Dollar", icon: DollarSign },
  { code: "EUR", symbol: "€", name: "Euro", icon: Euro },
  { code: "GBP", symbol: "£", name: "British Pound", icon: PoundSterling },
  { code: "JPY", symbol: "¥", name: "Japanese Yen", icon: CircleDollarSign },
  { code: "IDR", symbol: "Rp", name: "Indonesian Rupiah", icon: CircleDollarSign },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar", icon: DollarSign },
  { code: "MYR", symbol: "RM", name: "Malaysian Ringgit", icon: CircleDollarSign },
  { code: "THB", symbol: "฿", name: "Thai Baht", icon: CircleDollarSign },
  { code: "KRW", symbol: "₩", name: "South Korean Won", icon: CircleDollarSign },
  { code: "CNY", symbol: "¥", name: "Chinese Yuan", icon: CircleDollarSign },
  { code: "INR", symbol: "₹", name: "Indian Rupee", icon: CircleDollarSign },
  { code: "AUD", symbol: "A$", name: "Australian Dollar", icon: DollarSign },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar", icon: DollarSign },
];

export function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState("overview");

  // Fetch user profile
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching profile:", error);
        throw error;
      }

      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch completion stats
  const { data: stats } = useQuery({
    queryKey: ["settings-stats", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Fetch counts for different sections
      const [categories, investmentAccounts, savingsAccounts, creditCards] = await Promise.all([
        supabase.from("categories").select("id", { count: 'exact' }).eq("user_id", user.id),
        supabase.from("investment_accounts").select("id", { count: 'exact' }).eq("user_id", user.id),
        supabase.from("savings_accounts").select("id", { count: 'exact' }).eq("user_id", user.id),
        supabase.from("credit_card_accounts").select("id", { count: 'exact' }).eq("user_id", user.id),
      ]);

      return {
        categoriesCount: categories.count || 0,
        investmentAccountsCount: investmentAccounts.count || 0,
        savingsAccountsCount: savingsAccounts.count || 0,
        creditCardsCount: creditCards.count || 0,
        profileComplete: !!profile?.currency,
      };
    },
    enabled: !!user?.id,
  });

  const getCompletionProgress = () => {
    if (!stats) return 0;
    
    let completed = 0;
    let total = 5;

    if (stats.profileComplete) completed++;
    if (stats.categoriesCount > 0) completed++;
    if (stats.investmentAccountsCount > 0) completed++;
    if (stats.savingsAccountsCount > 0) completed++;
    if (stats.creditCardsCount > 0) completed++;

    return Math.round((completed / total) * 100);
  };

  const getCompletionItems = () => {
    if (!stats) return [];

    return [
      {
        title: "Profile Setup",
        description: "Currency and basic preferences",
        status: stats.profileComplete ? "complete" : "incomplete",
        icon: User,
      },
      {
        title: "Categories",
        description: `${stats.categoriesCount} categories configured`,
        status: stats.categoriesCount > 0 ? "complete" : "incomplete",
        icon: Tag,
      },
      {
        title: "Investment Accounts",
        description: `${stats.investmentAccountsCount} accounts added`,
        status: stats.investmentAccountsCount > 0 ? "complete" : "incomplete",
        icon: TrendingUp,
      },
      {
        title: "Savings Accounts",
        description: `${stats.savingsAccountsCount} accounts added`,
        status: stats.savingsAccountsCount > 0 ? "complete" : "incomplete",
        icon: Building2,
      },
      {
        title: "Credit Cards",
        description: `${stats.creditCardsCount} cards added`,
        status: stats.creditCardsCount > 0 ? "complete" : "incomplete",
        icon: CircleDollarSign,
      },
    ];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Settings className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage your account and application preferences</p>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
            <Settings className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden md:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="general" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
            <User className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden md:inline">General</span>
          </TabsTrigger>
          <TabsTrigger value="categories" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
            <Tag className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden md:inline">Categories</span>
          </TabsTrigger>
          <TabsTrigger value="accounts" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
            <Building2 className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden md:inline">Accounts</span>
          </TabsTrigger>
          <TabsTrigger value="data" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
            <Database className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden md:inline">Data</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4 sm:space-y-6">
          <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
            {/* Setup Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  Setup Progress
                </CardTitle>
                <CardDescription>
                  Complete your profile setup to get the most out of the app
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Setup Completion</span>
                    <span className="font-medium">{getCompletionProgress()}%</span>
                  </div>
                  <Progress value={getCompletionProgress()} className="h-2" />
                </div>

                <div className="space-y-3">
                  {getCompletionItems().map((item, index) => {
                    const Icon = item.icon;
                    const StatusIcon = item.status === "complete" ? CheckCircle : Clock;
                    
                    return (
                      <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{item.title}</p>
                          <p className="text-xs text-muted-foreground">{item.description}</p>
                        </div>
                        <StatusIcon className={`h-4 w-4 ${
                          item.status === "complete" ? "text-green-500" : "text-yellow-500"
                        }`} />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Quick Stats
                </CardTitle>
                <CardDescription>
                  Overview of your financial setup
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-2xl font-bold text-primary">{stats?.categoriesCount || 0}</p>
                    <p className="text-sm text-muted-foreground">Categories</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-2xl font-bold text-primary">{stats?.investmentAccountsCount || 0}</p>
                    <p className="text-sm text-muted-foreground">Investment Accounts</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-2xl font-bold text-primary">{stats?.savingsAccountsCount || 0}</p>
                    <p className="text-sm text-muted-foreground">Savings Accounts</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-2xl font-bold text-primary">{stats?.creditCardsCount || 0}</p>
                    <p className="text-sm text-muted-foreground">Credit Cards</p>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-primary/10 rounded">
                      <DollarSign className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Currency</p>
                      <p className="text-sm text-muted-foreground">
                        {profile?.currency ? 
                          currencies.find(c => c.code === profile.currency)?.name || profile.currency
                          : "Not set"
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Jump to commonly used settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                <button
                  onClick={() => setSelectedTab("general")}
                  className="p-3 sm:p-4 text-left border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <User className="h-4 w-4 sm:h-5 sm:w-5 text-primary mb-2" />
                  <p className="font-medium text-sm sm:text-base">Profile Settings</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Update currency and preferences</p>
                </button>
                
                <button
                  onClick={() => setSelectedTab("categories")}
                  className="p-3 sm:p-4 text-left border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <Tag className="h-4 w-4 sm:h-5 sm:w-5 text-primary mb-2" />
                  <p className="font-medium text-sm sm:text-base">Manage Categories</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Organize transaction categories</p>
                </button>
                
                <button
                  onClick={() => setSelectedTab("accounts")}
                  className="p-3 sm:p-4 text-left border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary mb-2" />
                  <p className="font-medium text-sm sm:text-base">Financial Accounts</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Add investment and savings accounts</p>
                </button>

                <button
                  onClick={() => setSelectedTab("accounts")}
                  className="p-3 sm:p-4 text-left border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <CircleDollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-primary mb-2" />
                  <p className="font-medium text-sm sm:text-base">Credit Cards</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Manage credit card accounts</p>
                </button>
                
                <button
                  onClick={() => setSelectedTab("data")}
                  className="p-3 sm:p-4 text-left border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <Database className="h-4 w-4 sm:h-5 sm:w-5 text-primary mb-2" />
                  <p className="font-medium text-sm sm:text-base">Import & Export</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Manage your financial data</p>
                </button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* General Settings Tab */}
        <TabsContent value="general">
          <GeneralSettings 
            profile={profile}
            user={user}
            currencies={currencies}
            queryClient={queryClient}
          />
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories">
          <div className="space-y-2">
            <div>
              <h2 className="text-2xl font-semibold">Categories</h2>
              <p className="text-muted-foreground">
                Organize your transactions with custom category groups and categories
              </p>
            </div>
            <CategoriesSection />
          </div>
        </TabsContent>

        {/* Accounts Tab */}
        <TabsContent value="accounts">
          <AccountsSection />
        </TabsContent>

        {/* Data Management Tab */}
        <TabsContent value="data">
          <div className="space-y-6">
            <DataManagementSection />
            <MonthlyRolloverTrigger />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}