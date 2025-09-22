import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "@/components/auth/useAuth";
import { AuthForm } from "@/components/auth/AuthForm";
import { LandingPage } from "@/components/landing/LandingPage";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { TransactionDialog } from "@/components/dashboard/TransactionDialog";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppContent() {
  const { user, loading } = useAuth();
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [showAddTransaction, setShowAddTransaction] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-glow mx-auto animate-pulse">
            <span className="text-2xl font-bold text-primary-foreground">₿</span>
          </div>
          <p className="text-muted-foreground">Loading ChromaBudget...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return showAuthForm ? (
      <AuthForm onSuccess={() => setShowAuthForm(false)} />
    ) : (
      <LandingPage onGetStarted={() => setShowAuthForm(true)} />
    );
  }

  return (
    <DashboardLayout 
      onAddTransaction={() => setShowAddTransaction(true)}
    >
      <Dashboard />
      <TransactionDialog
        open={showAddTransaction}
        onOpenChange={setShowAddTransaction}
        onSuccess={() => setShowAddTransaction(false)}
        pockets={[]}
      />
    </DashboardLayout>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppContent />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
