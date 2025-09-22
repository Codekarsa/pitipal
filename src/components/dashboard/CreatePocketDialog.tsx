import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/useAuth";
import { useToast } from "@/hooks/use-toast";

interface CreatePocketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const colorOptions = [
  { name: "Purple", value: "#8b5cf6" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Green", value: "#10b981" },
  { name: "Yellow", value: "#f59e0b" },
  { name: "Red", value: "#ef4444" },
  { name: "Pink", value: "#ec4899" },
  { name: "Indigo", value: "#6366f1" },
  { name: "Teal", value: "#14b8a6" },
];

const budgetTypeOptions = [
  { value: "regular_monthly", label: "Regular Monthly", description: "Simple monthly allocation (groceries, utilities, gas)" },
  { value: "periodic_scheduled", label: "Periodic/Scheduled", description: "Divide total by months (insurance, property tax)" },
  { value: "goal_based", label: "Goal-Based", description: "Target amount by target date (vacation, new car)" },
  { value: "emergency_irregular", label: "Emergency/Irregular", description: "Estimate based on risk (car repairs, medical)" },
  { value: "seasonal", label: "Seasonal", description: "Save throughout year (holiday gifts, heating)" },
  { value: "project_based", label: "Project-Based", description: "Total cost over timeline (renovation, education)" },
  { value: "debt_payment", label: "Debt Payment", description: "Minimum + extra payments (credit cards, loans)" },
];

export function CreatePocketDialog({ open, onOpenChange, onSuccess }: CreatePocketDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [budgetAmount, setBudgetAmount] = useState("");
  const [cycleType, setCycleType] = useState("monthly");
  const [budgetType, setBudgetType] = useState("regular_monthly");
  const [color, setColor] = useState("#8b5cf6");
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleBudgetAmountChange = (value: string) => {
    // Remove any non-numeric characters except decimal point
    const cleanValue = value.replace(/[^\d.]/g, '');
    
    // Ensure only one decimal point
    const parts = cleanValue.split('.');
    if (parts.length > 2) {
      return;
    }
    
    // Format with thousands separator for display
    const numericValue = parseFloat(cleanValue);
    if (!isNaN(numericValue)) {
      setBudgetAmount(cleanValue);
    } else if (cleanValue === '') {
      setBudgetAmount('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('budget_pockets')
        .insert({
          user_id: user.id,
          name: name.trim(),
          description: description.trim() || null,
          budget_amount: parseFloat(budgetAmount) || 0,
          cycle_type: cycleType,
          budget_type: budgetType,
          color: color,
        });

      if (error) throw error;
      
      // Reset form
      setName("");
      setDescription("");
      setBudgetAmount("");
      setCycleType("monthly");
      setBudgetType("regular_monthly");
      setColor("#8b5cf6");
      
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error creating pocket",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-gradient-card border-0 shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Create Budget Pocket</DialogTitle>
          <DialogDescription>
            Create a new budget category to organize your spending and track your goals.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Pocket Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Groceries, Entertainment, Savings"
              required
              maxLength={50}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description for this pocket"
              maxLength={200}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="budgetType">Budget Type</Label>
            <Select value={budgetType} onValueChange={setBudgetType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {budgetTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex flex-col">
                      <span className="font-medium">{option.label}</span>
                      <span className="text-xs text-muted-foreground">{option.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="budget">Budget Amount</Label>
              <Input
                id="budget"
                type="text"
                value={budgetAmount}
                onChange={(e) => handleBudgetAmountChange(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cycle">Budget Cycle</Label>
              <Select value={cycleType} onValueChange={setCycleType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex gap-2 flex-wrap">
              {colorOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setColor(option.value)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    color === option.value ? 'border-primary scale-110' : 'border-border'
                  }`}
                  style={{ backgroundColor: option.value }}
                  title={option.name}
                />
              ))}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" variant="hero" disabled={loading || !name.trim()}>
              {loading ? "Creating..." : "Create Pocket"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}