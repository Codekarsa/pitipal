-- Create credit card accounts table
CREATE TABLE public.credit_card_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  account_name TEXT NOT NULL,
  institution_name TEXT NOT NULL,
  card_type TEXT NOT NULL DEFAULT 'credit_card', -- credit_card, store_card, line_of_credit
  credit_limit NUMERIC NOT NULL DEFAULT 0,
  current_balance NUMERIC NOT NULL DEFAULT 0,
  minimum_payment NUMERIC NOT NULL DEFAULT 0,
  apr NUMERIC NOT NULL DEFAULT 0, -- Annual Percentage Rate
  due_date INTEGER NOT NULL DEFAULT 1, -- Day of month (1-31)
  account_number TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.credit_card_accounts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for credit card accounts
CREATE POLICY "Users can view their own credit card accounts" 
ON public.credit_card_accounts 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own credit card accounts" 
ON public.credit_card_accounts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own credit card accounts" 
ON public.credit_card_accounts 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own credit card accounts" 
ON public.credit_card_accounts 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_credit_card_accounts_updated_at
BEFORE UPDATE ON public.credit_card_accounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add credit_card_account_id to transactions table for credit card payments
ALTER TABLE public.transactions 
ADD COLUMN credit_card_account_id UUID REFERENCES public.credit_card_accounts(id);

-- Create index for better performance
CREATE INDEX idx_credit_card_accounts_user_id ON public.credit_card_accounts(user_id);
CREATE INDEX idx_transactions_credit_card_account_id ON public.transactions(credit_card_account_id);