import { supabase } from "@/integrations/supabase/client";

export interface CreditCardBalance {
  accountId: string;
  accountName: string;
  institutionName: string;
  creditLimit: number;
  currentBalance: number;
  minimumPayment: number;
  dueDate: string | null;
  isActive: boolean;
  transactions: Array<{
    id: string;
    amount: number;
    type: string;
    category: string;
    transaction_date: string;
  }>;
}

export interface CreditCardCalculationResult {
  accounts: CreditCardBalance[];
  totalDebt: number;
  totalCreditLimit: number;
  totalAvailableCredit: number;
  averageUtilization: number;
}

/**
 * Fast batch calculation of credit card balances from transactions
 * - Single query for all credit card transactions
 * - JavaScript grouping by credit_card_account_id
 * - Returns complete balance data
 */
export async function calculateCreditCardBalances(
  userId: string
): Promise<CreditCardCalculationResult> {

  // Parallel queries for maximum speed
  const [accountsResult, transactionsResult] = await Promise.all([
    // Query 1: Get all active credit card accounts
    supabase
      .from('credit_card_accounts')
      .select('id, account_name, institution_name, credit_limit, minimum_payment, due_date, is_active')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('account_name'),

    // Query 2: Get ALL credit card transactions (single query)
    supabase
      .from('transactions')
      .select('id, amount, type, category, transaction_date, credit_card_account_id')
      .eq('user_id', userId)
      .not('credit_card_account_id', 'is', null)
      .order('transaction_date', { ascending: false })
  ]);

  if (accountsResult.error) throw accountsResult.error;
  if (transactionsResult.error) throw transactionsResult.error;

  const accounts = accountsResult.data || [];
  const allTransactions = transactionsResult.data || [];

  // Fast JavaScript grouping by credit card account
  const transactionsByAccount = new Map<string, typeof allTransactions>();

  for (const transaction of allTransactions) {
    const accountId = transaction.credit_card_account_id;
    if (!transactionsByAccount.has(accountId)) {
      transactionsByAccount.set(accountId, []);
    }
    transactionsByAccount.get(accountId)!.push(transaction);
  }

  // Calculate balance for each credit card account
  const creditCardBalances: CreditCardBalance[] = accounts.map(account => {
    const accountTransactions = transactionsByAccount.get(account.id) || [];

    // Calculate current balance from transactions
    // Logic: Start from 0, add expenses, subtract payments
    const currentBalance = accountTransactions.reduce((balance, tx) => {
      if (tx.category === 'Credit Card Payment') {
        // Payments reduce the debt (subtract from balance)
        return balance - tx.amount;
      } else {
        // All other transactions are purchases (add to balance)
        return balance + tx.amount;
      }
    }, 0);

    return {
      accountId: account.id,
      accountName: account.account_name,
      institutionName: account.institution_name,
      creditLimit: account.credit_limit,
      currentBalance: Math.max(0, currentBalance), // Don't allow negative balances
      minimumPayment: account.minimum_payment,
      dueDate: account.due_date,
      isActive: account.is_active,
      transactions: accountTransactions
    };
  });

  // Calculate totals
  const totalDebt = creditCardBalances.reduce((sum, acc) => sum + acc.currentBalance, 0);
  const totalCreditLimit = creditCardBalances.reduce((sum, acc) => sum + acc.creditLimit, 0);
  const totalAvailableCredit = totalCreditLimit - totalDebt;
  const averageUtilization = totalCreditLimit > 0 ? (totalDebt / totalCreditLimit) * 100 : 0;

  return {
    accounts: creditCardBalances,
    totalDebt,
    totalCreditLimit,
    totalAvailableCredit,
    averageUtilization
  };
}

/**
 * Calculate balance for a single credit card account
 */
export async function calculateSingleCreditCardBalance(
  accountId: string,
  userId: string
): Promise<number> {

  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('amount, category')
    .eq('user_id', userId)
    .eq('credit_card_account_id', accountId);

  if (error) throw error;

  return transactions?.reduce((balance, tx) => {
    if (tx.category === 'Credit Card Payment') {
      return balance - tx.amount;
    } else {
      return balance + tx.amount;
    }
  }, 0) || 0;
}

/**
 * Get credit card accounts with calculated balances for forms/dropdowns
 */
export async function getCreditCardAccountsWithBalances(userId: string) {
  const result = await calculateCreditCardBalances(userId);

  return result.accounts.map(acc => ({
    id: acc.accountId,
    account_name: acc.accountName,
    institution_name: acc.institutionName,
    current_balance: acc.currentBalance,
    credit_limit: acc.creditLimit,
    minimum_payment: acc.minimumPayment,
    due_date: acc.dueDate,
    is_active: acc.isActive
  }));
}