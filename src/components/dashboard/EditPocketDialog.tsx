import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/useAuth";
import { useToast } from "@/hooks/use-toast";

interface BudgetPocket {
  id: string;
  name: string;
  description: string | null;
  budget_amount: number;
  budget_type: string;
  color: string;
  is_template: boolean;
  auto_renew: boolean;
}

interface EditPocketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  pocket: BudgetPocket | null;
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
  { value: "regular_monthly", label: "Regular Monthly", description: "Simple monthly allocation" },
  { value: "periodic_scheduled", label: "Periodic/Scheduled", description: "Divide total by months" },
  { value: "goal_based", label: "Goal-Based", description: "Target amount by target date" },
  { value: "emergency_irregular", label: "Emergency/Irregular", description: "Estimate based on risk" },
  { value: "seasonal", label: "Seasonal", description: "Save throughout year" },
  { value: "project_based", label: "Project-Based", description: "Total cost over timeline" },
  { value: "debt_payment", label: "Debt Payment", description: "Minimum + extra payments" },
];

export function EditPocketDialog({ open, onOpenChange, onSuccess, pocket }: EditPocketDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [budgetAmount, setBudgetAmount] = useState("");
  const [budgetType, setBudgetType] = useState("regular_monthly");
  const [color, setColor] = useState("#8b5cf6");
  const [isTemplate, setIsTemplate] = useState(false);
  const [autoRenew, setAutoRenew] = useState(true);
  const [loading, setLoading] = useState(false);
  
  const { user } = useAuth();
  const { toast } = useToast();

  // Populate form when pocket data is available
  useEffect(() => {
    if (pocket && open) {
      setName(pocket.name);
      setDescription(pocket.description || "");
      setBudgetAmount(pocket.budget_amount.toString());
      setBudgetType(pocket.budget_type);
      setColor(pocket.color);
      setIsTemplate(pocket.is_template);
      setAutoRenew(pocket.auto_renew);
    }
  }, [pocket, open]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setName("");
      setDescription("");
      setBudgetAmount("");
      setBudgetType("regular_monthly");
      setColor("#8b5cf6");
      setIsTemplate(false);
      setAutoRenew(true);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !pocket) return;

    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('budget_pockets')
        .update({
          name: name.trim(),
          description: description.trim() || null,
          budget_amount: parseFloat(budgetAmount) || 0,
          budget_type: budgetType,
          color: color,
          is_template: isTemplate,
          auto_renew: autoRenew,
        })
        .eq('id', pocket.id)
        .eq('user_id', user.id);

      if (error) throw error;
      
      toast({
        title: "Pocket updated",
        description: "Your budget pocket has been updated successfully.",
      });
      
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error updating pocket",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!pocket) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-gradient-card border-0 shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Edit Budget Pocket</DialogTitle>
          <DialogDescription>
            Update your budget pocket settings and preferences.
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

          <div className="space-y-2">
            <Label htmlFor="budget">Monthly Budget Amount</Label>
            <CurrencyInput
              id="budget"
              value={budgetAmount}
              onChange={setBudgetAmount}
              placeholder="0.00"
            />
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

          {/* Template Options */}
          <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
            <h4 className="text-sm font-medium">Recurring Options</h4>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="is-template" className="text-sm">Template Mode</Label>
                <p className="text-xs text-muted-foreground">
                  Templates can be used to generate monthly pockets
                </p>
              </div>
              <Switch
                id="is-template"
                checked={isTemplate}
                onCheckedChange={setIsTemplate}
              />
            </div>

            {isTemplate && (
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-renew" className="text-sm">Auto-renewal</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically create new instances each month
                  </p>
                </div>
                <Switch
                  id="auto-renew"
                  checked={autoRenew}
                  onCheckedChange={setAutoRenew}
                />
              </div>
            )}
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
              {loading ? "Updating..." : "Update Pocket"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}