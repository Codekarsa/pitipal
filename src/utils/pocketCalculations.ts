import { supabase } from "@/integrations/supabase/client";

export interface PocketSpending {
  // Primary identifiers (support both formats)
  id: string;
  pocketId: string;
  name: string;
  pocketName: string;

  // Budget amounts (support both formats)
  budget_amount: number;
  budgetAmount: number;
  current_amount: number;
  currentAmount: number;

  // Pocket metadata
  color: string;
  is_featured: boolean;
  pocket_type: string;
  budget_type: string;
  cycle_type: string;
  description?: string | null;

  // Transactions
  transactions: Array<{
    id: string;
    amount: number;
    type: string;
    category: string;
    transaction_date: string;
  }>;
}

export interface SpendingCalculationResult {
  pockets: PocketSpending[];
  totalBudget: number;
  totalSpent: number;
  totalRemaining: number;
}

/**
 * Fast batch calculation of pocket spending
 * - Single query for all transactions
 * - JavaScript grouping by category
 * - Returns complete spending data
 */
export async function calculatePocketSpending(
  userId: string,
  monthYear: string
): Promise<SpendingCalculationResult> {

  // Parallel queries for maximum speed
  const [pocketsResult, transactionsResult] = await Promise.all([
    // Query 1: Get all active pockets (not filtered by month - pockets are long-lived)
    supabase
      .from('budget_pockets')
      .select('id, name, budget_amount, color, is_featured, pocket_type, budget_type, cycle_type')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false }),

    // Query 2: Get ALL transactions for the month (single query)
    supabase
      .from('transactions')
      .select('id, amount, type, category, transaction_date')
      .eq('user_id', userId)
      .gte('transaction_date', `${monthYear}-01`)
      .lt('transaction_date', getNextMonth(monthYear))
      .order('transaction_date', { ascending: false })
  ]);

  if (pocketsResult.error) throw pocketsResult.error;
  if (transactionsResult.error) throw transactionsResult.error;

  const pockets = pocketsResult.data || [];
  const allTransactions = transactionsResult.data || [];

  // Fast JavaScript grouping by category
  const transactionsByCategory = new Map<string, typeof allTransactions>();

  for (const transaction of allTransactions) {
    const category = transaction.category;
    if (!transactionsByCategory.has(category)) {
      transactionsByCategory.set(category, []);
    }
    transactionsByCategory.get(category)!.push(transaction);
  }

  // Calculate spending for each pocket
  const pocketSpending: PocketSpending[] = pockets.map(pocket => {
    const categoryTransactions = transactionsByCategory.get(pocket.name) || [];

    // Calculate current spending from transactions
    const currentAmount = categoryTransactions.reduce((sum, tx) => {
      return sum + (tx.type === 'expense' ? tx.amount : -tx.amount);
    }, 0);

    return {
      // Support both naming conventions for compatibility
      id: pocket.id,
      pocketId: pocket.id,
      name: pocket.name,
      pocketName: pocket.name,
      budget_amount: pocket.budget_amount,
      budgetAmount: pocket.budget_amount,
      current_amount: currentAmount,
      currentAmount,
      color: pocket.color,
      is_featured: pocket.is_featured,
      pocket_type: pocket.pocket_type,
      budget_type: pocket.budget_type,
      cycle_type: pocket.cycle_type,
      transactions: categoryTransactions
    };
  });

  // Calculate totals
  const totalBudget = pocketSpending.reduce((sum, p) => sum + p.budgetAmount, 0);
  const totalSpent = pocketSpending.reduce((sum, p) => sum + p.currentAmount, 0);
  const totalRemaining = totalBudget - totalSpent;

  return {
    pockets: pocketSpending,
    totalBudget,
    totalSpent,
    totalRemaining
  };
}

/**
 * Get next month in YYYY-MM format for date range queries
 */
function getNextMonth(monthYear: string): string {
  const [year, month] = monthYear.split('-').map(Number);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;
}

/**
 * Calculate spending for a single pocket (for when you only need one)
 */
export async function calculateSinglePocketSpending(
  pocketName: string,
  userId: string,
  monthYear: string
): Promise<number> {

  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('amount, type')
    .eq('user_id', userId)
    .eq('category', pocketName)
    .gte('transaction_date', `${monthYear}-01`)
    .lt('transaction_date', getNextMonth(monthYear));

  if (error) throw error;

  return transactions?.reduce((sum, tx) => {
    return sum + (tx.type === 'expense' ? tx.amount : -tx.amount);
  }, 0) || 0;
}