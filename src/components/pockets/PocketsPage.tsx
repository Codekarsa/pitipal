import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/useAuth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { PocketCard } from "@/components/dashboard/PocketCard";
import { CreatePocketDialog } from "@/components/dashboard/CreatePocketDialog";
import { EditPocketDialog } from "@/components/dashboard/EditPocketDialog";
import { MonthNavigator } from "@/components/dashboard/MonthNavigator";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { calculatePocketSpending, PocketSpending } from "@/utils/pocketCalculations";

interface BudgetPocket {
  id: string;
  name: string;
  description: string | null;
  budget_amount: number;
  budget_type: string;
  pocket_type: string;
  color: string;
  is_template: boolean;
  auto_renew: boolean;
  cycle_type: string;
  is_featured: boolean;
  month_year: string | null;
  parent_pocket_id: string | null;
  auto_renew: boolean;
}

export function PocketsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedPocket, setSelectedPocket] = useState<BudgetPocket | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));

  // Fetch user profile for currency preference
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
        return { currency: 'USD' }; // fallback
      }

      return data || { currency: 'USD' };
    },
    enabled: !!user?.id,
  });

  const userCurrency = profile?.currency || 'USD';

  const { data: pocketData, isLoading } = useQuery({
    queryKey: ["pocketSpending", user?.id, selectedMonth],
    queryFn: async () => {
      if (!user?.id) return { pockets: [], totalBudget: 0, totalSpent: 0, totalRemaining: 0 };
      const result = await calculatePocketSpending(user.id, selectedMonth);
      console.log('Pockets data from query:', result.pockets);
      console.log('Pocket IDs:', result.pockets.map(p => ({ id: p.id, name: p.name })));
      return result;
    },
    enabled: !!user?.id,
  });

  const pockets = pocketData?.pockets || [];
  console.log('Pockets after extraction:', pockets.length, pockets.map(p => p.id));

  const handleDeletePocket = async (pocketId: string) => {
    try {
      const { error } = await supabase
        .from("budget_pockets")
        .update({ is_active: false })
        .eq("id", pocketId)
        .eq("user_id", user?.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["pocketSpending", user?.id, selectedMonth] });
      toast({
        title: "Pocket deleted",
        description: "Your pocket has been successfully deleted.",
      });
    } catch (error) {
      console.error("Error deleting pocket:", error);
      toast({
        title: "Error",
        description: "Failed to delete pocket. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleToggleFeatured = async (pocketId: string) => {
    try {
      const currentPocket = pockets?.find(p => p.id === pocketId);
      if (!currentPocket) return;

      // Fetch the pocket to get parent_pocket_id
      const { data: pocketData, error: fetchError } = await supabase
        .from("budget_pockets")
        .select("parent_pocket_id, is_featured")
        .eq("id", pocketId)
        .single();

      if (fetchError) throw fetchError;

      // If pocket has a template (parent_pocket_id), update the template's featured status
      const targetId = pocketData.parent_pocket_id || pocketId;

      // Get current featured status
      const { data: targetData, error: targetFetchError } = await supabase
        .from("budget_pockets")
        .select("is_featured")
        .eq("id", targetId)
        .single();

      if (targetFetchError) throw targetFetchError;

      // Toggle featured on template (or pocket if no template)
      const { error } = await supabase
        .from("budget_pockets")
        .update({ is_featured: !targetData.is_featured })
        .eq("id", targetId)
        .eq("user_id", user?.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["pocketSpending", user?.id, selectedMonth] });
      toast({
        title: targetData.is_featured ? "Pocket unfeatured" : "Pocket featured",
        description: `"${currentPocket.name}" has been ${targetData.is_featured ? 'removed from' : 'added to'} featured pockets.`,
      });
    } catch (error) {
      console.error("Error toggling featured status:", error);
      toast({
        title: "Error",
        description: "Failed to update pocket status. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEditPocket = async (pocket: PocketSpending) => {
    try {
      // Fetch the full pocket data to get parent_pocket_id and month_year
      const { data: pocketData, error: fetchError } = await supabase
        .from("budget_pockets")
        .select("*")
        .eq("id", pocket.id)
        .single();

      if (fetchError) throw fetchError;

      // Determine if this is a past month
      const currentMonth = format(new Date(), "yyyy-MM");
      const pocketMonth = pocketData.month_year;
      const isPastMonth = pocketMonth && pocketMonth < currentMonth;

      let targetData: any;
      let editingTemplate = false;

      if (isPastMonth) {
        // Past month: edit the specific month instance only
        targetData = pocketData;
        toast({
          title: "Editing Past Month",
          description: "Changes will only affect this specific month.",
        });
      } else {
        // Current or future month: edit the template
        const targetId = pocketData.parent_pocket_id || pocketData.id;

        const { data: fetchedTarget, error: targetError } = await supabase
          .from("budget_pockets")
          .select("*")
          .eq("id", targetId)
          .single();

        if (targetError) throw targetError;

        targetData = fetchedTarget;
        editingTemplate = targetData.is_template || false;

        if (editingTemplate || pocketData.parent_pocket_id) {
          toast({
            title: "Editing Template",
            description: "Changes will apply to current and future months.",
          });
        }
      }

      // Convert to BudgetPocket format
      const budgetPocket: BudgetPocket = {
        id: targetData.id,
        name: targetData.name,
        description: targetData.description,
        budget_amount: targetData.budget_amount,
        budget_type: targetData.budget_type,
        pocket_type: targetData.pocket_type,
        color: targetData.color,
        is_template: targetData.is_template || false,
        auto_renew: targetData.auto_renew || true,
        cycle_type: targetData.cycle_type,
        is_featured: targetData.is_featured,
        month_year: targetData.month_year,
        parent_pocket_id: targetData.parent_pocket_id,
      };

      setSelectedPocket(budgetPocket);
      setShowEditDialog(true);
    } catch (error) {
      console.error("Error loading pocket for edit:", error);
      toast({
        title: "Error",
        description: "Failed to load pocket data.",
        variant: "destructive",
      });
    }
  };

  const handleEditSuccess = () => {
    setShowEditDialog(false);
    setSelectedPocket(null);
    queryClient.invalidateQueries({ queryKey: ["pocketSpending", user?.id, selectedMonth] });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              My Pockets
            </h1>
            <p className="text-muted-foreground">Manage your budget allocations</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            My Pockets
          </h1>
          <p className="text-muted-foreground">Manage your budget allocations</p>
        </div>
        <div className="flex items-center gap-4">
          <MonthNavigator 
            selectedMonth={selectedMonth} 
            onMonthChange={setSelectedMonth}
          />
          <Button onClick={() => setShowCreateDialog(true)} className="bg-gradient-primary hover:opacity-90">
            <Plus className="mr-2 h-4 w-4" />
            Create Pocket
          </Button>
        </div>
      </div>

      {pockets && pockets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pockets
            // Remove duplicates by pocket ID
            .filter((pocket, index, self) =>
              index === self.findIndex((p) => p.id === pocket.id)
            )
            .sort((a, b) => {
              // Sort featured pockets first
              if (a.is_featured && !b.is_featured) return -1;
              if (!a.is_featured && b.is_featured) return 1;
              return 0;
            })
            .map((pocket) => (
            <PocketCard
              key={pocket.id}
              pocket={pocket}
              currency={userCurrency}
              onClick={() => navigate(`/transactions/${pocket.id}`)}
              onEdit={() => handleEditPocket(pocket)}
              onDelete={handleDeletePocket}
              onToggleFeatured={handleToggleFeatured}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="w-24 h-24 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-glow mx-auto mb-6">
            <span className="text-3xl">💰</span>
          </div>
          <h3 className="text-xl font-semibold mb-2">No pockets yet</h3>
          <p className="text-muted-foreground mb-6">
            Create your first budget pocket to start managing your finances.
          </p>
          <Button onClick={() => setShowCreateDialog(true)} className="bg-gradient-primary hover:opacity-90">
            <Plus className="mr-2 h-4 w-4" />
            Create Your First Pocket
          </Button>
        </div>
      )}

      <CreatePocketDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={() => {
          setShowCreateDialog(false);
          queryClient.invalidateQueries({ queryKey: ["pocketSpending", user?.id, selectedMonth] });
        }}
      />

      <EditPocketDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onSuccess={handleEditSuccess}
        pocket={selectedPocket}
      />
    </div>
  );
}