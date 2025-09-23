-- Create investment_accounts table first
CREATE TABLE public.investment_accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  account_name text NOT NULL,
  institution_name text NOT NULL,
  account_type text NOT NULL,
  total_value numeric DEFAULT 0,
  account_number text,
  is_active boolean DEFAULT true,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on investment_accounts
ALTER TABLE public.investment_accounts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for investment_accounts
CREATE POLICY "Users can view their own investment accounts" 
ON public.investment_accounts 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own investment accounts" 
ON public.investment_accounts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own investment accounts" 
ON public.investment_accounts 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own investment accounts" 
ON public.investment_accounts 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_investment_accounts_updated_at
BEFORE UPDATE ON public.investment_accounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Now add account linking columns to transactions table
ALTER TABLE public.transactions 
ADD COLUMN savings_account_id uuid REFERENCES public.savings_accounts(id),
ADD COLUMN investment_account_id uuid REFERENCES public.investment_accounts(id);

-- Create indexes for better query performance
CREATE INDEX idx_transactions_savings_account ON public.transactions(savings_account_id);
CREATE INDEX idx_transactions_investment_account ON public.transactions(investment_account_id);