import { useState, useEffect } from "react";
import { useAuth } from "@/components/auth/useAuth";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Filter, ArrowUpDown, TrendingUp, TrendingDown, Edit, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { TransactionDialog } from "@/components/dashboard/TransactionDialog";

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
  is_recurring: boolean | null;
  ai_categorized: boolean | null;
  created_at: string;
}

interface Account {
  id: string;
  account_name: string;
  institution_name: string;
  account_type: string;
  current_balance?: number;
  total_value?: number;
}

export function TransactionsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { pocketId } = useParams();
  const navigate = useNavigate();
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
  const [deletingTransactionId, setDeletingTransactionId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchTransactions();
      fetchUserProfile();
      fetchAccounts();
      if (pocketId) {
        fetchPocketName();
      }
    }
  }, [user, pocketId]);

  const fetchUserProfile = async () => {
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
  };

  const fetchPocketName = async () => {
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
  };

  const fetchAccounts = async () => {
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

      if (savingsError) throw savingsError;
      if (investmentError) throw investmentError;

      const allAccounts: Account[] = [
        ...(savingsData || []).map(acc => ({ ...acc, current_balance: acc.current_balance })),
        ...(investmentData || []).map(acc => ({ ...acc, total_value: acc.total_value }))
      ];

      setAccounts(allAccounts);
      
      // Calculate total balance
      const totalBalance = allAccounts.reduce((sum, acc) => 
        sum + (acc.current_balance || acc.total_value || 0), 0);
      setTotalAccountBalance(totalBalance);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user?.id);

      // Apply filters
      if (pocketId) {
        query = query.eq('pocket_id', pocketId);
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

      let filteredData = data || [];

      // Apply search filter
      if (searchTerm) {
        filteredData = filteredData.filter(transaction => {
          const matchesDescription = transaction.description?.toLowerCase().includes(searchTerm.toLowerCase());
          const matchesCategory = transaction.category.toLowerCase().includes(searchTerm.toLowerCase());
          
          // Also search in account names
          let matchesAccount = false;
          if (transaction.savings_account_id || transaction.investment_account_id) {
            const account = accounts.find(acc => 
              acc.id === transaction.savings_account_id || acc.id === transaction.investment_account_id
            );
            if (account) {
              matchesAccount = account.account_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             account.institution_name.toLowerCase().includes(searchTerm.toLowerCase());
            }
          }
          
          return matchesDescription || matchesCategory || matchesAccount;
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
  };

  useEffect(() => {
    if (user) {
      fetchTransactions();
    }
  }, [typeFilter, categoryFilter, accountFilter, sortBy, searchTerm]);

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
    return null;
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setTransactionDialogOpen(true);
  };

  const handleDeleteTransaction = async (transactionId: string) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', transactionId)
        .eq('user_id', user?.id);

      if (error) throw error;

      toast({
        title: "Transaction deleted",
        description: "The transaction has been successfully deleted.",
      });

      // Refresh transactions
      fetchTransactions();
      fetchAccounts();
    } catch (error: any) {
      toast({
        title: "Error deleting transaction",
        description: error.message,
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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Transactions</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {pocketId ? `${pocketName} Transactions` : 'Transactions'}
          </h1>
          <p className="text-muted-foreground">
            {pocketId ? `Transactions for ${pocketName} pocket` : 'Track and manage all your financial transactions'}
          </p>
          {pocketId && (
            <button 
              onClick={() => navigate('/transactions')}
              className="text-sm text-primary hover:underline mt-1"
            >
              ← View all transactions
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-card border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Income</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.income, userCurrency)}</p>
              </div>
              <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Expenses</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(stats.expenses, userCurrency)}</p>
              </div>
              <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center">
                <TrendingDown className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Net Amount</p>
                <p className={`text-2xl font-bold ${stats.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(stats.net, userCurrency)}
                </p>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                stats.net >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'
              }`}>
                {stats.net >= 0 ? 
                  <TrendingUp className="h-6 w-6 text-green-600" /> :
                  <TrendingDown className="h-6 w-6 text-red-600" />
                }
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Account Balance</p>
                <p className="text-2xl font-bold text-primary">{formatCurrency(totalAccountBalance, userCurrency)}</p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                <div className="h-6 w-6 rounded-full bg-primary/20 border-2 border-primary"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
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
              <SelectTrigger>
                <SelectValue placeholder="All Accounts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Accounts</SelectItem>
                {accounts.map((account) => (
                  <SelectItem 
                    key={account.id} 
                    value={`${account.current_balance !== undefined ? 'savings' : 'investment'}:${account.id}`}
                  >
                    {account.account_name} ({account.institution_name})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
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
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>All Transactions ({transactions.length})</span>
            <Button variant="outline" size="sm">
              <ArrowUpDown className="h-4 w-4 mr-2" />
              Sort
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No transactions found</p>
              <p className="text-sm text-muted-foreground mt-2">
                Try adjusting your filters or add some transactions to get started
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="font-medium">
                      {formatDate(transaction.transaction_date)}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {transaction.description || 'No description'}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{transaction.category}</Badge>
                    </TableCell>
                    <TableCell>
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
                    <TableCell>
                      <Badge 
                        variant={transaction.type === 'income' ? 'default' : 'destructive'}
                        className={transaction.type === 'income' ? 'bg-green-500/10 text-green-700 hover:bg-green-500/20' : ''}
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
                      <span className={transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}>
                        {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount, userCurrency)}
                      </span>
                    </TableCell>
                    <TableCell>
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
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
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
                                onClick={() => handleDeleteTransaction(transaction.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
      <TransactionDialog
        open={transactionDialogOpen}
        onOpenChange={setTransactionDialogOpen}
        onSuccess={handleTransactionSuccess}
        pockets={[]}
        editingTransaction={editingTransaction}
      />
    </div>
  );
}