import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

// CSV Template Generators
export const generateCSVTemplate = async (type: 'transactions' | 'pockets' | 'categories' | 'accounts'): Promise<string> => {
  switch (type) {
    case 'transactions':
      return `date,description,amount,type,category,payee,notes,account_type,account_name,pocket
2024-01-01,"Grocery shopping",50.00,expense,Food & Dining,Supermarket,"Weekly groceries",savings_account,Main Savings,Food & Dining
2024-01-01,"Salary deposit",3000.00,income,Salary,Company,"Monthly salary",savings_account,Main Savings,
2024-01-02,"Gas station",40.00,expense,Transportation,Gas Station,"Car fuel",credit_card,My Credit Card,Transportation`;

    case 'pockets':
      return `name,budget_amount,pocket_type,cycle_type,description,color,icon
"Food & Dining",500,expense,monthly,"Monthly food budget",#ef4444,utensils
"Transportation",300,expense,monthly,"Car and public transport",#3b82f6,car
"Entertainment",200,expense,monthly,"Movies, games, fun activities",#8b5cf6,gamepad2
"Emergency Fund",1000,savings,monthly,"Emergency savings",#10b981,shield`;

    case 'categories':
      return `name,type,color,icon,description
"Food & Dining",expense,#ef4444,utensils,"Restaurants and groceries"
"Transportation",expense,#3b82f6,car,"Car, gas, public transport"
"Salary",income,#10b981,briefcase,"Employment income"
"Freelance",income,#f59e0b,laptop,"Freelance work income"`;

    case 'accounts':
      return `account_name,account_type,institution_name,current_balance,account_number,notes
"Main Checking",savings_account,"Chase Bank",1500.00,****1234,"Primary checking account"
"Emergency Savings",savings_account,"Chase Bank",5000.00,****5678,"Emergency fund"
"Chase Freedom",credit_card,"Chase Bank",0,****9012,"Cashback credit card"
"401k",investment_account,"Fidelity",25000.00,****3456,"Employer 401k"`;

    default:
      throw new Error(`Unknown template type: ${type}`);
  }
};

// CSV Export Functions
export const exportTransactions = async (userId: string): Promise<string> => {
  const { data: transactions, error } = await supabase
    .from("transactions")
    .select(`
      *,
      payees(name),
      savings_accounts(account_name, institution_name),
      credit_card_accounts(account_name, institution_name),
      investment_accounts(account_name, institution_name)
    `)
    .eq("user_id", userId)
    .order("transaction_date", { ascending: false });

  if (error) throw error;

  const headers = [
    "Date", "Description", "Amount", "Type", "Category", "Payee", "Notes",
    "Account Type", "Account Name", "Institution"
  ];

  const csvRows = [headers.join(",")];

  transactions?.forEach(transaction => {
    const accountType = transaction.savings_account_id ? "savings_account" :
                       transaction.credit_card_account_id ? "credit_card" :
                       transaction.investment_account_id ? "investment_account" : "";
    
    const accountName = transaction.savings_accounts?.[0]?.account_name ||
                       transaction.credit_card_accounts?.[0]?.account_name ||
                       transaction.investment_accounts?.[0]?.account_name || "";
    
    const institution = transaction.savings_accounts?.[0]?.institution_name ||
                       transaction.credit_card_accounts?.[0]?.institution_name ||
                       transaction.investment_accounts?.[0]?.institution_name || "";

    const row = [
      transaction.transaction_date,
      `"${transaction.description || ""}"`,
      transaction.amount,
      transaction.type,
      `"${transaction.category}"`,
      `"${transaction.payees?.name || ""}"`,
      `"${transaction.notes || ""}"`,
      accountType,
      `"${accountName}"`,
      `"${institution}"`
    ];
    csvRows.push(row.join(","));
  });

  return csvRows.join("\n");
};

export const exportBudgetPockets = async (userId: string): Promise<string> => {
  const { data: pockets, error } = await supabase
    .from("budget_pockets")
    .select("*")
    .eq("user_id", userId)
    .eq("is_template", false)
    .order("name");

  if (error) throw error;

  const headers = [
    "Name", "Budget Amount", "Current Amount", "Pocket Type", "Cycle Type",
    "Description", "Color", "Icon", "Auto Renew", "Active"
  ];

  const csvRows = [headers.join(",")];

  pockets?.forEach(pocket => {
    const row = [
      `"${pocket.name}"`,
      pocket.budget_amount,
      pocket.current_amount,
      pocket.pocket_type,
      pocket.cycle_type,
      `"${pocket.description || ""}"`,
      pocket.color,
      pocket.icon,
      pocket.auto_renew,
      pocket.is_active
    ];
    csvRows.push(row.join(","));
  });

  return csvRows.join("\n");
};

export const exportCategories = async (userId: string): Promise<string> => {
  const { data: categories, error } = await supabase
    .from("categories")
    .select("*")
    .or(`user_id.eq.${userId},is_default.eq.true`)
    .order("name");

  if (error) throw error;

  const headers = ["Name", "Type", "Color", "Icon", "Is Default"];
  const csvRows = [headers.join(",")];

  categories?.forEach(category => {
    const row = [
      `"${category.name}"`,
      category.type,
      category.color,
      category.icon,
      category.is_default
    ];
    csvRows.push(row.join(","));
  });

  return csvRows.join("\n");
};

export const exportAccounts = async (userId: string): Promise<string> => {
  // Fetch all account types
  const [savingsData, creditData, investmentData] = await Promise.all([
    supabase.from("savings_accounts").select("*").eq("user_id", userId),
    supabase.from("credit_card_accounts").select("*").eq("user_id", userId),
    supabase.from("investment_accounts").select("*").eq("user_id", userId)
  ]);

  const headers = [
    "Account Name", "Account Type", "Institution", "Current Balance",
    "Account Number", "Notes", "Active"
  ];

  const csvRows = [headers.join(",")];

  // Add savings accounts
  savingsData.data?.forEach(account => {
    const row = [
      `"${account.account_name}"`,
      "savings_account",
      `"${account.institution_name}"`,
      account.current_balance,
      `"${account.account_number || ""}"`,
      `"${account.notes || ""}"`,
      account.is_active
    ];
    csvRows.push(row.join(","));
  });

  // Add credit card accounts
  creditData.data?.forEach(account => {
    const row = [
      `"${account.account_name}"`,
      "credit_card",
      `"${account.institution_name}"`,
      account.current_balance,
      `"${account.account_number || ""}"`,
      `"${account.notes || ""}"`,
      account.is_active
    ];
    csvRows.push(row.join(","));
  });

  // Add investment accounts
  investmentData.data?.forEach(account => {
    const row = [
      `"${account.account_name}"`,
      "investment_account",
      `"${account.institution_name}"`,
      account.total_value,
      `"${account.account_number || ""}"`,
      `"${account.notes || ""}"`,
      account.is_active
    ];
    csvRows.push(row.join(","));
  });

  return csvRows.join("\n");
};

// CSV Export Utility
export const exportDataToCSV = async (userId: string, dataType: string): Promise<string> => {
  switch (dataType) {
    case 'transactions':
      return await exportTransactions(userId);
    case 'pockets':
      return await exportBudgetPockets(userId);
    case 'categories':
      return await exportCategories(userId);
    case 'accounts':
      return await exportAccounts(userId);
    case 'all': {
      // For complete export, we'll return a ZIP-like structure in text format
      const [transactions, pockets, categories, accounts] = await Promise.all([
        exportTransactions(userId),
        exportBudgetPockets(userId),
        exportCategories(userId),
        exportAccounts(userId)
      ]);
      
      return `=== TRANSACTIONS ===\n${transactions}\n\n=== BUDGET POCKETS ===\n${pockets}\n\n=== CATEGORIES ===\n${categories}\n\n=== ACCOUNTS ===\n${accounts}`;
    }
    
    default:
      throw new Error(`Unknown export type: ${dataType}`);
  }
};

// CSV Parsing Utilities
export const parseCSV = (csvText: string): string[][] => {
  const result: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  let closed = false;
  const text = csvText.replace(/^\uFEFF/, '');
  for (let i = 0; i <= text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === undefined) throw new Error('Unclosed quoted CSV field');
      if (char === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (char === '"') { quoted = false; closed = true; }
      else field += char;
    } else if (char === ',' || char === '\n' || char === '\r' || char === undefined) {
      row.push(field.trim());
      field = '';
      closed = false;
      if (char !== ',') {
        if (row.length > 1 || row.some(cell => cell !== '')) result.push(row);
        row = [];
        if (char === '\r' && text[i + 1] === '\n') i++;
      }
    } else if (char === '"') {
      if (field.trim() || closed) throw new Error('Unexpected quote in CSV field');
      field = '';
      quoted = true;
    } else {
      if (closed && char.trim()) throw new Error('Unexpected text after quoted CSV field');
      field += char;
    }
  }
  return result;
};

const normalizeHeader = (header: string) => header.trim().toLowerCase().replace(/\s+/g, '_');

export const validateCSVData = (data: string[][], type: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (data.length < 2) {
    errors.push("CSV file must contain at least a header row and one data row");
    return { isValid: false, errors };
  }

  const headers = data[0].map(normalizeHeader);
  if (new Set(headers).size !== headers.length) errors.push('Duplicate column headers');
  
  switch (type) {
    case 'transactions': {
      const requiredTransactionHeaders = ['date', 'amount', 'type', 'category'];
      for (const header of requiredTransactionHeaders) {
        if (!headers.includes(header)) {
          errors.push(`Missing required column: ${header}`);
        }
      }
      break;
    }
      
    case 'pockets': {
      const requiredPocketHeaders = ['name', 'budget_amount', 'pocket_type'];
      for (const header of requiredPocketHeaders) {
        if (!headers.includes(header)) {
          errors.push(`Missing required column: ${header}`);
        }
      }
      break;
    }
      
    // Add more validation rules as needed
  }
  
  return { isValid: errors.length === 0, errors };
};

// Helper to get column index from headers
const getColumnIndex = (headers: string[], columnName: string): number => {
  return headers.findIndex(h => normalizeHeader(h) === columnName);
};

type TransactionInsert = Database['public']['Tables']['transactions']['Insert'];
export interface TransactionImportRow {
  row: number;
  status: 'ready' | 'saved' | 'invalid' | 'duplicate';
  message: string;
  transaction?: TransactionInsert;
}
export interface TransactionImportReview {
  rows: TransactionImportRow[];
  ready: number;
  failed: number;
  skipped: number;
  income: number;
  expense: number;
  errors: string[];
}

// Page every lookup: Supabase's default row cap must not hide duplicates or ambiguity.
async function allRows<T>(fetchPage: (offset: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await fetchPage(offset);
    if (error) throw new Error(error.message);
    rows.push(...(data || []));
    if (!data || data.length < 500) return rows;
  }
}

const transactionKey = (tx: TransactionInsert) => JSON.stringify([
  tx.transaction_date, Math.abs(Number(tx.amount)), tx.type, tx.category.trim(),
  tx.description?.trim() || '', tx.notes?.trim() || '', tx.payee_id || '', tx.pocket_id || '',
  tx.savings_account_id || '', tx.credit_card_account_id || '', tx.investment_account_id || '',
]);

// Read-only review; the importer repeats this immediately before writing (never trust a stale preview).
export const reviewTransactionImport = async (data: string[][], userId: string): Promise<TransactionImportReview> => {
  const validation = validateCSVData(data, 'transactions');
  if (!validation.isValid) throw new Error(validation.errors.join('; '));
  const [payees, pockets, savings, credit, investments, existing] = await Promise.all([
    allRows(offset => supabase.from('payees').select('id,name').eq('user_id', userId).order('id').range(offset, offset + 499)),
    allRows(offset => supabase.from('budget_pockets').select('id,name,month_year').eq('user_id', userId).eq('is_template', false).order('id').range(offset, offset + 499)),
    allRows(offset => supabase.from('savings_accounts').select('id,account_name').eq('user_id', userId).order('id').range(offset, offset + 499)),
    allRows(offset => supabase.from('credit_card_accounts').select('id,account_name').eq('user_id', userId).order('id').range(offset, offset + 499)),
    allRows(offset => supabase.from('investment_accounts').select('id,account_name').eq('user_id', userId).order('id').range(offset, offset + 499)),
    allRows(offset => supabase.from('transactions').select('*').eq('user_id', userId).order('id').range(offset, offset + 499)),
  ]);
  const seen = new Set(existing.map(transactionKey));
  const headers = data[0];
  const review: TransactionImportReview = { rows: [], ready: 0, failed: 0, skipped: 0, income: 0, expense: 0, errors: [] };
  const match = (label: string, name: string, records: { id: string; name: string }[]) => {
    if (!name) return null;
    const matches = records.filter(record => record.name.trim().toLowerCase() === name.toLowerCase());
    if (matches.length !== 1) throw new Error(`${matches.length ? 'Ambiguous' : 'Unmatched'} ${label} "${name}"; correct the CSV or your records and review again`);
    return matches[0].id;
  };
  data.slice(1).forEach((row, index) => {
    const rowNumber = index + 2;
    const value = (column: string) => row[getColumnIndex(headers, column)]?.trim() || '';
    try {
      if (row.length !== headers.length) throw new Error(`Expected ${headers.length} columns, found ${row.length}`);
      const date = value('date');
      const dateObject = new Date(`${date}T00:00:00Z`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(dateObject.getTime()) || dateObject.toISOString().slice(0, 10) !== date || date.startsWith('0000')) {
        throw new Error('Invalid date; use a real YYYY-MM-DD date');
      }
      const amountText = value('amount');
      const amount = Math.abs(Number(amountText));
      if (!/^[+-]?(?:\d+(?:\.\d{1,2})?|\.\d{1,2})$/.test(amountText) || !Number.isFinite(amount) || amount <= 0 || amount > 9999999999999.99) {
        throw new Error('Invalid amount; use a non-zero number up to 9999999999999.99 with at most two decimal places (no separators)');
      }
      const type = value('type').toLowerCase();
      if (type !== 'income' && type !== 'expense') throw new Error('Invalid type; use income or expense');
      if (!value('category')) throw new Error('Category is required');
      const accountType = value('account_type').toLowerCase();
      const accountName = value('account_name');
      const accounts = { savings_account: savings, credit_card: credit, investment_account: investments };
      if ((accountType || accountName) && (!accountName || !Object.prototype.hasOwnProperty.call(accounts, accountType))) {
        throw new Error('Supply account_name and account_type (savings_account, credit_card or investment_account) together');
      }
      const accountId = accountName ? match('account', accountName, accounts[accountType as keyof typeof accounts].map(account => ({ id: account.id, name: account.account_name }))) : null;
      const transaction: TransactionInsert = {
        user_id: userId, transaction_date: date, amount, type, category: value('category'),
        description: value('description') || null, notes: value('notes') || null,
        payee_id: match('payee', value('payee'), payees),
        pocket_id: match(`pocket for ${date.slice(0, 7)}`, value('pocket'), pockets.filter(pocket => pocket.month_year === date.slice(0, 7))),
        savings_account_id: accountType === 'savings_account' ? accountId : null,
        credit_card_account_id: accountType === 'credit_card' ? accountId : null,
        investment_account_id: accountType === 'investment_account' ? accountId : null,
      };
      const key = transactionKey(transaction);
      if (seen.has(key)) {
        review.skipped++;
        review.rows.push({ row: rowNumber, status: 'duplicate', message: 'Matches an existing transaction or earlier CSV row; skipped', transaction });
      } else {
        seen.add(key);
        review.ready++;
        review[type] += amount;
        review.rows.push({ row: rowNumber, status: 'ready', message: 'Validated; supplied links resolved', transaction });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to validate row';
      review.failed++;
      review.errors.push(`Row ${rowNumber}: ${message}`);
      review.rows.push({ row: rowNumber, status: 'invalid', message });
    }
  });
  return review;
};

export const importTransactions = async (data: string[][], userId: string): Promise<{
  success: number; failed: number; skipped: number; errors: string[]; rows: TransactionImportRow[];
}> => {
  const review = await reviewTransactionImport(data, userId);
  let success = 0;
  let failed = review.failed;
  const errors = [...review.errors];
  for (const row of review.rows) {
    if (row.status !== 'ready' || !row.transaction) continue;
    try {
      const { error } = await supabase.from('transactions').insert(row.transaction);
      if (error) throw new Error(error.message);
      success++;
      row.status = 'saved';
      row.message = 'Saved';
    } catch (error) {
      row.status = 'invalid';
      row.message = error instanceof Error ? error.message : 'Save failed; review and retry';
      failed++;
      errors.push(`Row ${row.row}: ${row.message}`);
    }
  }
  return { success, failed, skipped: review.skipped, errors, rows: review.rows };
};

// Import Budget Pockets
export const importBudgetPockets = async (
  data: string[][],
  userId: string
): Promise<{ success: number; failed: number; errors: string[] }> => {
  const headers = data[0];
  const rows = data.slice(1);
  const errors: string[] = [];
  let success = 0;
  let failed = 0;

  // Get column indices
  const nameIdx = getColumnIndex(headers, 'name');
  const budgetAmountIdx = getColumnIndex(headers, 'budget_amount');
  const pocketTypeIdx = getColumnIndex(headers, 'pocket_type');
  const cycleTypeIdx = getColumnIndex(headers, 'cycle_type');
  const descriptionIdx = getColumnIndex(headers, 'description');
  const colorIdx = getColumnIndex(headers, 'color');
  const iconIdx = getColumnIndex(headers, 'icon');

  // Get current month for pocket instances
  const now = new Date();
  const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // Process each row
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // Account for header row and 0-index

    try {
      const name = row[nameIdx]?.trim();
      const budgetAmount = parseFloat(row[budgetAmountIdx]?.trim() || '0');
      const pocketType = row[pocketTypeIdx]?.trim().toLowerCase();
      const cycleType = cycleTypeIdx >= 0 ? row[cycleTypeIdx]?.trim().toLowerCase() : 'monthly';
      const description = descriptionIdx >= 0 ? row[descriptionIdx]?.trim() : '';
      const color = colorIdx >= 0 ? row[colorIdx]?.trim() : '#6b7280';
      const icon = iconIdx >= 0 ? row[iconIdx]?.trim() : 'wallet';

      // Validate required fields
      if (!name || isNaN(budgetAmount) || !pocketType) {
        errors.push(`Row ${rowNum}: Missing required fields (name, budget_amount, pocket_type)`);
        failed++;
        continue;
      }

      // Validate pocket_type
      if (pocketType !== 'expense' && pocketType !== 'savings') {
        errors.push(`Row ${rowNum}: Invalid pocket_type "${pocketType}". Must be "expense" or "savings"`);
        failed++;
        continue;
      }

      // Insert budget pocket as instance for current month
      const { error: pocketError } = await supabase
        .from('budget_pockets')
        .insert({
          user_id: userId,
          name: name,
          budget_amount: budgetAmount,
          pocket_type: pocketType,
          budget_type: pocketType === 'savings' ? 'savings' : 'expense',
          cycle_type: cycleType || 'monthly',
          description: description || null,
          color: color || '#6b7280',
          icon: icon || 'wallet',
          month_year: monthYear,
          is_template: false,
          is_active: true,
          is_featured: false,
          current_amount: 0,
        });

      if (pocketError) {
        errors.push(`Row ${rowNum}: ${pocketError.message}`);
        failed++;
      } else {
        success++;
      }
    } catch (error) {
      errors.push(`Row ${rowNum}: Unexpected error`);
      failed++;
    }
  }

  return { success, failed, errors };
};
