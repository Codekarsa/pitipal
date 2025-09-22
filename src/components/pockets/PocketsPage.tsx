import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/useAuth";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { PocketCard } from "@/components/dashboard/PocketCard";
import { CreatePocketDialog } from "@/components/dashboard/CreatePocketDialog";
import { useToast } from "@/hooks/use-toast";

export function PocketsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const { data: pockets, isLoading } = useQuery({
    queryKey: ["pockets", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from("budget_pockets")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching pockets:", error);
        throw error;
      }

      return data || [];
    },
    enabled: !!user?.id,
  });

  const handleDeletePocket = async (pocketId: string) => {
    try {
      const { error } = await supabase
        .from("budget_pockets")
        .update({ is_active: false })
        .eq("id", pocketId)
        .eq("user_id", user?.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["pockets"] });
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

      const { error } = await supabase
        .from("budget_pockets")
        .update({ is_featured: !currentPocket.is_featured })
        .eq("id", pocketId)
        .eq("user_id", user?.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["pockets"] });
      toast({
        title: currentPocket.is_featured ? "Pocket unfeatured" : "Pocket featured",
        description: `"${currentPocket.name}" has been ${currentPocket.is_featured ? 'removed from' : 'added to'} featured pockets.`,
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            My Pockets
          </h1>
          <p className="text-muted-foreground">Manage your budget allocations</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="bg-gradient-primary hover:opacity-90">
          <Plus className="mr-2 h-4 w-4" />
          Create Pocket
        </Button>
      </div>

      {pockets && pockets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pockets
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
        onSuccess={() => setShowCreateDialog(false)}
      />
    </div>
  );
}