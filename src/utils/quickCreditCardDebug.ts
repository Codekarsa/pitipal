import { supabase } from "@/integrations/supabase/client";

export async function quickCreditCardDebug() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('❌ User not authenticated');
      return;
    }

    // Get user's currency preference
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('currency')
      .eq('id', user.id)
      .single();

    const currency = userProfile?.currency || 'USD';
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
      }).format(amount);
    };

    console.log('🔍 QUICK CREDIT CARD DEBUG');
    console.log('==========================');

    // Get all credit card transactions
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .not('credit_card_account_id', 'is', null)
      .order('transaction_date', { ascending: true });

    if (error) {
      console.error('❌ Error:', error);
      return;
    }

    console.log(`📊 Found ${transactions?.length || 0} credit card transactions\n`);

    let runningBalance = 0;
    let expenseCount = 0;
    let paymentCount = 0;
    let expenseTotal = 0;
    let paymentTotal = 0;

    // Show each transaction and running calculation
    transactions?.forEach((tx, index) => {
      const isPayment = tx.category === 'Credit Card Payment';

      if (isPayment) {
        runningBalance -= tx.amount;
        paymentCount++;
        paymentTotal += tx.amount;
      } else if (tx.type === 'expense') {
        runningBalance += tx.amount;
        expenseCount++;
        expenseTotal += tx.amount;
      }

      const symbol = isPayment ? '💳' : (tx.type === 'expense' ? '🛒' : '❓');
      const operation = isPayment ? 'PAYMENT' : 'EXPENSE';

      console.log(`${(index + 1).toString().padStart(2)}. ${tx.transaction_date} | ${symbol} ${operation.padEnd(7)} | ${formatCurrency(tx.amount).toString().padStart(12)} | "${tx.category || 'No Category'}" | Balance: ${formatCurrency(runningBalance)}`);
    });

    console.log('\n📊 SUMMARY:');
    console.log(`🛒 Expenses: ${expenseCount} transactions = ${formatCurrency(expenseTotal)}`);
    console.log(`💳 Payments: ${paymentCount} transactions = ${formatCurrency(paymentTotal)}`);
    console.log(`📊 Net Balance: ${formatCurrency(expenseTotal)} - ${formatCurrency(paymentTotal)} = ${formatCurrency(expenseTotal - paymentTotal)}`);
    console.log(`🧮 Calculated Balance: ${formatCurrency(runningBalance)}`);

    // Get current stored balance
    const { data: accounts } = await supabase
      .from('credit_card_accounts')
      .select('account_name, current_balance')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (accounts && accounts.length > 0) {
      console.log('\n💳 CURRENT STORED BALANCES:');
      accounts.forEach(acc => {
        console.log(`   ${acc.account_name}: ${formatCurrency(acc.current_balance)}`);
      });
    }

    console.log('\n🤔 ANALYSIS:');
    if (runningBalance < 0) {
      console.log('⚠️  Negative balance suggests:');
      console.log('   1. You\'ve paid more than you\'ve spent (credit balance)');
      console.log('   2. OR there\'s an issue with transaction categorization');
      console.log('   3. OR the starting balance wasn\'t accounted for');
    } else {
      console.log('✅ Positive balance - you owe this amount on your credit card');
    }

  } catch (error) {
    console.error('❌ Debug error:', error);
  }
}

// Make it available globally
(window as any).quickDebugCC = quickCreditCardDebug;