import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/useAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowUpRight, Building2, CreditCard, Database, PiggyBank, Settings, Tag, TrendingUp, User } from "lucide-react";
import { GeneralSettings } from "./GeneralSettings";
import { CategoriesSection } from "./CategoriesSection";
import { AccountsSection } from "./AccountsSection";
import { DataManagementSection } from "./DataManagementSection";
import { currencies } from "@/lib/currencies";

const sections = [
  { value: "overview", label: "Overview", icon: Settings },
  { value: "general", label: "General", icon: User },
  { value: "categories", label: "Categories", icon: Tag },
  { value: "accounts", label: "Accounts", icon: Building2 },
  { value: "data", label: "Data", icon: Database },
];

export function SettingsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState("overview");

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("user_id", user!.id).single();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: stats, isPending: statsPending, isError: statsError } = useQuery({
    queryKey: ["settings-stats", user?.id],
    queryFn: async () => {
      const results = await Promise.all([
        supabase.from("categories").select("id", { count: "exact", head: true }).eq("user_id", user!.id),
        supabase.from("investment_accounts").select("id", { count: "exact", head: true }).eq("user_id", user!.id),
        supabase.from("savings_accounts").select("id", { count: "exact", head: true }).eq("user_id", user!.id),
        supabase.from("credit_card_accounts").select("id", { count: "exact", head: true }).eq("user_id", user!.id),
      ]);
      for (const result of results) if (result.error) throw result.error;
      return results.map(result => result.count ?? 0);
    },
    enabled: !!user?.id,
  });

  return (
    <div className="settings-page min-w-0 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Make Pitipal work for you. Manage your preferences, accounts, and data.</p>
      </header>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="min-w-0 space-y-6">
        <TabsList aria-label="Settings sections" className="flex h-auto w-full flex-wrap justify-start gap-1 rounded-[1.5rem] bg-card p-2 sm:w-fit">
          {sections.map(({ value, label, icon: Icon }) => (
            <TabsTrigger key={value} value={value} className="min-h-10 gap-2 rounded-full px-3 data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:shadow-none sm:px-4">
              <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid min-w-0 gap-4 lg:grid-cols-3">
            <section aria-labelledby="preferences-title" className="min-w-0 rounded-[1.75rem] bg-sky-100 bg-[radial-gradient(at_0%_100%,hsl(174_75%_77%)_0%,transparent_65%),radial-gradient(at_100%_0%,hsl(202_95%_74%)_0%,transparent_65%)] p-5 text-slate-900 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 id="preferences-title" className="text-sm font-medium">Your preferences</h2>
                <span className="rounded-2xl bg-white/40 p-2.5"><User aria-hidden="true" className="h-5 w-5" /></span>
              </div>
              <p className="mt-5 text-4xl font-semibold tracking-tight">{profile?.currency || "Not set"}</p>
              <p className="mt-2 text-sm text-slate-700">{currencies.find(currency => currency.code === profile?.currency)?.name || "Choose your preferred currency"}</p>
              <button onClick={() => setSelectedTab("general")} className="mt-6 inline-flex min-h-10 items-center gap-2 rounded-full bg-white/60 px-4 text-sm font-medium transition-colors hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-700">
                Edit preferences <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
              </button>
            </section>

            <section aria-labelledby="setup-title" className="min-w-0 rounded-[1.75rem] bg-card p-5 sm:p-6 lg:col-span-2">
              <h2 id="setup-title" className="text-lg font-semibold">Your financial setup</h2>
              <p className="mt-1 text-sm text-muted-foreground">The categories and accounts you’ve added to Pitipal.</p>
              <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-4">
                {[
                  { label: "Categories", icon: Tag },
                  { label: "Investment accounts", icon: TrendingUp },
                  { label: "Savings accounts", icon: PiggyBank },
                  { label: "Credit cards", icon: CreditCard },
                ].map(({ label, icon: Icon }, index) => (
                  <div key={label} className="min-w-0">
                    <Icon aria-hidden="true" className="mb-3 h-5 w-5 text-muted-foreground" />
                    <dt className="text-sm text-muted-foreground">{label}</dt>
                    <dd className="mt-1 text-3xl font-semibold tracking-tight">{statsPending || statsError ? "—" : stats?.[index]}</dd>
                  </div>
                ))}
              </dl>
              {statsError && <p role="status" className="mt-4 text-sm text-muted-foreground">Setup counts couldn’t load. You can still open each section below.</p>}
            </section>
          </div>

          <section aria-labelledby="manage-title">
            <h2 id="manage-title" className="mb-3 text-lg font-semibold">Manage your workspace</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { tab: "general", title: "Profile & preferences", description: "Review account details and choose your display currency.", icon: User, surface: "bg-sky-100 text-sky-800" },
                { tab: "categories", title: "Categories", description: "Organize income, expenses, and investments your way.", icon: Tag, surface: "bg-violet-100 text-violet-800" },
                { tab: "accounts", title: "Financial accounts", description: "Manage savings, investments, credit cards, and assets.", icon: Building2, surface: "bg-emerald-100 text-emerald-800" },
                { tab: "data", title: "Import & export", description: "Bring in CSV files or download your records.", icon: Database, surface: "bg-orange-100 text-orange-800" },
              ].map(({ tab, title, description, icon: Icon, surface }) => (
                <button key={tab} onClick={() => setSelectedTab(tab)} className="group flex min-w-0 items-start gap-4 rounded-[1.75rem] bg-card p-5 text-left transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-6">
                  <span className={`shrink-0 rounded-2xl p-3 ${surface}`}><Icon aria-hidden="true" className="h-5 w-5" /></span>
                  <span className="min-w-0 flex-1"><span className="block font-semibold">{title}</span><span className="mt-1 block text-sm leading-relaxed text-muted-foreground">{description}</span></span>
                  <ArrowUpRight aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground" />
                </button>
              ))}
            </div>
          </section>
        </TabsContent>

        <TabsContent value="general">
          <GeneralSettings profile={profile} user={user} currencies={currencies} queryClient={queryClient} />
        </TabsContent>
        <TabsContent value="categories">
          <CategoriesSection />
        </TabsContent>
        <TabsContent value="accounts">
          <AccountsSection />
        </TabsContent>
        <TabsContent value="data">
          <DataManagementSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
