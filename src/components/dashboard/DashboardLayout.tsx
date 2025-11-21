import { ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/components/auth/useAuth";
import { LogOut, Plus, Settings, PieChart, Wallet, Receipt } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DashboardLayoutProps {
  children: ReactNode;
  onAddTransaction?: () => void;
  onAddPocket?: () => void;
}

export function DashboardLayout({ children, onAddTransaction, onAddPocket }: DashboardLayoutProps) {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Signed out successfully",
        description: "Come back soon!",
      });
    } catch (error) {
      toast({
        title: "Error signing out",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="bg-gradient-card border-b border-border shadow-sm">
        <div className="container mx-auto px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center overflow-hidden">
                <img src="/pitipal_square.png" alt="Pitipal" className="w-full h-full object-cover" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  Pitipal
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Smart Financial Management</p>
              </div>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-3">
              {onAddTransaction && (
                <Button onClick={onAddTransaction} variant="hero" size="sm" className="hidden sm:flex">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Transaction
                </Button>
              )}
              {onAddTransaction && (
                <Button onClick={onAddTransaction} variant="hero" size="sm" className="sm:hidden">
                  <Plus className="h-4 w-4" />
                </Button>
              )}
              
              <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
                <AvatarImage src={user?.user_metadata?.avatar_url} />
                <AvatarFallback className="bg-gradient-primary text-primary-foreground text-sm">
                  {user?.user_metadata?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>

              <Button onClick={handleSignOut} variant="outline" size="sm" className="p-2">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-card border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex space-x-4 sm:space-x-8 overflow-x-auto scrollbar-hide">
            <button 
              onClick={() => navigate("/")}
              className={`flex items-center space-x-2 py-3 sm:py-4 transition-colors cursor-pointer whitespace-nowrap ${
                location.pathname === "/" 
                  ? "text-primary border-b-2 border-primary" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <PieChart className="h-4 w-4" />
              <span className="font-medium text-sm sm:text-base">Dashboard</span>
            </button>
            <button 
              onClick={() => navigate("/pockets")}
              className={`flex items-center space-x-2 py-3 sm:py-4 transition-colors cursor-pointer whitespace-nowrap ${
                location.pathname === "/pockets" 
                  ? "text-primary border-b-2 border-primary" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Wallet className="h-4 w-4" />
              <span className="font-medium text-sm sm:text-base">Pockets</span>
            </button>
            <button 
              onClick={() => navigate("/transactions")}
              className={`flex items-center space-x-2 py-3 sm:py-4 transition-colors cursor-pointer whitespace-nowrap ${
                location.pathname === "/transactions" 
                  ? "text-primary border-b-2 border-primary" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Receipt className="h-4 w-4" />
              <span className="font-medium text-sm sm:text-base">Transactions</span>
            </button>
            <button 
              onClick={() => navigate("/settings")}
              className={`flex items-center space-x-2 py-3 sm:py-4 transition-colors cursor-pointer whitespace-nowrap ${
                location.pathname === "/settings" 
                  ? "text-primary border-b-2 border-primary" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Settings className="h-4 w-4" />
              <span className="font-medium text-sm sm:text-base">Settings</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}