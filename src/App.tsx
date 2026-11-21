import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { initializeGA, trackPageView } from "@/lib/analytics";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/components/auth/useAuth";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { AuthForm } from "@/components/auth/AuthForm";
import { CurrencySetup } from "@/components/auth/CurrencySetup";
import { Button } from "@/components/ui/button";
import { LandingPage } from "@/components/landing/LandingPage";
import { AboutPage } from "@/components/landing/AboutPage";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { PocketsPage } from "@/components/pockets/PocketsPage";
import { SettingsPage } from "@/components/settings/SettingsPage";
import { TransactionsPage } from "@/components/transactions/TransactionsPage";
import { TransactionDialog } from "@/components/dashboard/TransactionDialog";
import { supabase } from "@/integrations/supabase/client";
import { handleError } from "@/lib/error-utils";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Initialize Google Analytics
initializeGA();

interface BudgetPocket {
  id: string;
  name: string;
  color: string;
  pocket_type: string;
  budget_type: string;
}

function AppContent() {
  const { user, loading, signOut } = useAuth();
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [pockets, setPockets] = useState<BudgetPocket[]>([]);
  const [transactionsRefreshKey, setTransactionsRefreshKey] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  const { data: profile, isLoading: profileLoading, error: profileError, refetch: retryProfile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Track page views
  useEffect(() => {
    trackPageView(location.pathname);
  }, [location]);

  useEffect(() => {
    if (user) {
      fetchPockets();
    }
  }, [user]);

  const fetchPockets = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('budget_pockets')
        .select('id, name, color, pocket_type, budget_type')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPockets(data || []);
    } catch (error) {
      handleError(error, "Failed to load budget pockets. Please try refreshing the page.");
    }
  };

  // A saved transaction changes pocket totals and card balances, so refetch what shows them
  const handleTransactionSaved = (close = true) => {
    if (close) setShowAddTransaction(false);
    fetchPockets();
    queryClient.invalidateQueries({ queryKey: ['pocketSpending'] });
    queryClient.invalidateQueries({ queryKey: ['credit-card-balances'] });
    setTransactionsRefreshKey(k => k + 1);
  };

  if (loading || (user && profileLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto animate-pulse overflow-hidden">
            <img src="/pitipal_square.png" alt="Pitipal" className="w-full h-full object-cover" />
          </div>
          <p className="text-muted-foreground">Loading Pitipal...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    if (showAuthForm) {
      return <AuthForm onSuccess={() => setShowAuthForm(false)} />;
    }
    
    if (showAbout) {
      return <AboutPage onBack={() => setShowAbout(false)} />;
    }
    
    return (
      <LandingPage 
        onGetStarted={() => setShowAuthForm(true)}
        onAbout={() => setShowAbout(true)}
      />
    );
  }

  if (profileError) {
    return (
      <main className="min-h-screen bg-gradient-subtle flex items-center justify-center p-6">
        <div className="max-w-sm space-y-4 text-center">
          <h1 className="text-xl font-bold">We couldn't load your preferences</h1>
          <p className="text-muted-foreground">Please try again before entering any amounts.</p>
          <Button onClick={() => retryProfile()}>Try again</Button>
          <Button variant="ghost" onClick={signOut}>Sign out</Button>
        </div>
      </main>
    );
  }

  if (!profile?.currency) {
    return <CurrencySetup user={user} onComplete={() => navigate("/", { replace: true })} onSignOut={signOut} />;
  }

  return (
    <ErrorBoundary>
      <Routes>
        <Route 
          path="/" 
          element={
            <DashboardLayout 
              onAddTransaction={() => setShowAddTransaction(true)}
              onAddPocket={() => navigate("/pockets")}
            >
              <Dashboard />
              <TransactionDialog
                open={showAddTransaction}
                onOpenChange={setShowAddTransaction}
                onSuccess={handleTransactionSaved}
                onSaved={() => handleTransactionSaved(false)}
                pockets={pockets}
              />
            </DashboardLayout>
          } 
        />
        <Route 
          path="/pockets" 
          element={
            <DashboardLayout 
              onAddTransaction={() => setShowAddTransaction(true)}
              onAddPocket={() => navigate("/pockets?create=1")}
            >
              <PocketsPage />
              <TransactionDialog
                open={showAddTransaction}
                onOpenChange={setShowAddTransaction}
                onSuccess={handleTransactionSaved}
                onSaved={() => handleTransactionSaved(false)}
                pockets={pockets}
              />
            </DashboardLayout>
          } 
        />
        <Route 
          path="/transactions" 
          element={
            <DashboardLayout 
              onAddTransaction={() => setShowAddTransaction(true)}
              onAddPocket={() => navigate("/pockets")}
            >
              <TransactionsPage refreshKey={transactionsRefreshKey} />
              <TransactionDialog
                open={showAddTransaction}
                onOpenChange={setShowAddTransaction}
                onSuccess={handleTransactionSaved}
                onSaved={() => handleTransactionSaved(false)}
                pockets={pockets}
              />
            </DashboardLayout>
          } 
        />
        <Route 
          path="/transactions/:pocketId" 
          element={
            <DashboardLayout 
              onAddTransaction={() => setShowAddTransaction(true)}
              onAddPocket={() => navigate("/pockets")}
            >
              <TransactionsPage refreshKey={transactionsRefreshKey} />
              <TransactionDialog
                open={showAddTransaction}
                onOpenChange={setShowAddTransaction}
                onSuccess={handleTransactionSaved}
                onSaved={() => handleTransactionSaved(false)}
                pockets={pockets}
              />
            </DashboardLayout>
          } 
        />
        <Route 
          path="/settings" 
          element={
            <DashboardLayout 
              onAddTransaction={() => setShowAddTransaction(true)}
              onAddPocket={() => navigate("/pockets")}
            >
              <SettingsPage />
              <TransactionDialog
                open={showAddTransaction}
                onOpenChange={setShowAddTransaction}
                onSuccess={handleTransactionSaved}
                onSaved={() => handleTransactionSaved(false)}
                pockets={pockets}
              />
            </DashboardLayout>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </ErrorBoundary>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
