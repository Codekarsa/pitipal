import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { CurrencyInput } from "@/components/ui/currency-input";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface CreditCardAccount {
  id: string;
  account_name: string;
  institution_name: string;
  card_type: string;
  credit_limit: number;
  current_balance: number;
  minimum_payment: number;
  apr: number;
  due_date: number;
  account_number?: string;
  notes?: string;
  is_active: boolean;
}

interface AddCreditCardAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingAccount?: CreditCardAccount;
}

export function AddCreditCardAccountDialog({ 
  open, 
  onOpenChange, 
  editingAccount 
}: AddCreditCardAccountDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    account_name: "",
    institution_name: "",
    card_type: "credit_card",
    credit_limit: "",
    current_balance: "",
    minimum_payment: "",
    apr: "",
    due_date: "1",
    account_number: "",
    notes: "",
    is_active: true,
  });

  useEffect(() => {
    if (editingAccount) {
      setFormData({
        account_name: editingAccount.account_name,
        institution_name: editingAccount.institution_name,
        card_type: editingAccount.card_type,
        credit_limit: editingAccount.credit_limit.toString(),
        current_balance: editingAccount.current_balance.toString(),
        minimum_payment: editingAccount.minimum_payment.toString(),
        apr: editingAccount.apr.toString(),
        due_date: editingAccount.due_date.toString(),
        account_number: editingAccount.account_number || "",
        notes: editingAccount.notes || "",
        is_active: editingAccount.is_active,
      });
    } else {
      setFormData({
        account_name: "",
        institution_name: "",
        card_type: "credit_card",
        credit_limit: "",
        current_balance: "",
        minimum_payment: "",
        apr: "",
        due_date: "1",
        account_number: "",
        notes: "",
        is_active: true,
      });
    }
  }, [editingAccount, open]);

  const saveAccountMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const accountData = {
        account_name: data.account_name,
        institution_name: data.institution_name,
        card_type: data.card_type,
        credit_limit: parseFloat(data.credit_limit.replace(/,/g, '')) || 0,
        current_balance: parseFloat(data.current_balance.replace(/,/g, '')) || 0,
        minimum_payment: parseFloat(data.minimum_payment.replace(/,/g, '')) || 0,
        apr: parseFloat(data.apr) || 0,
        due_date: parseInt(data.due_date) || 1,
        account_number: data.account_number || null,
        notes: data.notes || null,
        is_active: data.is_active,
        user_id: user.id,
      };

      if (editingAccount) {
        const { error } = await supabase
          .from('credit_card_accounts')
          .update(accountData)
          .eq('id', editingAccount.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('credit_card_accounts')
          .insert([accountData]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-card-accounts'] });
      toast({
        title: editingAccount ? "Credit card updated" : "Credit card added",
        description: editingAccount ? "Your credit card account has been updated successfully." : "Your credit card account has been added successfully.",
      });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to ${editingAccount ? 'update' : 'save'} credit card account: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.account_name || !formData.institution_name) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    saveAccountMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {editingAccount ? "Edit Credit Card" : "Add Credit Card"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="account_name">Account Name *</Label>
              <Input
                id="account_name"
                value={formData.account_name}
                onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                placeholder="My Credit Card"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="institution_name">Institution *</Label>
              <Input
                id="institution_name"
                value={formData.institution_name}
                onChange={(e) => setFormData({ ...formData, institution_name: e.target.value })}
                placeholder="Chase, Amex, etc."
                required
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="card_type">Card Type</Label>
            <Select key={editingAccount?.id || 'new'} value={formData.card_type} onValueChange={(value) => setFormData({ ...formData, card_type: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="credit_card">Credit Card</SelectItem>
                <SelectItem value="store_card">Store Card</SelectItem>
                <SelectItem value="line_of_credit">Line of Credit</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="credit_limit">Credit Limit</Label>
              <CurrencyInput
                value={formData.credit_limit}
                onChange={(value) => setFormData({ ...formData, credit_limit: value })}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="current_balance">Current Balance</Label>
              <CurrencyInput
                value={formData.current_balance}
                onChange={(value) => setFormData({ ...formData, current_balance: value })}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="minimum_payment">Minimum Payment</Label>
              <CurrencyInput
                value={formData.minimum_payment}
                onChange={(value) => setFormData({ ...formData, minimum_payment: value })}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="apr">APR (%)</Label>
              <Input
                id="apr"
                type="number"
                step="0.01"
                value={formData.apr}
                onChange={(e) => setFormData({ ...formData, apr: e.target.value })}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="due_date">Due Date (Day of Month)</Label>
              <Select key={`due-date-${editingAccount?.id || 'new'}`} value={formData.due_date} onValueChange={(value) => setFormData({ ...formData, due_date: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                    <SelectItem key={day} value={day.toString()}>{day}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="account_number">Account Number (Last 4)</Label>
              <Input
                id="account_number"
                value={formData.account_number}
                onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                placeholder="****1234"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes about this credit card..."
              rows={3}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
            <Label htmlFor="is_active">Active Account</Label>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saveAccountMutation.isPending}>
              {saveAccountMutation.isPending ? "Saving..." : editingAccount ? "Update" : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}