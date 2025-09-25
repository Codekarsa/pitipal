import { supabase } from "@/integrations/supabase/client";

// CSV Template Generators
export const generateCSVTemplate = async (type: 'transactions' | 'pockets' | 'categories' | 'accounts'): Promise<string> => {
  switch (type) {
    case 'transactions':
      return `date,description,amount,type,category,payee,notes,account_type,account_name
2024-01-01,"Grocery shopping",-50.00,expense,Food & Dining,Supermarket,"Weekly groceries",savings_account,Main Savings
2024-01-01,"Salary deposit",3000.00,income,Salary,Company,"Monthly salary",savings_account,Main Savings
2024-01-02,"Gas station",-40.00,expense,Transportation,Gas Station,"Car fuel",credit_card,My Credit Card`;

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
    case 'all':
      // For complete export, we'll return a ZIP-like structure in text format
      const [transactions, pockets, categories, accounts] = await Promise.all([
        exportTransactions(userId),
        exportBudgetPockets(userId),
        exportCategories(userId),
        exportAccounts(userId)
      ]);
      
      return `=== TRANSACTIONS ===\n${transactions}\n\n=== BUDGET POCKETS ===\n${pockets}\n\n=== CATEGORIES ===\n${categories}\n\n=== ACCOUNTS ===\n${accounts}`;
    
    default:
      throw new Error(`Unknown export type: ${dataType}`);
  }
};

// CSV Parsing Utilities
export const parseCSV = (csvText: string): string[][] => {
  const lines = csvText.split('\n');
  const result: string[][] = [];
  
  for (const line of lines) {
    if (line.trim()) {
      // Simple CSV parser - handles quoted fields
      const row: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          row.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      row.push(current.trim());
      result.push(row);
    }
  }
  
  return result;
};

export const validateCSVData = (data: string[][], type: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (data.length < 2) {
    errors.push("CSV file must contain at least a header row and one data row");
    return { isValid: false, errors };
  }

  const headers = data[0];
  
  switch (type) {
    case 'transactions':
      const requiredTransactionHeaders = ['date', 'amount', 'type', 'category'];
      for (const header of requiredTransactionHeaders) {
        if (!headers.some(h => h.toLowerCase().includes(header))) {
          errors.push(`Missing required column: ${header}`);
        }
      }
      break;
      
    case 'pockets':
      const requiredPocketHeaders = ['name', 'budget_amount', 'pocket_type'];
      for (const header of requiredPocketHeaders) {
        if (!headers.some(h => h.toLowerCase().includes(header))) {
          errors.push(`Missing required column: ${header}`);
        }
      }
      break;
      
    // Add more validation rules as needed
  }
  
  return { isValid: errors.length === 0, errors };
};