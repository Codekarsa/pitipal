-- Add pocket_type field to budget_pockets table to distinguish between expense and income pockets
ALTER TABLE public.budget_pockets 
ADD COLUMN pocket_type text NOT NULL DEFAULT 'expense';

-- Add check constraint to ensure valid pocket types
ALTER TABLE public.budget_pockets 
ADD CONSTRAINT budget_pockets_pocket_type_check 
CHECK (pocket_type IN ('expense', 'income'));

-- Create index for better query performance
CREATE INDEX idx_budget_pockets_pocket_type ON public.budget_pockets(pocket_type);