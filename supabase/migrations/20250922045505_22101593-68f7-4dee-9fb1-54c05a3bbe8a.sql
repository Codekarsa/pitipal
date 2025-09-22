-- Add featured field to budget_pockets table
ALTER TABLE public.budget_pockets 
ADD COLUMN is_featured boolean DEFAULT false NOT NULL;