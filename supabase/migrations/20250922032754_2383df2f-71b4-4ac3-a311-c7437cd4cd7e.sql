-- Enable RLS on categories table
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all users to read default categories
CREATE POLICY "Anyone can view default categories" 
ON public.categories 
FOR SELECT 
USING (is_default = true);