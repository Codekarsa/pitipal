-- Add payee_id column to transactions table
ALTER TABLE public.transactions 
ADD COLUMN payee_id uuid REFERENCES public.payees(id);

-- Create index for better performance
CREATE INDEX idx_transactions_payee_id ON public.transactions(payee_id);