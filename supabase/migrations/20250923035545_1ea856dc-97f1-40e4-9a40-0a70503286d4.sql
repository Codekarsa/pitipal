-- Update the check constraint to allow 'investment' type
ALTER TABLE public.categories DROP CONSTRAINT categories_type_check;

ALTER TABLE public.categories ADD CONSTRAINT categories_type_check 
CHECK (type = ANY (ARRAY['income'::text, 'expense'::text, 'investment'::text]));

-- Now insert default investment categories
INSERT INTO public.categories (name, type, icon, color, is_default) 
SELECT 'Stocks', 'investment', 'trendingUp', '#10b981', true
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE name = 'Stocks' AND type = 'investment');

INSERT INTO public.categories (name, type, icon, color, is_default) 
SELECT 'ETFs', 'investment', 'pieChart', '#3b82f6', true
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE name = 'ETFs' AND type = 'investment');

INSERT INTO public.categories (name, type, icon, color, is_default) 
SELECT 'Mutual Funds', 'investment', 'barChart3', '#8b5cf6', true
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE name = 'Mutual Funds' AND type = 'investment');

INSERT INTO public.categories (name, type, icon, color, is_default) 
SELECT 'Cryptocurrency', 'investment', 'bitcoin', '#f59e0b', true
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE name = 'Cryptocurrency' AND type = 'investment');

INSERT INTO public.categories (name, type, icon, color, is_default) 
SELECT 'Bonds', 'investment', 'shield', '#06b6d4', true
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE name = 'Bonds' AND type = 'investment');

INSERT INTO public.categories (name, type, icon, color, is_default) 
SELECT 'REITs', 'investment', 'building', '#ef4444', true
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE name = 'REITs' AND type = 'investment');

INSERT INTO public.categories (name, type, icon, color, is_default) 
SELECT 'Commodities', 'investment', 'coins', '#f97316', true
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE name = 'Commodities' AND type = 'investment');

INSERT INTO public.categories (name, type, icon, color, is_default) 
SELECT 'Options', 'investment', 'zap', '#ec4899', true
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE name = 'Options' AND type = 'investment');

INSERT INTO public.categories (name, type, icon, color, is_default) 
SELECT 'Dividend', 'investment', 'dollarSign', '#22c55e', true
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE name = 'Dividend' AND type = 'investment');

INSERT INTO public.categories (name, type, icon, color, is_default) 
SELECT 'Interest', 'investment', 'percent', '#14b8a6', true
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE name = 'Interest' AND type = 'investment');