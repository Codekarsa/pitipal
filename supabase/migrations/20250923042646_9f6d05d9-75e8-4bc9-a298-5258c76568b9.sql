-- Create savings accounts table
CREATE TABLE public.savings_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  account_name TEXT NOT NULL,
  institution_name TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('checking', 'savings', 'cd', 'money_market', 'high_yield_savings')),
  account_number TEXT,
  routing_number TEXT,
  current_balance NUMERIC DEFAULT 0,
  interest_rate NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.savings_accounts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for savings accounts
CREATE POLICY "Users can view their own savings accounts" 
ON public.savings_accounts 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own savings accounts" 
ON public.savings_accounts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own savings accounts" 
ON public.savings_accounts 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own savings accounts" 
ON public.savings_accounts 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_savings_accounts_updated_at
BEFORE UPDATE ON public.savings_accounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();