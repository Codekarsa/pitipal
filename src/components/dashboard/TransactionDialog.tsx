import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Combobox } from "@/components/ui/combobox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/useAuth";
import { useToast } from "@/hooks/use-toast";

interface BudgetPocket {
  id: string;
  name: string;
  color: string;
  pocket_type: string;
}

interface Category {
  id: string;
  name: string;
  type: string;
  icon: string;
  category_group_id?: string;
  category_groups?: {
    name: string;
  };
}

interface ComboboxOption {
  value: string;
  label: string;
  group?: string;
}

interface TransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  pockets: BudgetPocket[];
}

export function TransactionDialog({ open, onOpenChange, onSuccess, pockets }: TransactionDialogProps) {
  const [type, setType] = useState<"income" | "expense">("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [pocketId, setPocketId] = useState("");
  const [payee, setPayee] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [payees, setPayees] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchCategories();
      fetchPayees();
    }
  }, [open, type]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select(`
          *,
          category_groups (
            name
          )
        `)
        .eq('type', type)
        .order('name');

      if (error) throw error;
      setCategories(data || []);
      
      // Auto-select first category if none selected
      if (data && data.length > 0 && !category) {
        setCategory(data[0].name);
      }
    } catch (error: any) {
      toast({
        title: "Error loading categories",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const fetchPayees = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('description')
        .eq('user_id', user?.id)
        .not('description', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Extract unique payees from descriptions
      const uniquePayees = [...new Set(
        data
          ?.map(t => t.description?.trim())
          .filter(Boolean) || []
      )].slice(0, 20); // Limit to 20 recent payees
      
      setPayees(uniquePayees);
    } catch (error: any) {
      console.error('Error loading payees:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setLoading(true);
      
      // Create transaction
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          pocket_id: pocketId || null,
          amount: parseFloat(amount),
          type: type,
          category: category,
          description: payee.trim() || description.trim() || null,
          transaction_date: date,
          ai_categorized: false,
          ai_confidence: 0,
        });

      if (transactionError) throw transactionError;

      // Update pocket current amount if pocket is selected
      if (pocketId) {
        // Get current pocket amount first
        const { data: pocketData, error: fetchError } = await supabase
          .from('budget_pockets')
          .select('current_amount')
          .eq('id', pocketId)
          .single();

        if (fetchError) {
          console.error('Error fetching pocket data:', fetchError);
        } else {
          // For expenses, add to current_amount (money spent from budget)
          // For income, subtract from current_amount (adding money back to budget)
          const amountChange = type === 'expense' ? parseFloat(amount) : -parseFloat(amount);
          const newAmount = (pocketData.current_amount || 0) + amountChange;
          
          const { error: updateError } = await supabase
            .from('budget_pockets')
            .update({ 
              current_amount: newAmount,
              updated_at: new Date().toISOString()
            })
            .eq('id', pocketId);

          if (updateError) {
            console.error('Error updating pocket amount:', updateError);
          }
        }
      }
      
      // If a new payee was created, add it to the list immediately
      if (payee.trim() && !payees.includes(payee.trim())) {
        setPayees(prev => [payee.trim(), ...prev]);
      }
      
      // Reset form
      setAmount("");
      setCategory("");
      setPocketId("");
      setPayee("");
      setDescription("");
      setDate(new Date().toISOString().split('T')[0]);
      
      onSuccess();
      
      // Refresh payees list after a delay to ensure transaction is committed
      setTimeout(() => {
        fetchPayees();
      }, 100);
    } catch (error: any) {
      toast({
        title: "Error adding transaction",
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
          <DialogTitle className="text-xl font-bold">Add Transaction</DialogTitle>
          <DialogDescription>
            Record a new income or expense transaction.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <Label>Transaction Type</Label>
            <RadioGroup value={type} onValueChange={(value: "income" | "expense") => {
              setType(value);
              setCategory(""); // Reset category when type changes
            }}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="expense" id="expense" />
                <Label htmlFor="expense">Expense</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="income" id="income" />
                <Label htmlFor="income">Income</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Combobox
              options={categories
                .filter(cat => cat.category_groups?.name) // Only show categories that have groups
                .map((cat) => ({
                  value: cat.name,
                  label: cat.name,
                  group: cat.category_groups?.name
                }))}
              value={category}
              onValueChange={setCategory}
              placeholder="Select category"
              searchPlaceholder="Search categories..."
              emptyText="No categories found."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="payee">Payee</Label>
            <Combobox
              options={payees.map((p) => ({
                value: p,
                label: p
              }))}
              value={payee}
              onValueChange={(newValue) => {
                // If it's a new payee that doesn't exist in the list, add it immediately
                if (newValue && !payees.includes(newValue)) {
                  setPayees(prev => [newValue, ...prev])
                }
                setPayee(newValue)
              }}
              placeholder="Select or type payee"
              searchPlaceholder="Search payees..."
              emptyText="Type to add new payee"
              allowCreate={true}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pocket">Budget Pocket</Label>
            {(() => {
              const filteredPockets = pockets.filter(pocket => pocket.pocket_type === type);
              
              if (filteredPockets.length === 0) {
                return (
                  <div className="text-sm text-muted-foreground p-3 border rounded-md bg-muted/50">
                    No {type} pockets have been created yet.
                  </div>
                );
              }
              
              return (
                <Select value={pocketId} onValueChange={setPocketId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select pocket (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredPockets.map((pocket) => (
                      <SelectItem key={pocket.id} value={pocket.id}>
                        <div className="flex items-center space-x-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: pocket.color }}
                          />
                          <span>{pocket.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              );
            })()}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              maxLength={200}
              rows={2}
            />
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
            <Button type="submit" variant="hero" disabled={loading || !amount || !category}>
              {loading ? "Adding..." : "Add Transaction"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}