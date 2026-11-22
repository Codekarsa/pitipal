import { useEffect, useState } from "react";
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
import { withRetry, handleError } from "@/lib/error-utils";
import { endOfMonth, format, parseISO, startOfMonth } from "date-fns";
import { analytics } from "@/lib/analytics";
import { useQueryClient } from "@tanstack/react-query";

interface CreatePocketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  targetMonth?: string;
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

export function CreatePocketDialog({ open, onOpenChange, onSuccess, targetMonth = format(new Date(), 'yyyy-MM') }: CreatePocketDialogProps) {
  const [budgetMonth, setBudgetMonth] = useState(targetMonth);
  useEffect(() => { if (open) setBudgetMonth(targetMonth); }, [open, targetMonth]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [budgetAmount, setBudgetAmount] = useState("");
  const [cycleType, setCycleType] = useState("monthly");
  const [budgetType, setBudgetType] = useState("regular_monthly");
  const [pocketType, setPocketType] = useState<"expense" | "income" | "investment">("expense");
  const [color, setColor] = useState("#8b5cf6");
  const [loading, setLoading] = useState(false);
  const [isTemplate, setIsTemplate] = useState(true);
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
  const queryClient = useQueryClient();
  const currency = queryClient.getQueryData<{ currency?: string }>(["profile", user?.id])?.currency ?? 'USD';

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
      const now = parseISO(`${budgetMonth}-01`);
      const currentMonth = budgetMonth;
      if (!Number.isFinite(calculatedBudget) || calculatedBudget <= 0 || !budgetMonth) throw new Error('Enter a positive monthly budget and choose a month.');
      
      const insertData = {
        user_id: user.id,
        name: name.trim(),
        description: description.trim() || null,
        budget_amount: calculatedBudget,
        base_budget_amount: calculatedBudget,
        carried_over_amount: 0,
        cycle_type: cycleType,
        budget_type: budgetType,
        pocket_type: pocketType,
        color: color,
        is_template: isTemplate,
        auto_renew: isTemplate,
        recurring_rule: isTemplate ? {
          type: rolloverType,
          ...(rolloverType === 'percentage' && { percentage: rolloverPercentage }),
          ...(rolloverType === 'carry_over' && maxCarryOver !== undefined && { max_carry_over: maxCarryOver })
        } : null,
        month_year: isTemplate ? null : currentMonth,
        cycle_start_date: format(startOfMonth(now), 'yyyy-MM-dd'),
        cycle_end_date: isTemplate ? null : format(endOfMonth(now), 'yyyy-MM-dd'),
      };

      // Insert the recurring definition and this month's usable pocket atomically.
      const templateId = crypto.randomUUID();
      const monthlyPocket = {
        ...insertData,
        id: crypto.randomUUID(),
        parent_pocket_id: isTemplate ? templateId : null,
        is_template: false,
        month_year: currentMonth,
        cycle_start_date: format(startOfMonth(now), 'yyyy-MM-dd'),
        cycle_end_date: format(endOfMonth(now), 'yyyy-MM-dd'),
      };

      await withRetry(async () => {
        const { error } = await supabase
          .from('budget_pockets')
          .insert(isTemplate ? [
            { ...insertData, id: templateId, parent_pocket_id: null },
            monthlyPocket,
          ] : [monthlyPocket]);

        if (error) throw error;
      }, 3);
      
      // Reset form
      setName("");
      setDescription("");
      setBudgetAmount("");
      setCycleType("monthly");
      setBudgetType("regular_monthly");
      setPocketType("expense");
      setColor("#8b5cf6");
      setIsTemplate(true);
      setRolloverType('reset');
      setRolloverPercentage(100);
      setMaxCarryOver(undefined);
      setTargetDate("");
      setTotalAmount("");
      setFrequency("");
      setProjectDuration("");
      setMinimumPayment("");
      setExtraPayment("");

      toast({
        title: "Success",
        description: `Pocket created for ${format(now, 'MMMM yyyy')}${isTemplate ? ' and set to repeat monthly' : ' only'}`,
      });

      analytics.trackPocketCreated(budgetType);
      queryClient.invalidateQueries({ queryKey: ["setupProgress", user.id] });
      queryClient.invalidateQueries({ queryKey: ["pocketSpending", user.id] });
      onSuccess();
    } catch (error: any) {
      handleError(error, "Failed to create pocket. Please check your inputs and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Create Budget Pocket</DialogTitle>
          <DialogDescription>
            A pocket is a spending limit, like groceries or transport. Start with a name and monthly amount.
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
            <Label htmlFor="budget-month">Budget month</Label>
            <Input id="budget-month" type="month" value={budgetMonth} onChange={e => setBudgetMonth(e.target.value)} required />
          </div>
          {['regular_monthly', 'emergency_irregular', 'seasonal'].includes(budgetType) && (
            <div className="space-y-2">
              <Label htmlFor="budget">Monthly Budget Amount</Label>
              <p className="text-xs text-muted-foreground">Amount in {currency}</p>
              <CurrencyInput id="budget" value={budgetAmount} onChange={setBudgetAmount} placeholder="Enter monthly amount" inputMode="decimal" required />
            </div>
          )}
          <p className="text-sm text-muted-foreground">{isTemplate ? 'Repeats every month. Unused allowance starts fresh unless you choose rollover below.' : 'One month only. This pocket will not repeat.'}</p>
          <details className="rounded-lg border p-3">
            <summary className="cursor-pointer text-sm font-medium">Advanced: type, color and rollover</summary>
            <div className="mt-4 space-y-4">
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
            <Label htmlFor="pocketType">Transaction Type *</Label>
            <Select value={pocketType} onValueChange={(value: "expense" | "income" | "investment") => setPocketType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expense">
                  <div className="flex items-center space-x-2">
                    <span className="text-red-500">📤</span>
                    <div>
                      <div className="font-medium">Expense</div>
                      <div className="text-xs text-muted-foreground">For spending and outgoing money</div>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="income">
                  <div className="flex items-center space-x-2">
                    <span className="text-green-500">📥</span>
                    <div>
                      <div className="font-medium">Income</div>
                      <div className="text-xs text-muted-foreground">For earnings and incoming money</div>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="investment">
                  <div className="flex items-center space-x-2">
                    <span className="text-blue-500">📈</span>
                    <div>
                      <div className="font-medium">Investment</div>
                      <div className="text-xs text-muted-foreground">For investment transactions and portfolio tracking</div>
                    </div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="budgetType">Budget Type</Label>
            <Select value={budgetType} onValueChange={setBudgetType}>
              <SelectTrigger id="budgetType">
                <SelectValue>{budgetTypeOptions.find(option => option.value === budgetType)?.label}</SelectValue>
              </SelectTrigger>
              <SelectContent className="w-[var(--radix-select-trigger-width)] max-w-[calc(100vw-2rem)]">
                {budgetTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex flex-col whitespace-normal">
                      <span className="font-medium">{option.label}</span>
                      <span className="text-xs text-muted-foreground">{option.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Conditional fields based on budget type */}

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
                <Label htmlFor="is-template" className="text-sm">Repeat every month</Label>
                <p className="text-xs text-muted-foreground">
                  Repeat from the selected month. Turn off to plan this month only.
                </p>
              </div>
              <Switch
                id="is-template"
                checked={isTemplate}
                onCheckedChange={setIsTemplate}
              />
            </div>

            {isTemplate && (
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
                        <SelectItem value="reset">Start fresh — keep only the new month's base budget</SelectItem>
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

            <p className="text-xs text-muted-foreground">Carryover adds allowance, not income. A 3M base plus 1M unused gives 4M next month. Future carry is confirmed when that month starts.</p>
            </div>
          </details>
          <DialogFooter className="gap-2 sticky -bottom-5 -mx-5 -mb-5 px-5 py-4 border-t bg-card sm:-bottom-6 sm:-mx-6 sm:-mb-6 sm:px-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" variant="hero" disabled={loading || !name.trim() || !isFormValid()}>
              {loading ? "Creating..." : "Create Pocket"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
