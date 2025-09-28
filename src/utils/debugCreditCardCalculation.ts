import { supabase } from "@/integrations/supabase/client";

export async function debugCreditCardCalculation() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('❌ User not authenticated');
      return;
    }

    console.log('🔍 DEBUGGING CREDIT CARD CALCULATION');
    console.log('====================================');

    // 1. Get current credit card accounts
    const { data: accounts, error: accountsError } = await supabase
      .from('credit_card_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (accountsError) {
      console.error('❌ Error fetching accounts:', accountsError);
      return;
    }

    console.log(`\n📊 Found ${accounts?.length || 0} credit card account(s)`);

    for (const account of accounts || []) {
      console.log(`\n💳 Account: ${account.account_name}`);
      console.log(`📊 Current stored balance: ${account.current_balance}`);

      // 2. Get all transactions for this credit card
      const { data: transactions, error: transError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .eq('credit_card_account_id', account.id)
        .order('transaction_date', { ascending: true });

      if (transError) {
        console.error('❌ Error fetching transactions:', transError);
        continue;
      }

      console.log(`📝 Found ${transactions?.length || 0} transactions:`);

      let calculatedBalance = 0;
      let expenseTotal = 0;
      let paymentTotal = 0;

      transactions?.forEach((tx, index) => {
        const isPayment = tx.category === 'Credit Card Payment';
        const change = isPayment ? -tx.amount : tx.amount;
        calculatedBalance += change;

        if (isPayment) {
          paymentTotal += tx.amount;
        } else if (tx.type === 'expense') {
          expenseTotal += tx.amount;
        }

        console.log(`  ${index + 1}. ${tx.transaction_date} | "${tx.category || 'No Category'}" | ${tx.type} | $${tx.amount} | ${isPayment ? '💳 PAYMENT' : '🛒 EXPENSE'} | Running Balance: $${calculatedBalance}`);
      });

      console.log(`\n🔍 TRANSACTION BREAKDOWN:`);
      console.log(`   📝 Total Transactions: ${transactions?.length || 0}`);
      console.log(`   🛒 Expense Transactions: ${transactions?.filter(tx => tx.type === 'expense' && tx.category !== 'Credit Card Payment').length || 0}`);
      console.log(`   💳 Payment Transactions: ${transactions?.filter(tx => tx.category === 'Credit Card Payment').length || 0}`);
      console.log(`   📊 Other Transactions: ${transactions?.filter(tx => tx.type !== 'expense' && tx.category !== 'Credit Card Payment').length || 0}`);

      console.log(`\n📊 SUMMARY for ${account.account_name}:`);
      console.log(`   Total Expenses: +${expenseTotal}`);
      console.log(`   Total Payments: -${paymentTotal}`);
      console.log(`   Net Balance: ${expenseTotal - paymentTotal}`);
      console.log(`   Calculated Balance: ${calculatedBalance}`);
      console.log(`   Stored Balance: ${account.current_balance}`);
      console.log(`   Difference: ${account.current_balance - calculatedBalance}`);

      if (Math.abs(account.current_balance - calculatedBalance) > 0.01) {
        console.log(`   ⚠️  MISMATCH DETECTED!`);
      } else {
        console.log(`   ✅ Balances match`);
      }
    }

    // 3. Show total debt calculation
    const totalStoredDebt = accounts?.reduce((sum, acc) => sum + acc.current_balance, 0) || 0;
    console.log(`\n💰 TOTAL DEBT SUMMARY:`);
    console.log(`   Total Stored Debt: ${totalStoredDebt}`);

  } catch (error) {
    console.error('❌ Debug error:', error);
  }
}

// Function to be called from browser console
(window as any).debugCreditCards = debugCreditCardCalculation;