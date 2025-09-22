-- Add budget_type column to budget_pockets table
ALTER TABLE public.budget_pockets 
ADD COLUMN budget_type text NOT NULL DEFAULT 'regular_monthly';

-- Add check constraint for valid budget types
ALTER TABLE public.budget_pockets 
ADD CONSTRAINT budget_type_check 
CHECK (budget_type IN (
  'regular_monthly',
  'periodic_scheduled', 
  'goal_based',
  'emergency_irregular',
  'seasonal',
  'project_based',
  'debt_payment'
));

-- Add index for better performance
CREATE INDEX idx_budget_pockets_budget_type ON public.budget_pockets(budget_type);