import React, { useState } from "react";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/components/auth/useAuth";
import { AuthForm } from "@/components/auth/AuthForm";
import { LandingPage } from "@/components/landing/LandingPage";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { PocketsPage } from "@/components/pockets/PocketsPage";
import { SettingsPage } from "@/components/settings/SettingsPage";
import { TransactionDialog } from "@/components/dashboard/TransactionDialog";
import { CreatePocketDialog } from "@/components/dashboard/CreatePocketDialog";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppContent() {
  const { user, loading } = useAuth();
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [showCreatePocket, setShowCreatePocket] = useState(false);
  const navigate = useNavigate();

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
              onSuccess={() => setShowAddTransaction(false)}
              pockets={[]}
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
              onSuccess={() => setShowAddTransaction(false)}
              pockets={[]}
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
              onSuccess={() => setShowAddTransaction(false)}
              pockets={[]}
            />
          </DashboardLayout>
        } 
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
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