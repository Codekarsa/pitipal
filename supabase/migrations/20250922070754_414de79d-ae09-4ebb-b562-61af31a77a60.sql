-- Add user_id column to categories table for custom categories
ALTER TABLE public.categories ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update RLS policies to allow users to manage their own categories
DROP POLICY IF EXISTS "Anyone can view default categories" ON public.categories;

-- Allow users to view default categories and their own custom categories
CREATE POLICY "Users can view categories" ON public.categories
FOR SELECT USING (
  is_default = true OR auth.uid() = user_id
);

-- Allow users to create their own custom categories
CREATE POLICY "Users can create their own categories" ON public.categories
FOR INSERT WITH CHECK (
  auth.uid() = user_id AND is_default = false
);

-- Allow users to update their own custom categories
CREATE POLICY "Users can update their own categories" ON public.categories
FOR UPDATE USING (
  auth.uid() = user_id AND is_default = false
);

-- Allow users to delete their own custom categories
CREATE POLICY "Users can delete their own categories" ON public.categories
FOR DELETE USING (
  auth.uid() = user_id AND is_default = false
);