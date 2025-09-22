-- Add currency column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN currency TEXT DEFAULT 'USD';