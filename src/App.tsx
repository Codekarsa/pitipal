import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { initializeGA, trackPageView } from "@/lib/analytics";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/components/auth/useAuth";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { AuthForm } from "@/components/auth/AuthForm";
import { LandingPage } from "@/components/landing/LandingPage";
import { AboutPage } from "@/components/landing/AboutPage";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { PocketsPage } from "@/components/pockets/PocketsPage";
import { SettingsPage } from "@/components/settings/SettingsPage";
import { TransactionsPage } from "@/components/transactions/TransactionsPage";
import { TransactionDialog } from "@/components/dashboard/TransactionDialog";
import { CreatePocketDialog } from "@/components/dashboard/CreatePocketDialog";
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
  const { user, loading } = useAuth();
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [showCreatePocket, setShowCreatePocket] = useState(false);
  const [pockets, setPockets] = useState<BudgetPocket[]>([]);
  const [transactionsRefreshKey, setTransactionsRefreshKey] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

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
  const handleTransactionSaved = () => {
    setShowAddTransaction(false);
    fetchPockets();
    queryClient.invalidateQueries({ queryKey: ['pocketSpending'] });
    queryClient.invalidateQueries({ queryKey: ['credit-card-balances'] });
    setTransactionsRefreshKey(k => k + 1);
  };

  if (loading) {
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
              onAddPocket={() => setShowCreatePocket(true)}
            >
              <PocketsPage />
              <TransactionDialog
                open={showAddTransaction}
                onOpenChange={setShowAddTransaction}
                onSuccess={handleTransactionSaved}
                pockets={pockets}
              />
              <CreatePocketDialog
                open={showCreatePocket}
                onOpenChange={setShowCreatePocket}
                onSuccess={() => setShowCreatePocket(false)}
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
