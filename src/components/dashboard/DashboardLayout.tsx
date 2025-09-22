import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/components/auth/useAuth";
import { LogOut, Plus, Settings, PieChart, Wallet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DashboardLayoutProps {
  children: ReactNode;
  onAddTransaction?: () => void;
  onAddPocket?: () => void;
}

export function DashboardLayout({ children, onAddTransaction, onAddPocket }: DashboardLayoutProps) {
  const { user, signOut } = useAuth();
  const { toast } = useToast();

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
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center shadow-glow">
                <span className="text-lg font-bold text-primary-foreground">₿</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  ChromaBudget
                </h1>
                <p className="text-sm text-muted-foreground">Smart Financial Management</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {onAddTransaction && (
                <Button onClick={onAddTransaction} variant="hero" size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Transaction
                </Button>
              )}
              
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.user_metadata?.avatar_url} />
                <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                  {user?.user_metadata?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>

              <Button onClick={handleSignOut} variant="outline" size="sm">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-card border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex space-x-8">
            <button className="flex items-center space-x-2 py-4 text-primary border-b-2 border-primary">
              <PieChart className="h-4 w-4" />
              <span className="font-medium">Dashboard</span>
            </button>
            <button 
              onClick={onAddPocket}
              className="flex items-center space-x-2 py-4 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <Wallet className="h-4 w-4" />
              <span className="font-medium">Pockets</span>
            </button>
            <button 
              onClick={() => {
                toast({
                  title: "Settings",
                  description: "Settings panel coming soon!",
                });
              }}
              className="flex items-center space-x-2 py-4 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <Settings className="h-4 w-4" />
              <span className="font-medium">Settings</span>
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