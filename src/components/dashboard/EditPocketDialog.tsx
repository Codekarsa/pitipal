import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useAuth } from "@/components/auth/useAuth";
import { useToast } from "@/hooks/use-toast";

interface BudgetPocket {
  id: string;
  name: string;
  description: string | null;
  budget_amount: number;
  base_budget_amount?: number | null;
  carried_over_amount?: number | null;
  parent_pocket_id?: string | null;
  month_year?: string | null;
  recurring_rule?: unknown;
  budget_type: string;
  pocket_type: string;
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
  {
    value: "regular_monthly",
    label: "Regular Monthly",
    description: "Simple monthly allocation",
  },
  {
    value: "periodic_scheduled",
    label: "Periodic/Scheduled",
    description: "Divide total by months",
  },
  {
    value: "goal_based",
    label: "Goal-Based",
    description: "Target amount by target date",
  },
  {
    value: "emergency_irregular",
    label: "Emergency/Irregular",
    description: "Estimate based on risk",
  },
  { value: "seasonal", label: "Seasonal", description: "Save throughout year" },
  {
    value: "project_based",
    label: "Project-Based",
    description: "Total cost over timeline",
  },
  {
    value: "debt_payment",
    label: "Debt Payment",
    description: "Minimum + extra payments",
  },
];

function readRule(value: unknown): Record<string, Json | undefined> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, Json | undefined>)
    : {};
}

export function EditPocketDialog({
  open,
  onOpenChange,
  onSuccess,
  pocket,
}: EditPocketDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [budgetAmount, setBudgetAmount] = useState("");
  const [budgetType, setBudgetType] = useState("regular_monthly");
  const [pocketType, setPocketType] = useState<
    "expense" | "income" | "investment"
  >("expense");
  const [color, setColor] = useState("#8b5cf6");
  const [applyToFuture, setApplyToFuture] = useState(false);
  const [rolloverType, setRolloverType] = useState<
    "reset" | "carry_over" | "percentage"
  >("reset");
  const [rolloverPercentage, setRolloverPercentage] = useState(100);
  const [maxCarryOver, setMaxCarryOver] = useState<number | undefined>();
  const [loading, setLoading] = useState(false);
  const saving = useRef(false);
  const queryClient = useQueryClient();

  const { user } = useAuth();
  const { toast } = useToast();

  // Populate form when pocket data is available
  useEffect(() => {
    if (pocket && open) {
      setName(pocket.name);
      setDescription(pocket.description || "");
      setBudgetAmount(
        String(
          pocket.base_budget_amount ??
            pocket.budget_amount - (pocket.carried_over_amount ?? 0),
        ),
      );
      setBudgetType(pocket.budget_type);
      setPocketType(
        (pocket.pocket_type as "expense" | "income" | "investment") ||
          "expense",
      );
      setColor(pocket.color);
      setApplyToFuture(false);

      // Load rollover rules
      const rule = readRule(pocket.recurring_rule);
      if (Object.keys(rule).length) {
        setRolloverType(
          rule.type === "carry_over" || rule.type === "percentage"
            ? rule.type
            : "reset",
        );
        setRolloverPercentage(
          typeof rule.percentage === "number" ? rule.percentage : 100,
        );
        setMaxCarryOver(
          typeof rule.max_carry_over === "number"
            ? rule.max_carry_over
            : undefined,
        );
      } else {
        setRolloverType("reset");
        setRolloverPercentage(100);
        setMaxCarryOver(undefined);
      }
    }
  }, [pocket, open]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setName("");
      setDescription("");
      setBudgetAmount("");
      setBudgetType("regular_monthly");
      setPocketType("expense");
      setColor("#8b5cf6");
      setApplyToFuture(false);
      setRolloverType("reset");
      setRolloverPercentage(100);
      setMaxCarryOver(undefined);
    }
  }, [open]);

  const carry = pocket?.carried_over_amount ?? 0;
  const initialBase =
    pocket?.base_budget_amount ?? (pocket?.budget_amount ?? 0) - carry;
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const isMonthly = !!pocket?.month_year && !pocket.is_template;
  const isPast = isMonthly && pocket.month_year < currentMonth;
  const isEditable = isMonthly && !isPast;
  const canApplyToFuture = isEditable;
  const rule = readRule(pocket?.recurring_rule);
  const originalRolloverType =
    rule.type === "carry_over" || rule.type === "percentage"
      ? rule.type
      : "reset";
  const rolloverChanged =
    rolloverType !== originalRolloverType ||
    (rolloverType === "percentage" &&
      rolloverPercentage !==
        (typeof rule.percentage === "number" ? rule.percentage : 100)) ||
    (rolloverType === "carry_over" &&
      maxCarryOver !==
        (typeof rule.max_carry_over === "number"
          ? rule.max_carry_over
          : undefined));
  const metadataChanged =
    !!pocket &&
    (name.trim() !== pocket.name ||
      (description.trim() || null) !== pocket.description ||
      budgetType !== pocket.budget_type ||
      pocketType !== pocket.pocket_type ||
      color !== pocket.color ||
      rolloverChanged);
  const validAmount =
    budgetAmount.trim() !== "" &&
    Number.isFinite(Number(budgetAmount)) &&
    Number(budgetAmount) >= 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !pocket || !isEditable || !validAmount || saving.current)
      return;
    if (applyToFuture && (!canApplyToFuture || metadataChanged)) return;
    if (
      !Number.isFinite(rolloverPercentage) ||
      rolloverPercentage < 0 ||
      rolloverPercentage > 100 ||
      (maxCarryOver !== undefined &&
        (!Number.isFinite(maxCarryOver) || maxCarryOver < 0))
    )
      return;

    saving.current = true;
    let budgetSaved = false;
    try {
      setLoading(true);
      if (Number(budgetAmount) !== initialBase || applyToFuture) {
        // The amount RPC preserves carry and applies effective-dated future defaults.
        const { error } = await supabase.rpc("set_monthly_pocket_budget", {
          pocket_id: pocket.id,
          base_amount: Number(budgetAmount),
          apply_to_future: applyToFuture,
        });
        if (error) throw error;
        budgetSaved = true;
      }

      // Metadata is deliberately month-only. A budget-only RPC cannot atomically
      // propagate metadata/rules through a series, so future scope locks these fields.
      if (metadataChanged && !applyToFuture) {
        const { error } = await supabase
          .from("budget_pockets")
          .update({
            name: name.trim(),
            description: description.trim() || null,
            budget_type: budgetType,
            pocket_type: pocketType,
            color,
            ...(rolloverChanged && {
              recurring_rule: {
                ...rule,
                type: rolloverType,
                ...(rolloverType === "percentage" && {
                  percentage: rolloverPercentage,
                }),
                max_carry_over:
                  rolloverType === "carry_over" ? (maxCarryOver ?? null) : null,
              },
            }),
          })
          .eq("id", pocket.id)
          .eq("user_id", user.id)
          .eq("is_template", false)
          .eq("month_year", pocket.month_year)
          .select("id")
          .single();

        if (error) throw error;
      }

      toast({
        title: "Pocket updated",
        description: applyToFuture
          ? "Base budget updated for this and future months. Details and rollover rules are unchanged."
          : "This month's pocket has been updated. Other months are unchanged.",
      });

      onSuccess();
    } catch (error: unknown) {
      toast({
        title: budgetSaved
          ? "Budget saved; details were not saved"
          : "Error updating pocket",
        description: `${budgetSaved ? "Your base budget was saved. Retry to save this month’s details. " : ""}${error && typeof error === "object" && "message" in error ? String(error.message) : "Please try again."}`,
        variant: "destructive",
      });
    } finally {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["pocketSpending"] }),
        queryClient.invalidateQueries({ queryKey: ["planning-source"] }),
      ]);
      saving.current = false;
      setLoading(false);
    }
  };

  if (!pocket) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!saving.current) onOpenChange(nextOpen);
      }}
    >
      <DialogContent
        className={`sm:max-w-[480px] bg-gradient-card border-0 shadow-xl max-h-[90vh] overflow-y-auto ${loading ? "[&>button]:pointer-events-none [&>button]:opacity-40" : ""}`}
        onEscapeKeyDown={(event) => {
          if (saving.current) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (saving.current) event.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Edit Budget Pocket
          </DialogTitle>
          <DialogDescription>
            Edit {pocket.name} for {pocket.month_year ?? "the selected month"}.
            Your carried allowance is preserved.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4" aria-busy={loading}>
          {isPast && (
            <p role="status" className="rounded-lg bg-muted p-3 text-sm">
              Past months are read-only to preserve your historical budget and
              carried allowance. Select the current or a future month to make
              changes.
            </p>
          )}
          <fieldset
            disabled={loading || !isEditable}
            className="space-y-4 min-w-0"
          >
            {!isMonthly && (
              <p role="alert">
                Select a monthly pocket, not a recurring template, to edit its
                budget.
              </p>
            )}
            <div className="space-y-2">
              <Label htmlFor="edit-budget-scope">Budget edit scope</Label>
              <Select
                value={applyToFuture ? "future" : "month"}
                onValueChange={(value) => setApplyToFuture(value === "future")}
                disabled={loading || !isEditable}
              >
                <SelectTrigger id="edit-budget-scope">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">This month only</SelectItem>
                  {canApplyToFuture && (
                    <SelectItem value="future" disabled={metadataChanged}>
                      This month and future months
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {applyToFuture
                  ? "Only the base budget changes across months. Names, types, colors, recurrence and rollover rules stay unchanged."
                  : canApplyToFuture
                    ? "Only this month changes. Choose future scope to change the recurring base budget too."
                    : isPast
                      ? "Past months are read-only."
                      : "This pocket can only be edited one month at a time."}
              </p>
              {metadataChanged && canApplyToFuture && (
                <p className="text-xs text-muted-foreground">
                  Save this month's detail changes before editing future base
                  budgets.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="budget">Monthly base budget</Label>
              <CurrencyInput
                id="budget"
                value={budgetAmount}
                onChange={setBudgetAmount}
                placeholder="0.00"
                required
                aria-describedby="base-carry-explanation"
              />
              <p
                id="base-carry-explanation"
                className="text-sm text-muted-foreground"
              >
                Base {validAmount ? Number(budgetAmount).toLocaleString() : "—"}{" "}
                + carried allowance {carry.toLocaleString()} = total allowance{" "}
                {validAmount
                  ? (Number(budgetAmount) + carry).toLocaleString()
                  : "—"}
                . Changing the base does not remove money carried into this
                month.
              </p>
            </div>
            <details className="rounded-lg border p-3">
              <summary className="cursor-pointer font-medium">
                Advanced: this month's details and rollover
              </summary>
              <p className="my-3 text-xs text-muted-foreground">
                These settings affect the selected monthly row only, never the
                recurring template or other generated months.
                {applyToFuture &&
                  " Switch to “This month only” to edit them."}{" "}
                Monthly recurrence itself is unchanged here. Base budget and
                detail changes are saved separately; if details fail, a saved
                budget is kept.
              </p>
              <fieldset
                disabled={applyToFuture || loading}
                className="space-y-4 min-w-0"
              >
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
                  <Label htmlFor="pocketType">Transaction Type *</Label>
                  <Select
                    disabled={applyToFuture || loading || !isEditable}
                    value={pocketType}
                    onValueChange={(
                      value: "expense" | "income" | "investment",
                    ) => setPocketType(value)}
                  >
                    <SelectTrigger id="pocketType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="expense">
                        <div className="flex items-center space-x-2">
                          <span className="text-red-500">📤</span>
                          <div>
                            <div className="font-medium">Expense</div>
                            <div className="text-xs text-muted-foreground">
                              For spending and outgoing money
                            </div>
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="income">
                        <div className="flex items-center space-x-2">
                          <span className="text-green-500">📥</span>
                          <div>
                            <div className="font-medium">Income</div>
                            <div className="text-xs text-muted-foreground">
                              For earnings and incoming money
                            </div>
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="investment">
                        <div className="flex items-center space-x-2">
                          <span className="text-blue-500">📈</span>
                          <div>
                            <div className="font-medium">Investment</div>
                            <div className="text-xs text-muted-foreground">
                              For investment transactions and portfolio tracking
                            </div>
                          </div>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="budgetType">Budget Type</Label>
                  <Select
                    disabled={applyToFuture || loading || !isEditable}
                    value={budgetType}
                    onValueChange={setBudgetType}
                  >
                    <SelectTrigger id="budgetType">
                      <SelectValue>
                        {
                          budgetTypeOptions.find(
                            (option) => option.value === budgetType,
                          )?.label
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="w-[var(--radix-select-trigger-width)] max-w-[calc(100vw-2rem)]">
                      {budgetTypeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex flex-col whitespace-normal">
                            <span className="font-medium">{option.label}</span>
                            <span className="text-xs text-muted-foreground">
                              {option.description}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                          color === option.value
                            ? "border-primary scale-110"
                            : "border-border"
                        }`}
                        style={{ backgroundColor: option.value }}
                        title={option.name}
                        aria-label={`${option.name} pocket color`}
                        aria-pressed={color === option.value}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                  <div>
                    <h4 className="text-sm font-semibold mb-1">
                      This month's outgoing rollover
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Used when generating the following month; already
                      generated allowances are not recalculated.
                    </p>
                  </div>
                  <div className="space-y-3 pt-2">
                    <div>
                      <Label
                        htmlFor="rollover-type"
                        className="text-sm font-medium"
                      >
                        Leftover budget handling
                      </Label>
                      <p className="text-xs text-muted-foreground mb-2">
                        What to do with unspent money at month end
                      </p>
                      <Select
                        disabled={applyToFuture || loading || !isEditable}
                        value={rolloverType}
                        onValueChange={(
                          value: "reset" | "carry_over" | "percentage",
                        ) => setRolloverType(value)}
                      >
                        <SelectTrigger id="rollover-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="reset">
                            <div className="flex flex-col">
                              <span className="font-medium">Start fresh</span>
                              <span className="text-xs text-muted-foreground">
                                Don't carry over unused budget
                              </span>
                            </div>
                          </SelectItem>
                          <SelectItem value="carry_over">
                            <div className="flex flex-col">
                              <span className="font-medium">Roll over all</span>
                              <span className="text-xs text-muted-foreground">
                                Add all unused budget to next month
                              </span>
                            </div>
                          </SelectItem>
                          <SelectItem value="percentage">
                            <div className="flex flex-col">
                              <span className="font-medium">
                                Roll over partial
                              </span>
                              <span className="text-xs text-muted-foreground">
                                Add a % of unused budget to next month
                              </span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {rolloverType === "percentage" && (
                      <div>
                        <Label htmlFor="rollover-percentage">
                          Percentage to roll over
                        </Label>
                        <div className="flex items-center gap-2">
                          <Input
                            id="rollover-percentage"
                            type="number"
                            min="0"
                            max="100"
                            value={rolloverPercentage}
                            onChange={(e) =>
                              setRolloverPercentage(Number(e.target.value))
                            }
                          />
                          <span className="text-sm text-muted-foreground">
                            %
                          </span>
                        </div>
                      </div>
                    )}

                    {rolloverType === "carry_over" && (
                      <div>
                        <Label htmlFor="max-carry-over">
                          Maximum rollover amount (optional)
                        </Label>
                        <CurrencyInput
                          id="max-carry-over"
                          value={maxCarryOver?.toString() || ""}
                          onChange={(value) =>
                            setMaxCarryOver(
                              value ? parseFloat(value) : undefined,
                            )
                          }
                          placeholder="No limit"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Leave empty for unlimited rollover
                        </p>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Example: with a base of 1,000 and 200 left over, the next
                      month's allowance is{" "}
                      {(
                        1000 +
                        (rolloverType === "reset"
                          ? 0
                          : rolloverType === "percentage"
                            ? (200 * rolloverPercentage) / 100
                            : Math.min(200, maxCarryOver ?? 200))
                      ).toLocaleString()}
                      . Zero percent or a maximum of 0 means nothing rolls over.
                    </p>
                  </div>
                </div>
              </fieldset>
            </details>
          </fieldset>
          <DialogFooter className="sticky -bottom-6 z-10 gap-2 border-t bg-background py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="hero"
              disabled={loading || !name.trim() || !validAmount || !isEditable}
            >
              {loading ? "Updating..." : "Update Pocket"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
