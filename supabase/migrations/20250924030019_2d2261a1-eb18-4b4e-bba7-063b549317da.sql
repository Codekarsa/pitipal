-- Update the handle_new_user function to create default categories
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  expense_group_id UUID;
  income_group_id UUID;
  investment_group_id UUID;
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (user_id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'avatar_url'
  );

  -- Create default category groups
  INSERT INTO public.category_groups (user_id, name, description, type, icon, color, is_default)
  VALUES 
    (NEW.id, 'Essential Expenses', 'Basic living expenses and necessities', 'expense', 'home', '#ef4444', false),
    (NEW.id, 'Primary Income', 'Main sources of income', 'income', 'dollar-sign', '#22c55e', false),
    (NEW.id, 'Investment Portfolio', 'Investment and trading activities', 'investment', 'trending-up', '#3b82f6', false)
  RETURNING 
    CASE WHEN type = 'expense' THEN id END,
    CASE WHEN type = 'income' THEN id END,
    CASE WHEN type = 'investment' THEN id END
  INTO expense_group_id, income_group_id, investment_group_id;

  -- Get the created group IDs
  SELECT id INTO expense_group_id FROM public.category_groups 
  WHERE user_id = NEW.id AND type = 'expense' AND name = 'Essential Expenses';
  
  SELECT id INTO income_group_id FROM public.category_groups 
  WHERE user_id = NEW.id AND type = 'income' AND name = 'Primary Income';
  
  SELECT id INTO investment_group_id FROM public.category_groups 
  WHERE user_id = NEW.id AND type = 'investment' AND name = 'Investment Portfolio';

  -- Create default expense categories
  INSERT INTO public.categories (user_id, category_group_id, name, type, icon, color, is_default)
  VALUES 
    (NEW.id, expense_group_id, 'Food & Dining', 'expense', 'utensils', '#f97316', false),
    (NEW.id, expense_group_id, 'Transportation', 'expense', 'car', '#6366f1', false),
    (NEW.id, expense_group_id, 'Housing', 'expense', 'home', '#8b5cf6', false),
    (NEW.id, expense_group_id, 'Utilities', 'expense', 'zap', '#06b6d4', false),
    (NEW.id, expense_group_id, 'Healthcare', 'expense', 'heart', '#ec4899', false),
    (NEW.id, expense_group_id, 'Shopping', 'expense', 'shopping-bag', '#84cc16', false),
    (NEW.id, expense_group_id, 'Entertainment', 'expense', 'gamepad-2', '#f59e0b', false);

  -- Create default income categories  
  INSERT INTO public.categories (user_id, category_group_id, name, type, icon, color, is_default)
  VALUES 
    (NEW.id, income_group_id, 'Salary', 'income', 'briefcase', '#22c55e', false),
    (NEW.id, income_group_id, 'Freelance', 'income', 'user-check', '#10b981', false),
    (NEW.id, income_group_id, 'Investment Returns', 'income', 'trending-up', '#059669', false),
    (NEW.id, income_group_id, 'Business Income', 'income', 'building-2', '#047857', false),
    (NEW.id, income_group_id, 'Other Income', 'income', 'plus-circle', '#065f46', false);

  -- Create default investment categories
  INSERT INTO public.categories (user_id, category_group_id, name, type, icon, color, is_default)
  VALUES 
    (NEW.id, investment_group_id, 'Stocks', 'investment', 'line-chart', '#3b82f6', false),
    (NEW.id, investment_group_id, 'Bonds', 'investment', 'shield', '#6366f1', false),
    (NEW.id, investment_group_id, 'ETFs', 'investment', 'bar-chart-3', '#8b5cf6', false),
    (NEW.id, investment_group_id, 'Mutual Funds', 'investment', 'pie-chart', '#a855f7', false),
    (NEW.id, investment_group_id, 'Crypto', 'investment', 'bitcoin', '#c026d3', false),
    (NEW.id, investment_group_id, 'Real Estate', 'investment', 'building', '#dc2626', false);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;