import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Combobox } from "@/components/ui/combobox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/useAuth";
import { useToast } from "@/hooks/use-toast";
import { withRetry, handleError, showSuccessMessage } from "@/lib/error-utils";

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

interface Asset {
  id: string;
  symbol: string;
  name: string;
  asset_type: string;
  exchange: string | null;
}

interface InvestmentAccount {
  id: string;
  account_name: string;
  account_type: string;
  institution_name: string;
}

interface SavingsAccount {
  id: string;
  account_name: string;
  institution_name: string;
  account_type: string;
}

interface CreditCardAccount {
  id: string;
  account_name: string;
  institution_name: string;
  card_type: string;
}

interface TransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  pockets: BudgetPocket[];
  editingTransaction?: any;
}

export function TransactionDialog({ open, onOpenChange, onSuccess, pockets, editingTransaction }: TransactionDialogProps) {
  const [type, setType] = useState<"income" | "expense" | "investment">("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [pocketId, setPocketId] = useState("");
  const [payee, setPayee] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [payees, setPayees] = useState<string[]>([]);
  const [savingsAccountId, setSavingsAccountId] = useState("");
  const [investmentAccountId, setInvestmentAccountId] = useState("");
  const [creditCardAccountId, setCreditCardAccountId] = useState("");
  const [savingsAccounts, setSavingsAccounts] = useState<SavingsAccount[]>([]);
  const [investmentAccounts, setInvestmentAccounts] = useState<InvestmentAccount[]>([]);
  const [creditCardAccounts, setCreditCardAccounts] = useState<CreditCardAccount[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Investment-specific fields
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [pricePerUnit, setPricePerUnit] = useState("");
  const [fees, setFees] = useState("");
  const [investmentType, setInvestmentType] = useState<"buy" | "sell">("buy");
  
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    console.log('TransactionDialog useEffect triggered - open:', open, 'type:', type);
    if (open) {
      console.log('Dialog opened, fetching data...');
      fetchCategories();
      fetchPayees();
      
      // Fetch accounts first, then populate transaction data
      const initializeData = async () => {
        await fetchAccounts();
        if (type === 'investment') {
          await fetchAssets();
        }
        
        // If editing, populate fields after accounts are loaded
        if (editingTransaction) {
          setType(editingTransaction.type);
          setAmount(editingTransaction.amount.toString());
          setCategory(editingTransaction.category);
          setDescription(editingTransaction.description || "");
          setDate(editingTransaction.transaction_date);
          setPocketId(editingTransaction.pocket_id || "");
          setSavingsAccountId(editingTransaction.savings_account_id || "");
          setInvestmentAccountId(editingTransaction.investment_account_id || "");
          setCreditCardAccountId(editingTransaction.credit_card_account_id || "");
          
          // Handle payee for editing
          if (editingTransaction.payee_id) {
            // Fetch payee name
            const fetchPayeeName = async () => {
              try {
                const { data, error } = await supabase
                  .from('payees')
                  .select('name')
                  .eq('id', editingTransaction.payee_id)
                  .single();
                
                if (error) throw error;
                setPayee(data?.name || "");
              } catch (error) {
                console.error('Error fetching payee name:', error);
              }
            };
            fetchPayeeName();
          } else {
            setPayee("");
          }
        }
      };
      
      initializeData();
    }
  }, [open, type, editingTransaction]);

  // Auto-suggest "Credit Card Payment" category when credit card is selected
  useEffect(() => {
    if (creditCardAccountId && type === "expense" && !editingTransaction) {
      setCategory("Credit Card Payment");
    }
  }, [creditCardAccountId, type, editingTransaction]);

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
      handleError(error, "Failed to load categories. Please try again.");
    }
  };

  const fetchPayees = async () => {
    try {
      const { data, error } = await supabase
        .from('payees')
        .select('name')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Extract payee names
      const payeeNames = data?.map(p => p.name) || [];
      setPayees(payeeNames);
    } catch (error: any) {
      console.error('Error loading payees:', error);
    }
  };

  const fetchAccounts = async () => {
    try {
      console.log('Fetching accounts for user:', user?.id);
      
      // Fetch savings accounts
      const { data: savingsData, error: savingsError } = await supabase
        .from('savings_accounts')
        .select('id, account_name, institution_name, account_type')
        .eq('user_id', user?.id)
        .eq('is_active', true);

      console.log('Savings accounts:', savingsData, 'Error:', savingsError);

      // Fetch investment accounts
      const { data: investmentData, error: investmentError } = await supabase
        .from('investment_accounts')
        .select('id, account_name, institution_name, account_type')
        .eq('user_id', user?.id)
        .eq('is_active', true);

      console.log('Investment accounts:', investmentData, 'Error:', investmentError);

      // Fetch credit card accounts
      const { data: creditCardData, error: creditCardError } = await supabase
        .from('credit_card_accounts')
        .select('id, account_name, institution_name, card_type')
        .eq('user_id', user?.id)
        .eq('is_active', true);

      console.log('Credit card accounts:', creditCardData, 'Error:', creditCardError);

      if (savingsError) throw savingsError;
      if (investmentError) throw investmentError;
      if (creditCardError) throw creditCardError;

      setSavingsAccounts(savingsData || []);
      setInvestmentAccounts(investmentData || []);
      setCreditCardAccounts(creditCardData || []);
      
      console.log('Account states set - Savings:', savingsData?.length || 0, 'Investment:', investmentData?.length || 0, 'Credit:', creditCardData?.length || 0);
    } catch (error: any) {
      console.error('Error loading accounts:', error);
    }
  };

  const fetchAssets = async () => {
    try {
      const { data, error } = await supabase
        .from('assets')
        .select('id, symbol, name, asset_type, exchange')
        .eq('is_active', true)
        .order('symbol');

      if (error) throw error;
      setAssets(data || []);
    } catch (error: any) {
      console.error('Error loading assets:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted - this should only happen when Add Transaction is clicked');
    if (!user) return;

    try {
      setLoading(true);
      
      // Calculate total amount for investment transactions
      const totalAmount = type === 'investment' 
        ? (parseFloat(quantity) * parseFloat(pricePerUnit)) + (parseFloat(fees) || 0)
        : parseFloat(amount);
      
      let transactionData;
      let transactionError;
      let payeeId = null;

      // Handle payee creation/lookup for non-investment transactions
      if (type !== 'investment' && payee.trim()) {
        // First, try to find existing payee
        const { data: existingPayee, error: payeeSearchError } = await supabase
          .from('payees')
          .select('id')
          .eq('user_id', user.id)
          .eq('name', payee.trim())
          .maybeSingle();

        if (payeeSearchError && !payeeSearchError.message.includes('not found')) {
          throw payeeSearchError;
        }

        if (existingPayee) {
          payeeId = existingPayee.id;
        } else {
          // Create new payee
          const { data: newPayee, error: payeeCreateError } = await supabase
            .from('payees')
            .insert({
              user_id: user.id,
              name: payee.trim()
            })
            .select('id')
            .single();

          if (payeeCreateError) {
            throw payeeCreateError;
          }
          payeeId = newPayee.id;
        }
      }

      if (editingTransaction) {
        // Update existing transaction
        await withRetry(async () => {
          const result = await supabase
            .from('transactions')
            .update({
              pocket_id: pocketId || null,
              savings_account_id: savingsAccountId || null,
              investment_account_id: investmentAccountId || null,
              credit_card_account_id: creditCardAccountId || null,
              payee_id: payeeId,
              amount: totalAmount,
              type: type,
              category: category,
              description: type === 'investment' 
                ? `${investmentType.toUpperCase()} ${quantity} shares of ${assets.find(a => a.id === selectedAssetId)?.symbol || 'Unknown'} @ ${pricePerUnit}`
                : description.trim() || null,
              transaction_date: date,
              updated_at: new Date().toISOString(),
            })
            .eq('id', editingTransaction.id)
            .eq('user_id', user.id)
            .select()
            .single();
          
          transactionData = result.data;
          transactionError = result.error;
          
          if (transactionError) throw transactionError;
        }, 3);
      } else {
      // Create new transaction
      await withRetry(async () => {
        const result = await supabase
          .from('transactions')
          .insert({
            user_id: user.id,
            pocket_id: pocketId || null,
            savings_account_id: savingsAccountId || null,
            investment_account_id: investmentAccountId || null,
            credit_card_account_id: creditCardAccountId || null,
            payee_id: payeeId,
            amount: totalAmount,
            type: type,
            category: category,
            description: type === 'investment' 
              ? `${investmentType.toUpperCase()} ${quantity} shares of ${assets.find(a => a.id === selectedAssetId)?.symbol || 'Unknown'} @ ${pricePerUnit}`
              : description.trim() || null,
            transaction_date: date,
            ai_categorized: false,
            ai_confidence: 0,
          })
          .select()
          .single();
        
        transactionData = result.data;
        transactionError = result.error;
        
        if (transactionError) throw transactionError;
      }, 3);
      }

      // Remove the old error check since we handle errors with withRetry
      // if (transactionError) throw transactionError;

      // For investment transactions, create investment transaction details
      if (type === 'investment' && transactionData && selectedAssetId) {
        const { error: investmentError } = await supabase
          .from('investment_transactions')
          .insert({
            transaction_id: transactionData.id,
            asset_id: selectedAssetId,
            quantity: parseFloat(quantity),
            price_per_unit: parseFloat(pricePerUnit),
            fees: parseFloat(fees) || 0,
            transaction_type: investmentType,
          });

        if (investmentError) throw investmentError;
      }

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

      // Update credit card balance if credit card payment
      if (creditCardAccountId && category === 'Credit Card Payment') {
        try {
          const { data: cardData, error: fetchError } = await supabase
            .from('credit_card_accounts')
            .select('current_balance')
            .eq('id', creditCardAccountId)
            .single();

          if (fetchError) {
            console.error('Error fetching credit card data:', fetchError);
          } else {
            // Credit card payments reduce the balance
            const newBalance = (cardData.current_balance || 0) - parseFloat(amount);
            
            const { error: updateError } = await supabase
              .from('credit_card_accounts')
              .update({ 
                current_balance: Math.max(0, newBalance), // Don't allow negative balances
                updated_at: new Date().toISOString()
              })
              .eq('id', creditCardAccountId);

            if (updateError) {
              console.error('Error updating credit card balance:', updateError);
            }
          }
        } catch (error) {
          console.error('Error processing credit card payment:', error);
        }
      } else if (creditCardAccountId && type === 'expense') {
        // Regular purchases on credit card increase the balance
        try {
          const { data: cardData, error: fetchError } = await supabase
            .from('credit_card_accounts')
            .select('current_balance')
            .eq('id', creditCardAccountId)
            .single();

          if (fetchError) {
            console.error('Error fetching credit card data:', fetchError);
          } else {
            const newBalance = (cardData.current_balance || 0) + parseFloat(amount);
            
            const { error: updateError } = await supabase
              .from('credit_card_accounts')
              .update({ 
                current_balance: newBalance,
                updated_at: new Date().toISOString()
              })
              .eq('id', creditCardAccountId);

            if (updateError) {
              console.error('Error updating credit card balance:', updateError);
            }
          }
        } catch (error) {
          console.error('Error processing credit card purchase:', error);
        }
      }
      
      // Reset form
      console.log('Resetting form after successful submission');
      resetForm();
      
      showSuccessMessage(editingTransaction ? "Transaction updated successfully" : "Transaction added successfully");
      
      onSuccess();
      
      // Refresh payees list to get latest from database
      setTimeout(() => {
        fetchPayees();
      }, 100);
    } catch (error: any) {
      handleError(error, "Failed to add transaction. Please check your inputs and try again.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setAmount("");
    setCategory("");
    setPocketId("");
    setSavingsAccountId("");
    setInvestmentAccountId("");
    setCreditCardAccountId("");
    setPayee("");
    setDescription("");
    setDate(new Date().toISOString().split('T')[0]);
    
    // Reset investment fields
    setSelectedAssetId("");
    setQuantity("");
    setPricePerUnit("");
    setFees("");
    setInvestmentType("buy");
  };

  const handleDialogOpenChange = (open: boolean) => {
    if (!open && !editingTransaction) {
      resetForm();
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto bg-gradient-card border-0 shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {editingTransaction ? 'Edit Transaction' : 'Add Transaction'}
          </DialogTitle>
          <DialogDescription>
            {editingTransaction ? 'Update transaction details.' : 'Record a new income or expense transaction.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <Label>Transaction Type</Label>
            <RadioGroup value={type} onValueChange={(value: "income" | "expense" | "investment") => {
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
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="investment" id="investment" />
                  <Label htmlFor="investment">Investment</Label>
                </div>
              </RadioGroup>
          </div>

          {type === 'investment' ? (
            <>
              <div className="space-y-2">
                <Label>Investment Type</Label>
                <RadioGroup value={investmentType} onValueChange={(value: "buy" | "sell") => setInvestmentType(value)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="buy" id="buy" />
                    <Label htmlFor="buy">Buy</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="sell" id="sell" />
                    <Label htmlFor="sell">Sell</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="asset">Asset *</Label>
                <Combobox
                  options={assets.map((asset) => ({
                    value: asset.id,
                    label: `${asset.symbol} - ${asset.name}`,
                    group: asset.asset_type
                  }))}
                  value={selectedAssetId}
                  onValueChange={setSelectedAssetId}
                  placeholder="Select asset"
                  searchPlaceholder="Search assets..."
                  emptyText="No assets found."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    step="0.00001"
                    min="0"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="0"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pricePerUnit">Price per Unit *</Label>
                  <CurrencyInput
                    id="pricePerUnit"
                    value={pricePerUnit}
                    onChange={setPricePerUnit}
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fees">Fees</Label>
                  <CurrencyInput
                    id="fees"
                    value={fees}
                    onChange={setFees}
                    placeholder="0.00"
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

              {quantity && pricePerUnit && (
                <div className="p-3 bg-muted rounded-md">
                  <div className="text-sm text-muted-foreground">Total Amount:</div>
                  <div className="font-medium">
                    ${((parseFloat(quantity) * parseFloat(pricePerUnit)) + (parseFloat(fees) || 0)).toFixed(2)}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount *</Label>
                <CurrencyInput
                  id="amount"
                  value={amount}
                  onChange={setAmount}
                  placeholder="0.00"
                  allowNegative={true}
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
          )}

          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Combobox
              options={categories
                .filter(cat => cat.category_groups?.name && cat.category_groups.name !== "Other Expenses" && cat.name !== cat.category_groups.name) // Exclude "Other Expenses" group and duplicate names
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
              onValueChange={async (newValue) => {
                // If it's a new payee that doesn't exist in the list, save it to database
                if (newValue && !payees.includes(newValue)) {
                  try {
                    const { error } = await supabase
                      .from('payees')
                      .insert({
                        user_id: user?.id,
                        name: newValue.trim()
                      });
                    
                    if (error) {
                      // If error is due to unique constraint (payee already exists), ignore it
                      if (!error.message.includes('duplicate key value')) {
                        console.error('Error creating payee:', error);
                      }
                    } else {
                      // Add to local state immediately
                      setPayees(prev => [newValue, ...prev]);
                    }
                  } catch (error) {
                    console.error('Error creating payee:', error);
                  }
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
            <Label htmlFor="account">Account</Label>
            <Select 
              key={editingTransaction?.id || 'new'}
              value={
                savingsAccountId ? `savings:${savingsAccountId}` :
                investmentAccountId ? `investment:${investmentAccountId}` :
                creditCardAccountId ? `credit:${creditCardAccountId}` :
                "none"
              }
              onValueChange={(value) => {
                console.log('Account selection changed to:', value);
                if (value === "none") {
                  setSavingsAccountId("");
                  setInvestmentAccountId("");
                  setCreditCardAccountId("");
                  return;
                }
                const [accountType, accountId] = value.split(':');
                console.log('Parsed account type:', accountType, 'ID:', accountId);
                if (accountType === 'savings') {
                  setSavingsAccountId(accountId);
                  setInvestmentAccountId("");
                  setCreditCardAccountId("");
                } else if (accountType === 'investment') {
                  setInvestmentAccountId(accountId);
                  setSavingsAccountId("");
                  setCreditCardAccountId("");
                } else if (accountType === 'credit') {
                  setCreditCardAccountId(accountId);
                  setSavingsAccountId("");
                  setInvestmentAccountId("");
                } else {
                  setSavingsAccountId("");
                  setInvestmentAccountId("");
                  setCreditCardAccountId("");
                }
              }}
            >
              <SelectTrigger onClick={() => console.log('SelectTrigger clicked')}>
                <SelectValue placeholder="Select account (optional)" />
              </SelectTrigger>
              <SelectContent className="z-[200]">
                <SelectItem 
                  value="none"
                  onSelect={() => console.log('None selected')}
                >
                  No Account
                </SelectItem>
                {savingsAccounts.map((account) => (
                  <SelectItem 
                    key={account.id} 
                    value={`savings:${account.id}`}
                    onSelect={() => console.log('Savings account selected:', account.account_name)}
                  >
                    💰 {account.account_name} ({account.institution_name})
                  </SelectItem>
                ))}
                {investmentAccounts.map((account) => (
                  <SelectItem 
                    key={account.id} 
                    value={`investment:${account.id}`}
                    onSelect={() => console.log('Investment account selected:', account.account_name)}
                  >
                    📈 {account.account_name} ({account.institution_name})
                  </SelectItem>
                ))}
                {creditCardAccounts.map((account) => (
                  <SelectItem 
                    key={account.id} 
                    value={`credit:${account.id}`}
                    onSelect={() => console.log('Credit card selected:', account.account_name)}
                  >
                    💳 {account.account_name} ({account.institution_name})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <Button type="submit" variant="hero" disabled={
              loading || 
              !category || 
              (type === 'investment' ? (!selectedAssetId || !quantity || !pricePerUnit) : !amount)
            }>
              {loading ? (editingTransaction ? "Updating..." : "Adding...") : (editingTransaction ? "Update Transaction" : "Add Transaction")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}