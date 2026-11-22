import { ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/components/auth/useAuth";
import { LogOut, Plus, Settings, PieChart, Wallet, Receipt } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { analytics } from "@/lib/analytics";

interface DashboardLayoutProps {
  children: ReactNode;
  onAddTransaction?: () => void;
  onAddPocket?: () => void;
}

export function DashboardLayout({ children, onAddTransaction }: DashboardLayoutProps) {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const fullName = user?.user_metadata?.full_name;
  const firstName = typeof fullName === 'string' ? fullName.trim().split(/\s+/)[0] : '';
  const navigation = [
    { path: "/", label: "Dashboard", icon: PieChart },
    { path: "/pockets", label: "Pockets", icon: Wallet },
    { path: "/transactions", label: "Transactions", icon: Receipt },
    { path: "/settings", label: "Settings", icon: Settings },
  ];

  const handleSignOut = async () => {
    try {
      await signOut();
      analytics.trackLogout();
      toast({
        title: "Signed out successfully",
        description: "Come back soon!",
      });
    } catch {
      toast({
        title: "Error signing out",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background lg:pl-44">
      <aside className="lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:w-44 lg:flex-col lg:border-r lg:border-border/60 lg:bg-card/40 lg:px-3 lg:py-7">
        <div className="hidden items-center gap-2 px-2 py-3 lg:flex">
          <img src="/pitipal_square.png" alt="" className="h-8 w-8 rounded-xl" />
          <span className="text-xl font-semibold tracking-tight">Pitipal</span>
        </div>
        <nav aria-label="Main navigation" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t bg-card px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:static lg:mt-10 lg:grid-cols-1 lg:gap-2 lg:border-0 lg:bg-transparent lg:p-0">
          {navigation.map(({ path, label, icon: Icon }) => {
            const active = path === "/" ? location.pathname === path : location.pathname.startsWith(path);
            return <button key={path} onClick={() => navigate(path)} aria-current={active ? "page" : undefined}
              className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:flex-row lg:justify-start lg:gap-2 lg:px-3 lg:text-xs ${active ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:bg-card/80 hover:text-foreground"}`}>
              <Icon className="h-5 w-5" /><span>{label}</span>
            </button>;
          })}
        </nav>
        <div className="mt-auto hidden border-t pt-5 lg:block">
          <p className="px-3 text-xs leading-relaxed text-muted-foreground">Small steps today.<br />More peace of mind tomorrow.</p>
        </div>
      </aside>
      <header>
        <div className="mx-auto flex min-h-24 max-w-[1600px] items-center justify-between gap-2 px-4 sm:px-8 lg:pt-4">
          <div className="flex items-center gap-2 lg:hidden">
            <img src="/pitipal_square.png" alt="" className="h-8 w-8 rounded-lg" />
            <span className="text-lg font-bold tracking-tight">Pitipal</span>
          </div>
          <div className="hidden lg:block"><p className="text-xl font-medium tracking-tight">Welcome{firstName ? `, ${firstName}` : ' back'}</p><p className="mt-1 text-xs text-muted-foreground">Your personal budget overview</p></div>
          <div className="flex items-center gap-2 sm:gap-3">
            {onAddTransaction && <Button onClick={onAddTransaction} size="sm" className="h-11 rounded-full px-4" aria-label="Add Transaction">
              <Plus className="h-4 w-4" /><span className="hidden sm:inline">Add Transaction</span><span className="sm:hidden">Add</span>
            </Button>}
            <Avatar className="hidden h-10 w-10 sm:flex">
              <AvatarImage src={user?.user_metadata?.avatar_url} />
              <AvatarFallback className="bg-accent text-primary text-sm">{user?.user_metadata?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}</AvatarFallback>
            </Avatar>
            <Button onClick={handleSignOut} variant="ghost" size="icon" className="rounded-full" aria-label="Sign out"><LogOut className="h-4 w-4" /></Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1600px] px-4 pt-4 pb-28 sm:px-8 sm:pt-6 lg:pb-12">{children}</main>
    </div>
  );
}
