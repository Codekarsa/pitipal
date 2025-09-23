-- Add account linking columns to transactions table
ALTER TABLE public.transactions 
ADD COLUMN savings_account_id uuid REFERENCES public.savings_accounts(id),
ADD COLUMN investment_account_id uuid REFERENCES public.investment_accounts(id);

-- Create indexes for better query performance
CREATE INDEX idx_transactions_savings_account ON public.transactions(savings_account_id);
CREATE INDEX idx_transactions_investment_account ON public.transactions(investment_account_id);