-- Create category_groups table
CREATE TABLE public.category_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6b7280',
  icon TEXT DEFAULT 'folder',
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  user_id UUID,
  is_default BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on category_groups
ALTER TABLE public.category_groups ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for category_groups
CREATE POLICY "Users can view category groups" 
ON public.category_groups 
FOR SELECT 
USING ((is_default = true) OR (auth.uid() = user_id));

CREATE POLICY "Users can create their own category groups" 
ON public.category_groups 
FOR INSERT 
WITH CHECK ((auth.uid() = user_id) AND (is_default = false));

CREATE POLICY "Users can update their own category groups" 
ON public.category_groups 
FOR UPDATE 
USING ((auth.uid() = user_id) AND (is_default = false));

CREATE POLICY "Users can delete their own category groups" 
ON public.category_groups 
FOR DELETE 
USING ((auth.uid() = user_id) AND (is_default = false));

-- Add category_group_id to categories table
ALTER TABLE public.categories 
ADD COLUMN category_group_id UUID REFERENCES public.category_groups(id) ON DELETE SET NULL;

-- Create trigger for category_groups updated_at
CREATE TRIGGER update_category_groups_updated_at
BEFORE UPDATE ON public.category_groups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default category groups for expenses
INSERT INTO public.category_groups (name, description, type, color, icon, is_default) VALUES
('Transportation', 'Transportation and travel related expenses', 'expense', '#ef4444', 'car', true),
('Food & Dining', 'Food, groceries and dining expenses', 'expense', '#f97316', 'utensils', true),
('Shopping', 'Shopping and retail purchases', 'expense', '#8b5cf6', 'shopping-bag', true),
('Entertainment', 'Entertainment and leisure activities', 'expense', '#ec4899', 'film', true),
('Bills & Utilities', 'Monthly bills and utility payments', 'expense', '#06b6d4', 'receipt', true),
('Healthcare', 'Medical and healthcare expenses', 'expense', '#10b981', 'heart', true),
('Education', 'Education and learning expenses', 'expense', '#3b82f6', 'graduation-cap', true),
('Other Expenses', 'Miscellaneous expense categories', 'expense', '#64748b', 'more-horizontal', true);

-- Insert default category groups for income
INSERT INTO public.category_groups (name, description, type, color, icon, is_default) VALUES
('Employment', 'Salary, wages and employment income', 'income', '#22c55e', 'briefcase', true),
('Business', 'Business and self-employment income', 'income', '#eab308', 'building', true),
('Investments', 'Investment returns and dividends', 'income', '#06b6d4', 'trending-up', true),
('Other Income', 'Miscellaneous income sources', 'income', '#64748b', 'plus-circle', true);

-- Update existing categories to link with appropriate category groups
UPDATE public.categories 
SET category_group_id = (
  SELECT id FROM public.category_groups 
  WHERE category_groups.type = categories.type 
  AND category_groups.name = 'Other Expenses' 
  AND category_groups.is_default = true
  LIMIT 1
)
WHERE type = 'expense' AND category_group_id IS NULL;

UPDATE public.categories 
SET category_group_id = (
  SELECT id FROM public.category_groups 
  WHERE category_groups.type = categories.type 
  AND category_groups.name = 'Other Income' 
  AND category_groups.is_default = true
  LIMIT 1
)
WHERE type = 'income' AND category_group_id IS NULL;