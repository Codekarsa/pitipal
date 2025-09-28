import { supabase } from "@/integrations/supabase/client";

interface CreditCardAccount {
  id: string;
  account_name: string;
  current_balance: number;
}

interface Transaction {
  id: string;
  amount: number;
  type: string;
  category: string;
  credit_card_account_id: string;
}

export async function recalculateCreditCardBalances(userId: string, dryRun: boolean = true) {
  try {
    // Get user's currency preference
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('currency')
      .eq('id', userId)
      .single();

    const currency = userProfile?.currency || 'USD';
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
      }).format(amount);
    };

    console.log(`🔄 Starting credit card balance recalculation for user: ${userId}`);
    console.log(`📊 Mode: ${dryRun ? 'DRY RUN (no changes will be made)' : 'LIVE UPDATE'}`);

    // 1. Fetch all active credit card accounts for the user
    const { data: creditCardAccounts, error: accountsError } = await supabase
      .from('credit_card_accounts')
      .select('id, account_name, current_balance')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (accountsError) throw accountsError;

    if (!creditCardAccounts || creditCardAccounts.length === 0) {
      console.log('ℹ️ No active credit card accounts found');
      return { success: true, message: 'No credit card accounts to process' };
    }

    console.log(`📊 Found ${creditCardAccounts.length} credit card account(s)`);

    const results = [];

    // 2. For each credit card account, calculate balance from transactions
    for (const account of creditCardAccounts) {
      console.log(`\n💳 Processing: ${account.account_name} (ID: ${account.id})`);
      console.log(`📊 Current stored balance: ${formatCurrency(account.current_balance)}`);

      // Fetch all transactions for this credit card
      const { data: transactions, error: transactionsError } = await supabase
        .from('transactions')
        .select('id, amount, type, category, credit_card_account_id')
        .eq('user_id', userId)
        .eq('credit_card_account_id', account.id);

      if (transactionsError) throw transactionsError;

      // Calculate balance from transactions
      // Logic: Only transactions linked to this credit card account count
      let calculatedBalance = 0;

      if (!transactions || transactions.length === 0) {
        console.log(`   ℹ️  No transactions linked to this credit card account`);
      } else {
        transactions.forEach((transaction: Transaction) => {
          if (transaction.category === 'Credit Card Payment') {
            // Payments reduce the debt
            calculatedBalance -= transaction.amount;
            console.log(`   💳 Payment: -${transaction.amount} (Balance: ${calculatedBalance})`);
          } else {
            // All other transactions (purchases) increase the debt
            calculatedBalance += transaction.amount;
            console.log(`   🛒 Purchase: +${transaction.amount} (Balance: ${calculatedBalance})`);
          }
        });
      }

      console.log(`🧮 Calculated balance from ${transactions?.length || 0} transactions: ${formatCurrency(calculatedBalance)}`);
      console.log(`📊 Difference: ${formatCurrency(account.current_balance - calculatedBalance)}`);

      const result = {
        accountId: account.id,
        accountName: account.account_name,
        storedBalance: account.current_balance,
        calculatedBalance: calculatedBalance,
        difference: account.current_balance - calculatedBalance,
        transactionCount: transactions?.length || 0
      };

      results.push(result);

      // 3. Update the balance if not in dry run mode
      if (!dryRun && Math.abs(result.difference) > 0.01) { // Only update if there's a meaningful difference
        console.log(`💾 Updating balance from ${formatCurrency(account.current_balance)} to ${formatCurrency(calculatedBalance)}`);

        const { error: updateError } = await supabase
          .from('credit_card_accounts')
          .update({
            current_balance: calculatedBalance,
            updated_at: new Date().toISOString()
          })
          .eq('id', account.id)
          .eq('user_id', userId);

        if (updateError) {
          console.error(`❌ Error updating ${account.account_name}:`, updateError);
          result.updateStatus = 'failed';
          result.updateError = updateError.message;
        } else {
          console.log(`✅ Successfully updated ${account.account_name}`);
          result.updateStatus = 'success';
        }
      } else if (!dryRun) {
        console.log(`ℹ️ No update needed for ${account.account_name} (difference < ${formatCurrency(0.01)})`);
        result.updateStatus = 'skipped';
      }
    }

    // 4. Generate summary report
    const totalStoredBalance = results.reduce((sum, r) => sum + r.storedBalance, 0);
    const totalCalculatedBalance = results.reduce((sum, r) => sum + r.calculatedBalance, 0);
    const totalDifference = totalStoredBalance - totalCalculatedBalance;

    console.log(`\n📋 SUMMARY REPORT`);
    console.log(`=================`);
    console.log(`🏦 Total accounts processed: ${results.length}`);
    console.log(`💰 Total stored balance: ${formatCurrency(totalStoredBalance)}`);
    console.log(`🧮 Total calculated balance: ${formatCurrency(totalCalculatedBalance)}`);
    console.log(`📊 Total difference: ${formatCurrency(totalDifference)}`);

    if (dryRun) {
      console.log(`\n⚠️ This was a DRY RUN - no changes were made to the database`);
      console.log(`To apply changes, run with dryRun: false`);
    }

    return {
      success: true,
      summary: {
        accountsProcessed: results.length,
        totalStoredBalance,
        totalCalculatedBalance,
        totalDifference,
        dryRun
      },
      details: results
    };

  } catch (error) {
    console.error('❌ Error during credit card balance recalculation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: []
    };
  }
}

// Helper function to run recalculation with user authentication
export async function runCreditCardBalanceRecalculation(dryRun: boolean = true) {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User not authenticated');
    }

    return await recalculateCreditCardBalances(user.id, dryRun);
  } catch (error) {
    console.error('❌ Authentication error:', error);
    return {
      success: false,
      error: 'User not authenticated',
      details: []
    };
  }
}