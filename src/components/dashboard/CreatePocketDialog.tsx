import { useState } from "react";
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
import { format } from "date-fns";

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
  const [isTemplate, setIsTemplate] = useState(false);
  const [autoRenew, setAutoRenew] = useState(true);
  const [rolloverType, setRolloverType] = useState<'reset' | 'carry_over' | 'percentage'>('reset');
  const [rolloverPercentage, setRolloverPercentage] = useState(100);
  const [maxCarryOver, setMaxCarryOver] = useState<number | undefined>();
  
  // Additional fields for different budget types
  const [targetDate, setTargetDate] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [frequency, setFrequency] = useState("");
  const [projectDuration, setProjectDuration] = useState("");
  const [minimumPayment, setMinimumPayment] = useState("");
  const [extraPayment, setExtraPayment] = useState("");
  
  const { user } = useAuth();
  const { toast } = useToast();

  const isFormValid = (): boolean => {
    switch (budgetType) {
      case 'periodic_scheduled':
        return !!(totalAmount && frequency);
      case 'goal_based':
        return !!(totalAmount && targetDate);
      case 'project_based':
        return !!(totalAmount && projectDuration);
      case 'debt_payment':
        return !!minimumPayment;
      default:
        return !!budgetAmount;
    }
  };


  const calculateBudgetAmount = (): number => {
    switch (budgetType) {
      case 'periodic_scheduled':
        const total = parseFloat(totalAmount) || 0;
        const freq = parseFloat(frequency) || 1;
        return total / freq; // Monthly savings = total_amount / months_until_due
      
      case 'goal_based':
        const targetAmount = parseFloat(totalAmount) || 0;
        const currentSaved = 0; // Assuming starting from 0
        const targetDateObj = new Date(targetDate);
        const now = new Date();
        const monthsRemaining = Math.max(1, Math.ceil((targetDateObj.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30)));
        return (targetAmount - currentSaved) / monthsRemaining;
      
      case 'project_based':
        const projectCost = parseFloat(totalAmount) || 0;
        const duration = parseFloat(projectDuration) || 1;
        return projectCost / duration;
      
      case 'debt_payment':
        const minPayment = parseFloat(minimumPayment) || 0;
        const extraPaymentAmount = parseFloat(extraPayment) || 0;
        return minPayment + extraPaymentAmount;
      
      default:
        return parseFloat(budgetAmount) || 0;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setLoading(true);
      const calculatedBudget = calculateBudgetAmount();
      const currentMonth = format(new Date(), "yyyy-MM");
      
      const insertData = {
        user_id: user.id,
        name: name.trim(),
        description: description.trim() || null,
        budget_amount: calculatedBudget,
        cycle_type: cycleType,
        budget_type: budgetType,
        color: color,
        is_template: isTemplate,
        auto_renew: autoRenew,
        recurring_rule: isTemplate && autoRenew ? {
          type: rolloverType,
          ...(rolloverType === 'percentage' && { percentage: rolloverPercentage }),
          ...(rolloverType === 'carry_over' && maxCarryOver && { max_carry_over: maxCarryOver })
        } : null,
        month_year: isTemplate ? null : currentMonth,
        cycle_start_date: isTemplate ? null : new Date(currentMonth + '-01').toISOString().split('T')[0],
        cycle_end_date: isTemplate ? null : new Date(new Date(currentMonth + '-01').getFullYear(), new Date(currentMonth + '-01').getMonth() + 1, 0).toISOString().split('T')[0],
      };
      
      const { error } = await supabase
        .from('budget_pockets')
        .insert(insertData);

      if (error) throw error;
      
      // Reset form
      setName("");
      setDescription("");
      setBudgetAmount("");
      setCycleType("monthly");
      setBudgetType("regular_monthly");
      setColor("#8b5cf6");
      setIsTemplate(false);
      setAutoRenew(true);
      setRolloverType('reset');
      setRolloverPercentage(100);
      setMaxCarryOver(undefined);
      setTargetDate("");
      setTotalAmount("");
      setFrequency("");
      setProjectDuration("");
      setMinimumPayment("");
      setExtraPayment("");
      
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
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto bg-gradient-card border-0 shadow-xl">
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

          {/* Conditional fields based on budget type */}
          {budgetType === 'regular_monthly' || budgetType === 'emergency_irregular' || budgetType === 'seasonal' ? (
            <div className="space-y-2">
              <Label htmlFor="budget">Monthly Budget Amount</Label>
              <CurrencyInput
                id="budget"
                value={budgetAmount}
                onChange={setBudgetAmount}
                placeholder="0.00"
              />
            </div>
          ) : null}

          {budgetType === 'periodic_scheduled' ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="totalAmount">Total Amount</Label>
                <CurrencyInput
                  id="totalAmount"
                  value={totalAmount}
                  onChange={setTotalAmount}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="frequency">Months Until Due</Label>
                <Input
                  id="frequency"
                  type="text"
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value.replace(/[^\d]/g, ''))}
                  placeholder="12"
                />
              </div>
            </div>
          ) : null}

          {budgetType === 'goal_based' ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="targetAmount">Target Amount</Label>
                <CurrencyInput
                  id="targetAmount"
                  value={totalAmount}
                  onChange={setTotalAmount}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="targetDate">Target Date</Label>
                <Input
                  id="targetDate"
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                />
              </div>
            </div>
          ) : null}

          {budgetType === 'project_based' ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="projectCost">Total Project Cost</Label>
                <CurrencyInput
                  id="projectCost"
                  value={totalAmount}
                  onChange={setTotalAmount}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (Months)</Label>
                <Input
                  id="duration"
                  type="text"
                  value={projectDuration}
                  onChange={(e) => setProjectDuration(e.target.value.replace(/[^\d]/g, ''))}
                  placeholder="12"
                />
              </div>
            </div>
          ) : null}

          {budgetType === 'debt_payment' ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="minPayment">Minimum Payment</Label>
                <CurrencyInput
                  id="minPayment"
                  value={minimumPayment}
                  onChange={setMinimumPayment}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="extraPayment">Extra Payment</Label>
                <CurrencyInput
                  id="extraPayment"
                  value={extraPayment}
                  onChange={setExtraPayment}
                  placeholder="0.00"
                />
              </div>
            </div>
          ) : null}

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
                <Label htmlFor="is-template" className="text-sm">Create as Template</Label>
                <p className="text-xs text-muted-foreground">
                  Templates can be used to generate monthly pockets automatically
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

            {isTemplate && autoRenew && (
              <div className="space-y-4">
                <h4 className="font-medium">Rollover Rules</h4>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="rollover-type">When unused budget remains</Label>
                    <Select value={rolloverType} onValueChange={(value: 'reset' | 'carry_over' | 'percentage') => setRolloverType(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="reset">Reset to zero (don't carry over)</SelectItem>
                        <SelectItem value="carry_over">Carry over full unused amount</SelectItem>
                        <SelectItem value="percentage">Carry over percentage of unused</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {rolloverType === 'percentage' && (
                    <div>
                      <Label htmlFor="rollover-percentage">Percentage to carry over (%)</Label>
                      <Input
                        id="rollover-percentage"
                        type="number"
                        min="0"
                        max="100"
                        value={rolloverPercentage}
                        onChange={(e) => setRolloverPercentage(Number(e.target.value))}
                      />
                    </div>
                  )}

                  {rolloverType === 'carry_over' && (
                    <div>
                      <Label htmlFor="max-carry-over">Maximum carry over amount (optional)</Label>
                      <CurrencyInput
                        id="max-carry-over"
                        value={maxCarryOver?.toString() || ""}
                        onChange={(value) => setMaxCarryOver(value ? parseFloat(value) : undefined)}
                        placeholder="No limit"
                      />
                    </div>
                  )}
                </div>
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
            <Button type="submit" variant="hero" disabled={loading || !name.trim() || !isFormValid()}>
              {loading ? "Creating..." : isTemplate ? "Create Template" : "Create Pocket"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}