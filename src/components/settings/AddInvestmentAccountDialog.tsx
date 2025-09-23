import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/useAuth";
import { toast } from "sonner";

type InvestmentAccount = {
  id: string;
  account_name: string;
  institution_name: string;
  account_type: string;
  account_number?: string;
  total_value: number;
  is_active: boolean;
  notes?: string;
};

interface AddInvestmentAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingAccount?: InvestmentAccount | null;
}

const accountTypes = [
  { value: "brokerage", label: "Brokerage Account" },
  { value: "401k", label: "401(k)" },
  { value: "traditional_ira", label: "Traditional IRA" },
  { value: "roth_ira", label: "Roth IRA" },
  { value: "sep_ira", label: "SEP IRA" },
  { value: "simple_ira", label: "SIMPLE IRA" },
  { value: "crypto_exchange", label: "Crypto Exchange" },
  { value: "pension", label: "Pension" },
  { value: "other", label: "Other" },
];

export function AddInvestmentAccountDialog({ open, onOpenChange, editingAccount }: AddInvestmentAccountDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    account_name: "",
    institution_name: "",
    account_type: "",
    account_number: "",
    total_value: "",
    is_active: true,
    notes: "",
  });

  useEffect(() => {
    if (editingAccount) {
      setFormData({
        account_name: editingAccount.account_name,
        institution_name: editingAccount.institution_name,
        account_type: editingAccount.account_type,
        account_number: editingAccount.account_number || "",
        total_value: editingAccount.total_value?.toString() || "",
        is_active: editingAccount.is_active,
        notes: editingAccount.notes || "",
      });
    } else {
      setFormData({
        account_name: "",
        institution_name: "",
        account_type: "",
        account_number: "",
        total_value: "",
        is_active: true,
        notes: "",
      });
    }
  }, [editingAccount, open]);

  const saveAccountMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!user?.id) throw new Error("User not authenticated");

      const accountData = {
        user_id: user.id,
        account_name: data.account_name,
        institution_name: data.institution_name,
        account_type: data.account_type,
        account_number: data.account_number || null,
        total_value: parseFloat(data.total_value) || 0,
        is_active: data.is_active,
        notes: data.notes || null,
      };

      if (editingAccount) {
        const { error } = await (supabase as any)
          .from("investment_accounts")
          .update(accountData)
          .eq("id", editingAccount.id);
        
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from("investment_accounts")
          .insert(accountData);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["investment-accounts"] });
      toast.success(editingAccount ? "Account updated successfully" : "Account added successfully");
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Failed to save account");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.account_name || !formData.institution_name || !formData.account_type) {
      toast.error("Please fill in all required fields");
      return;
    }

    saveAccountMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editingAccount ? "Edit Investment Account" : "Add Investment Account"}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="account_name">Account Name *</Label>
            <Input
              id="account_name"
              value={formData.account_name}
              onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
              placeholder="My Fidelity 401k"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="institution_name">Institution Name *</Label>
            <Input
              id="institution_name"
              value={formData.institution_name}
              onChange={(e) => setFormData({ ...formData, institution_name: e.target.value })}
              placeholder="Fidelity"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="account_type">Account Type *</Label>
            <Select 
              value={formData.account_type} 
              onValueChange={(value) => setFormData({ ...formData, account_type: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select account type" />
              </SelectTrigger>
              <SelectContent>
                {accountTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="total_value">Current Value</Label>
              <Input
                id="total_value"
                type="number"
                step="0.01"
                value={formData.total_value}
                onChange={(e) => setFormData({ ...formData, total_value: e.target.value })}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="account_number">Account Number</Label>
              <Input
                id="account_number"
                value={formData.account_number}
                onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                placeholder="****1234"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
            <Label htmlFor="is_active">Active Account</Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes about this account..."
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saveAccountMutation.isPending}>
              {saveAccountMutation.isPending ? "Saving..." : editingAccount ? "Update" : "Add Account"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}