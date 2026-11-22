import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/auth/useAuth";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, TrendingUp, TrendingDown, Edit, Trash2, ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Receipt, Upload, ListPlus, Wallet } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { CompactAmount } from "@/components/ui/compact-amount";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { TransactionDialog } from "@/components/dashboard/TransactionDialog";
import { BulkTransactionDialog } from "./BulkTransactionDialog";
import { ImportDialog } from "@/components/settings/ImportDialog";
import { MonthNavigator } from "@/components/dashboard/MonthNavigator";
import { format } from "date-fns";
import { analytics } from "@/lib/analytics";

interface Transaction {
  id: string;
  amount: number;
  type: string;
  category: string;
  description: string | null;
  transaction_date: string;
  pocket_id: string | null;
  savings_account_id: string | null;
  investment_account_id: string | null;
  credit_card_account_id: string | null;
  payee_id: string | null;
  is_recurring: boolean | null;
  ai_categorized: boolean | null;
  created_at: string;
  payees?: {
    name: string;
  } | null;
}

interface Account {
  id: string;
  account_name: string;
  institution_name: string;
  account_type: string;
  current_balance?: number;
  total_value?: number;
  card_type?: string;
}

interface BudgetPocket {
  id: string;
  name: string;
  color: string;
  pocket_type: "expense" | "income" | "investment";
}

// Delete button with its confirmation, shared by the table and the phone list
function DeleteTransactionButton({ onConfirm }: { onConfirm: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
          aria-label="Delete transaction"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this transaction? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface TransactionsPageProps {
  // Changes when a transaction is saved outside this page, such as from the header
  refreshKey?: number;
}

export function TransactionsPage({ refreshKey }: TransactionsPageProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { pocketId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const monthParam = searchParams.get('month') || '';
  const selectedMonth = /^\d{4}-(0[1-9]|1[0-2])$/.test(monthParam) && !monthParam.startsWith('0000')
    ? monthParam : format(new Date(), 'yyyy-MM');
  // The existing pocket route takes precedence over query-string filters.
  const pocketFilter = pocketId || searchParams.get('pocket') || 'all';
  const updateQuery = (key: string, value: string) => {
    setSearchParams(previous => {
      const next = new URLSearchParams(previous);
      if (value === 'all') next.delete(key);
      else next.set(key, value);
      return next;
    });
  };
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [accountFilter, setAccountFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("date_desc");
  const [userCurrency, setUserCurrency] = useState<string>('USD');
  const [pocketName, setPocketName] = useState<string>('');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [totalAccountBalance, setTotalAccountBalance] = useState<number>(0);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [pockets, setPockets] = useState<BudgetPocket[]>([]);

  const fetchUserProfile = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('currency')
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;
      if (data?.currency) {
        setUserCurrency(data.currency);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  }, [user]);

  const fetchPocketName = useCallback(async () => {
    if (!pocketId) return;
    try {
      const { data, error } = await supabase
        .from('budget_pockets')
        .select('name')
        .eq('id', pocketId)
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;
      if (data?.name) {
        setPocketName(data.name);
      }
    } catch (error) {
      console.error('Error fetching pocket name:', error);
    }
  }, [pocketId, user]);

  const fetchAccounts = useCallback(async () => {
    try {
      // Fetch savings accounts
      const { data: savingsData, error: savingsError } = await supabase
        .from('savings_accounts')
        .select('id, account_name, institution_name, account_type, current_balance')
        .eq('user_id', user?.id)
        .eq('is_active', true);

      // Fetch investment accounts  
      const { data: investmentData, error: investmentError } = await supabase
        .from('investment_accounts')
        .select('id, account_name, institution_name, account_type, total_value')
        .eq('user_id', user?.id)
        .eq('is_active', true);

      // Fetch credit card accounts
      const { data: creditCardData, error: creditCardError } = await supabase
        .from('credit_card_accounts')
        .select('id, account_name, institution_name, card_type, current_balance')
        .eq('user_id', user?.id)
        .eq('is_active', true);

      if (savingsError) throw savingsError;
      if (investmentError) throw investmentError;
      if (creditCardError) throw creditCardError;

      const allAccounts: Account[] = [
        ...(savingsData || []).map(acc => ({ ...acc, current_balance: acc.current_balance })),
        ...(investmentData || []).map(acc => ({ ...acc, total_value: acc.total_value })),
        ...(creditCardData || []).map(acc => ({ ...acc, current_balance: acc.current_balance, account_type: acc.card_type }))
      ];

      setAccounts(allAccounts);
      
      // Calculate total balance (note: credit card balances are debt, so they reduce net worth)
      const totalBalance = allAccounts.reduce((sum, acc) => {
        if (acc.card_type) {
          // Credit card balance is debt, so subtract it
          return sum - (acc.current_balance || 0);
        }
        return sum + (acc.current_balance || acc.total_value || 0);
      }, 0);
      setTotalAccountBalance(totalBalance);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  }, [user]);

  const fetchPockets = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('budget_pockets')
        .select('id, name, color, pocket_type')
        .eq('user_id', user.id)
        .order('name');

      if (error) throw error;
      setPockets((data || []).map(pocket => ({
        ...pocket,
        pocket_type: pocket.pocket_type as "expense" | "income" | "investment"
      })));
    } catch (error) {
      console.error('Error fetching pockets:', error);
    }
  }, [user]);

  const fetchTransactions = useCallback(async () => {
    try {
      // Calculate date range for selected month
      const startDate = `${selectedMonth}-01`;
      const [year, month] = selectedMonth.split('-').map(Number);
      const nextMonth = month === 12 ? 1 : month + 1;
      const nextYear = month === 12 ? year + 1 : year;
      const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

      let query = supabase
        .from('transactions')
        .select(`
          *,
          payees(name)
        `)
        .eq('user_id', user?.id)
        .gte('transaction_date', startDate)
        .lt('transaction_date', endDate);

      // Apply filters
      if (pocketFilter === 'unassigned') {
        query = query.is('pocket_id', null).eq('type', 'expense');
      } else if (pocketFilter !== 'all') {
        query = query.eq('pocket_id', pocketFilter);
      }

      if (typeFilter !== "all") {
        query = query.eq('type', typeFilter);
      }

      if (categoryFilter !== "all") {
        query = query.eq('category', categoryFilter);
      }

      if (accountFilter !== "all") {
        const [accountType, accountId] = accountFilter.split(':');
        if (accountType === 'savings') {
          query = query.eq('savings_account_id', accountId);
        } else if (accountType === 'investment') {
          query = query.eq('investment_account_id', accountId);
        } else if (accountType === 'credit') {
          query = query.eq('credit_card_account_id', accountId);
        }
      }

      // Apply sorting
      switch (sortBy) {
        case "date_asc":
          query = query.order('transaction_date', { ascending: true });
          break;
        case "date_desc":
          query = query.order('transaction_date', { ascending: false });
          break;
        case "amount_asc":
          query = query.order('amount', { ascending: true });
          break;
        case "amount_desc":
          query = query.order('amount', { ascending: false });
          break;
        default:
          query = query.order('transaction_date', { ascending: false });
      }

      const { data, error } = await query;

      if (error) throw error;

      let filteredData = (data || []).map(transaction => ({ ...transaction, amount: Math.abs(transaction.amount) }));
      if (sortBy === 'amount_asc') filteredData.sort((a, b) => a.amount - b.amount);
      if (sortBy === 'amount_desc') filteredData.sort((a, b) => b.amount - a.amount);

      // Apply search filter
      if (searchTerm) {
        filteredData = filteredData.filter(transaction => {
          const matchesDescription = transaction.description?.toLowerCase().includes(searchTerm.toLowerCase());
          const matchesCategory = transaction.category.toLowerCase().includes(searchTerm.toLowerCase());
          const matchesPayee = transaction.payees?.name?.toLowerCase().includes(searchTerm.toLowerCase());
          
          // Also search in account names
          let matchesAccount = false;
          if (transaction.savings_account_id || transaction.investment_account_id || transaction.credit_card_account_id) {
            const account = accounts.find(acc => 
              acc.id === transaction.savings_account_id || 
              acc.id === transaction.investment_account_id ||
              acc.id === transaction.credit_card_account_id
            );
            if (account) {
              matchesAccount = account.account_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             account.institution_name.toLowerCase().includes(searchTerm.toLowerCase());
            }
          }
          
          return matchesDescription || matchesCategory || matchesPayee || matchesAccount;
        });
      }

      setTransactions(filteredData);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast({
        title: "Error loading transactions",
        description: "Please try again later",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user, pocketFilter, typeFilter, categoryFilter, accountFilter, sortBy, searchTerm, accounts, toast, selectedMonth]);

  // Initial data loading effect
  useEffect(() => {
    if (user) {
      fetchUserProfile();
      fetchAccounts();
      fetchPockets();
      if (pocketId) {
        fetchPocketName();
      }
    }
  }, [user, pocketId, fetchUserProfile, fetchAccounts, fetchPockets, fetchPocketName]);

  // Transactions loading effect - depends on filters and accounts
  useEffect(() => {
    if (user && accounts.length >= 0) { // accounts.length >= 0 to ensure it runs even when accounts is empty
      fetchTransactions();
    }
  }, [user, typeFilter, categoryFilter, accountFilter, sortBy, searchTerm, accounts, fetchTransactions, refreshKey]);

  const getUniqueCategories = () => {
    const categories = [...new Set(transactions.map(t => t.category))];
    return categories.sort();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getTotalStats = () => {
    const income = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const expenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    return { income, expenses, net: income - expenses };
  };

  const getAccountName = (transaction: Transaction) => {
    if (transaction.savings_account_id) {
      const account = accounts.find(acc => acc.id === transaction.savings_account_id);
      return account ? `${account.account_name} (${account.institution_name})` : 'Unknown Account';
    }
    if (transaction.investment_account_id) {
      const account = accounts.find(acc => acc.id === transaction.investment_account_id);
      return account ? `${account.account_name} (${account.institution_name})` : 'Unknown Account';
    }
    if (transaction.credit_card_account_id) {
      const account = accounts.find(acc => acc.id === transaction.credit_card_account_id);
      return account ? `${account.account_name} (${account.institution_name})` : 'Unknown Account';
    }
    return null;
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setTransactionDialogOpen(true);
  };

  const getPocketName = (transaction: Transaction) => transaction.pocket_id
    ? pockets.find(pocket => pocket.id === transaction.pocket_id)?.name || 'Unknown pocket'
    : 'Unassigned';

  const handleDeleteTransaction = async (transactionId: string) => {
    try {
      // Note: Credit card balances are calculated dynamically from transactions
      // No need to manually reverse balance changes when deleting transactions

      // Delete the transaction
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', transactionId)
        .eq('user_id', user?.id);

      if (error) throw error;

      analytics.trackTransactionDeleted();
      toast({
        title: "Transaction deleted",
        description: "The transaction has been successfully deleted.",
      });

      // Refresh transactions
      fetchTransactions();
      fetchAccounts();
    } catch (error) {
      toast({
        title: "Error deleting transaction",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  const handleTransactionSuccess = () => {
    setTransactionDialogOpen(false);
    setEditingTransaction(null);
    fetchTransactions();
    fetchAccounts();
  };

  const stats = getTotalStats();

  if (loading) {
    return (
      <div className="space-y-7" role="status" aria-label="Loading transactions">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl sm:text-3xl font-medium tracking-tight">Transactions</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="rounded-[1.75rem] border-0 shadow-none animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-muted rounded w-3/4"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-medium tracking-tight break-words">
            {pocketId ? `${pocketName} Transactions` : 'Transactions'}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {pocketId ? `Transactions for ${pocketName} pocket` : 'Your income and spending, all in one place.'}
          </p>
          {pocketId && (
            <button
              onClick={() => navigate(`/transactions?month=${selectedMonth}`)}
              className="text-sm text-primary hover:underline mt-1"
            >
              ← View all transactions
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <MonthNavigator selectedMonth={selectedMonth} onMonthChange={month => updateQuery('month', month)} className="rounded-full border-0 px-2" />
          <Button variant="outline" className="rounded-full bg-card px-4" onClick={() => setImportOpen(true)}><Upload className="h-4 w-4" />Import CSV</Button>
          <Button className="rounded-full px-4" onClick={() => setBulkOpen(true)}><ListPlus className="h-4 w-4" />Add multiple</Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="space-y-3">
        <div className="grid gap-4 min-[380px]:grid-cols-2 md:grid-cols-3">
          {[
            { label: 'Total Income', amount: stats.income, icon: ArrowDownLeft, description: 'Money received', surface: 'bg-sky-100 bg-[radial-gradient(at_0%_100%,hsl(174_75%_77%)_0%,transparent_65%),radial-gradient(at_100%_0%,hsl(202_95%_74%)_0%,transparent_65%)] text-slate-900' },
            { label: 'Total Expenses', amount: stats.expenses, icon: ArrowUpRight, description: 'Money spent', surface: 'bg-rose-100 bg-[radial-gradient(at_100%_0%,hsl(12_95%_78%)_0%,transparent_65%),radial-gradient(at_0%_100%,hsl(264_85%_86%)_0%,transparent_70%)] text-slate-900' },
            { label: 'Net Amount', amount: stats.net, icon: ArrowLeftRight, description: 'Income minus expenses · not your balance', surface: 'bg-card' },
          ].map(({ label, amount, icon: Icon, description, surface }) => <section key={label} aria-label={label} className={`min-w-0 rounded-[1.75rem] p-5 sm:p-6 ${label === 'Net Amount' ? 'min-[380px]:col-span-2 md:col-span-1' : ''} ${surface}`}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-medium">{label}</h2>
              <span className="hidden rounded-2xl bg-white/40 p-2.5 md:inline-flex"><Icon className="h-5 w-5" /></span>
            </div>
            <p className={`mt-3 text-xl font-medium tracking-tight tabular-nums min-[380px]:text-base sm:text-xl md:mt-7 xl:text-2xl ${label === 'Net Amount' && amount < 0 ? 'text-destructive' : ''}`}>
              <CompactAmount amount={amount} currency={userCurrency} label={label} />
            </p>
            <p className="mt-2 text-xs leading-relaxed opacity-75">{description}</p>
          </section>)}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-xs text-muted-foreground">
          <p>Totals reflect the selected month and filters · Net = income − expenses</p>
          <p className="flex flex-wrap items-center gap-1.5"><Wallet className="h-3.5 w-3.5" />Total Account Balance (all time): <CompactAmount amount={totalAccountBalance} currency={userCurrency} label="total account balance" /></p>
        </div>
      </div>

      {/* Filters */}
      <Card className="rounded-[1.75rem] border-0 shadow-none">
        <CardContent className="p-5 sm:p-6">
          <div className={`grid gap-4 ${pocketId ? '' : 'md:grid-cols-2'}`}>
            {!pocketId && (
              <div className="flex flex-wrap items-center gap-2">
                <label htmlFor="transaction-pocket-filter" className="text-sm font-medium">Pocket</label>
                <select
                  id="transaction-pocket-filter"
                  className="h-10 min-w-0 max-w-full rounded-full border-0 bg-muted px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={pocketFilter}
                  onChange={event => updateQuery('pocket', event.target.value)}
                >
                  <option value="all">All pockets</option>
                  <option value="unassigned">Unassigned expenses</option>
                  {pockets.map(pocket => <option key={pocket.id} value={pocket.id}>{pocket.name}</option>)}
                </select>
                {pocketFilter !== 'all' && <Button variant="ghost" size="sm" className="rounded-full" onClick={() => updateQuery('pocket', 'all')}>Clear pocket filter</Button>}
              </div>
            )}
            <div className="relative min-w-0">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search transactions…"
                aria-label="Search transactions"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-11 rounded-full border-0 bg-muted/80 pl-10 shadow-none"
              />
            </div>

            <details className="col-span-full border-t border-border/60 pt-4">
              <summary className="w-fit cursor-pointer rounded text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Filters and sort{[typeFilter, categoryFilter, accountFilter].some(value => value !== 'all') ? ' · Filters active' : ''}</summary>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="rounded-xl bg-muted/50" aria-label="Filter transaction type">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="rounded-xl bg-muted/50" aria-label="Filter category">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {getUniqueCategories().map((category) => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={accountFilter} onValueChange={setAccountFilter}>
              <SelectTrigger className="rounded-xl bg-muted/50" aria-label="Filter account">
                <SelectValue placeholder="All Accounts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Accounts</SelectItem>
                {accounts.map((account) => {
                  let accountType = 'investment'; // default
                  if (account.current_balance !== undefined && !account.card_type) {
                    accountType = 'savings';
                  } else if (account.card_type) {
                    accountType = 'credit';
                  }
                  
                  return (
                    <SelectItem 
                      key={account.id} 
                      value={`${accountType}:${account.id}`}
                    >
                      {account.card_type ? '💳' : (accountType === 'savings' ? '💰' : '📈')} {account.account_name} ({account.institution_name})
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="rounded-xl bg-muted/50" aria-label="Sort transactions">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date_desc">Newest First</SelectItem>
                <SelectItem value="date_asc">Oldest First</SelectItem>
                <SelectItem value="amount_desc">Highest Amount</SelectItem>
                <SelectItem value="amount_asc">Lowest Amount</SelectItem>
              </SelectContent>
            </Select>
              </div>
            </details>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card className="rounded-[1.75rem] border-0 shadow-none">
        <CardHeader className="p-5 sm:p-6">
          <CardTitle className="text-base font-medium leading-relaxed">
            <span>
              Transactions for {format(new Date(`${selectedMonth}-01`), "MMMM yyyy")} ({transactions.length})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5 sm:px-6 sm:pb-6">
          {transactions.length === 0 ? (
            <div className="text-center py-10">
              <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/70"><Receipt className="h-6 w-6 text-primary" /></span>
              <p className="text-lg font-medium">No transactions found</p>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                Try adjusting your filters, or record your first income or expense for this month.
              </p>
              <Button className="mt-5 rounded-full px-5" onClick={() => { setEditingTransaction(null); setTransactionDialogOpen(true); }}>Add a transaction</Button>
            </div>
          ) : (
            <>
            {/* Phones: one stacked row per transaction so amount and actions stay visible */}
            <ul className="lg:hidden divide-y divide-border/60">
              {transactions.map((transaction) => (
                <li key={transaction.id} className="flex flex-wrap items-start gap-3 py-5">
                  <div className="min-w-0 basis-full sm:basis-48 sm:flex-1">
                    <p className="font-medium truncate">
                      {transaction.description || transaction.payees?.name || transaction.category}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {[formatDate(transaction.transaction_date), transaction.category, getAccountName(transaction)?.split(' (')[0]]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                    <p className="text-xs text-muted-foreground break-words">Pocket: {getPocketName(transaction)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className={`font-medium whitespace-nowrap tabular-nums ${transaction.type === 'income' ? 'text-success' : 'text-foreground'}`}>
                      {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount, userCurrency)}
                    </span>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditTransaction(transaction)}
                        className={transaction.type === 'expense' && !transaction.pocket_id ? 'h-8 px-2 text-xs' : 'h-8 w-8 p-0'}
                        aria-label={transaction.type === 'expense' && !transaction.pocket_id ? 'Assign pocket' : 'Edit transaction'}
                      >
                        <Edit className="h-4 w-4" />
                        {transaction.type === 'expense' && !transaction.pocket_id && <span>Assign pocket</span>}
                      </Button>
                      <DeleteTransactionButton onConfirm={() => handleDeleteTransaction(transaction.id)} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <Table className="hidden lg:table">
              <TableHeader className="bg-muted/60 [&_th]:text-xs [&_th:first-child]:rounded-l-xl [&_th:last-child]:rounded-r-xl">
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="hidden 2xl:table-cell">Payee</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="hidden 2xl:table-cell">Account</TableHead>
                  <TableHead>Pocket</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="hidden 2xl:table-cell">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction) => (
                  <TableRow key={transaction.id} className="border-border/60 hover:bg-muted/30">
                    <TableCell className="font-medium">
                      {formatDate(transaction.transaction_date)}
                    </TableCell>
                    <TableCell className="hidden 2xl:table-cell">
                      {transaction.payees?.name ? (
                        <span className="font-medium text-foreground">
                          {transaction.payees.name}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm">No payee</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {transaction.description ? (
                        <span className="text-sm">
                          {transaction.description}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm">No description</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="rounded-full bg-muted font-normal text-foreground">{transaction.category}</Badge>
                    </TableCell>
                    <TableCell className="hidden 2xl:table-cell">
                      {getAccountName(transaction) ? (
                        <div className="text-sm">
                          <div className="font-medium">{getAccountName(transaction)?.split(' (')[0]}</div>
                          <div className="text-muted-foreground text-xs">
                            {getAccountName(transaction)?.split(' (')[1]?.replace(')', '')}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">No account</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{getPocketName(transaction)}</TableCell>
                    <TableCell>
                      <Badge 
                        variant="secondary"
                        className={`rounded-full font-normal ${transaction.type === 'income' ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100' : 'bg-rose-50 text-rose-800 hover:bg-rose-100'}`}
                      >
                        {transaction.type === 'income' ? (
                          <TrendingUp className="h-3 w-3 mr-1" />
                        ) : (
                          <TrendingDown className="h-3 w-3 mr-1" />
                        )}
                        {transaction.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      <span className={`inline-block whitespace-nowrap tabular-nums ${transaction.type === 'income' ? 'text-success' : 'text-foreground'}`}>
                        {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount, userCurrency)}
                      </span>
                    </TableCell>
                    <TableCell className="hidden 2xl:table-cell">
                      <div className="flex gap-1">
                        {transaction.is_recurring && (
                          <Badge variant="outline" className="text-xs">Recurring</Badge>
                        )}
                        {transaction.ai_categorized && (
                          <Badge variant="outline" className="text-xs">AI</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditTransaction(transaction)}
                          className={transaction.type === 'expense' && !transaction.pocket_id ? 'h-8 px-2 text-xs whitespace-nowrap' : 'h-8 w-8 p-0'}
                          aria-label={transaction.type === 'expense' && !transaction.pocket_id ? 'Assign pocket' : 'Edit transaction'}
                        >
                          <Edit className="h-4 w-4" />
                          {transaction.type === 'expense' && !transaction.pocket_id && <span>Assign pocket</span>}
                        </Button>
                        <DeleteTransactionButton onConfirm={() => handleDeleteTransaction(transaction.id)} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </>
          )}
        </CardContent>
      </Card>
      
      <TransactionDialog
        open={transactionDialogOpen}
        onOpenChange={setTransactionDialogOpen}
        onSuccess={handleTransactionSuccess}
        onSaved={() => { void fetchTransactions(); void fetchAccounts(); }}
        pockets={pockets}
        editingTransaction={editingTransaction}
      />
      <BulkTransactionDialog open={bulkOpen} onOpenChange={setBulkOpen} onSaved={() => { void fetchTransactions(); void fetchAccounts(); }} currency={userCurrency} month={selectedMonth} />
      <ImportDialog open={importOpen} onOpenChange={open => { setImportOpen(open); if (!open) { void fetchTransactions(); void fetchAccounts(); } }} />
    </div>
  );
}
