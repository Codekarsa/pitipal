import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/utils";

interface CreditCardAccount {
  id: string;
  account_name: string;
  institution_name: string;
  current_balance: number;
  minimum_payment: number;
}

interface CreditCardPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreditCardPaymentDialog({ open, onOpenChange, onSuccess }: CreditCardPaymentDialogProps) {
  const [selectedCardId, setSelectedCardId] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: creditCards } = useQuery({
    queryKey: ['credit-card-accounts'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from('credit_card_accounts')
        .select('id, account_name, institution_name, current_balance, minimum_payment')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .gt('current_balance', 0)
        .order('current_balance', { ascending: false });

      if (error) throw error;
      return data as CreditCardAccount[];
    },
    enabled: open,
  });

  const { data: userProfile } = useQuery({
    queryKey: ['user-profile-currency'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from('profiles')
        .select('currency')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedCardId("");
      setAmount("");
      setDate(new Date().toISOString().split('T')[0]);
    }
  }, [open]);

  const selectedCard = creditCards?.find(card => card.id === selectedCardId);
  const currency = userProfile?.currency || 'USD';

  const handleQuickAmount = (type: 'minimum' | 'balance') => {
    if (!selectedCard) return;
    
    if (type === 'minimum') {
      setAmount(selectedCard.minimum_payment.toString());
    } else {
      setAmount(selectedCard.current_balance.toString());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedCardId || !amount) return;

    try {
      setLoading(true);
      
      const paymentAmount = parseFloat(amount.replace(/,/g, ''));
      
      // Create transaction
      const { data: transactionData, error: transactionError } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          credit_card_account_id: selectedCardId,
          amount: paymentAmount,
          type: 'expense',
          category: 'Credit Card Payment',
          description: `Payment to ${selectedCard?.account_name}`,
          transaction_date: date,
          ai_categorized: false,
          ai_confidence: 0,
        })
        .select()
        .single();

      if (transactionError) throw transactionError;

      // Update credit card balance
      if (selectedCard) {
        const newBalance = Math.max(0, selectedCard.current_balance - paymentAmount);
        
        const { error: updateError } = await supabase
          .from('credit_card_accounts')
          .update({ 
            current_balance: newBalance,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedCardId);

        if (updateError) throw updateError;
      }

      toast({
        title: "Payment recorded",
        description: `Credit card payment of $${paymentAmount.toFixed(2)} has been recorded successfully.`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to record payment: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Record Credit Card Payment</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="credit-card">Credit Card *</Label>
            <Select value={selectedCardId} onValueChange={setSelectedCardId} required>
              <SelectTrigger>
                <SelectValue placeholder="Select credit card" />
              </SelectTrigger>
              <SelectContent>
                {creditCards?.map((card) => (
                  <SelectItem key={card.id} value={card.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{card.account_name}</span>
                      <span className="text-sm text-muted-foreground">
                        Balance: {formatCurrency(card.current_balance, currency)}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedCard && (
            <div className="p-3 bg-muted/50 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span>Current Balance:</span>
                <span className="font-medium text-destructive">
                  {formatCurrency(selectedCard.current_balance, currency)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Minimum Payment:</span>
                <span className="font-medium">
                  {formatCurrency(selectedCard.minimum_payment, currency)}
                </span>
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAmount('minimum')}
                  className="flex-1"
                >
                  Pay Minimum
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAmount('balance')}
                  className="flex-1"
                >
                  Pay Full Balance
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="amount">Payment Amount *</Label>
            <CurrencyInput
              id="amount"
              value={amount}
              onChange={setAmount}
              placeholder="0.00"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Payment Date</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !selectedCardId || !amount}>
              {loading ? "Recording..." : "Record Payment"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}