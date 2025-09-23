-- Create investment_accounts table
CREATE TABLE IF NOT EXISTS public.investment_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  account_type TEXT NOT NULL DEFAULT 'brokerage',
  institution TEXT,
  account_number TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on investment_accounts
ALTER TABLE public.investment_accounts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for investment_accounts
CREATE POLICY "Users can view their own investment accounts" 
ON public.investment_accounts 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own investment accounts" 
ON public.investment_accounts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own investment accounts" 
ON public.investment_accounts 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own investment accounts" 
ON public.investment_accounts 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create assets table
CREATE TABLE IF NOT EXISTS public.assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  asset_type TEXT NOT NULL DEFAULT 'stock',
  exchange TEXT,
  is_custom BOOLEAN NOT NULL DEFAULT false,
  user_id UUID, -- Only set for custom assets
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on assets
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for assets
CREATE POLICY "Everyone can view assets" 
ON public.assets 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create their own custom assets" 
ON public.assets 
FOR INSERT 
WITH CHECK (is_custom = true AND auth.uid() = user_id);

CREATE POLICY "Users can update their own custom assets" 
ON public.assets 
FOR UPDATE 
USING (is_custom = true AND auth.uid() = user_id);

CREATE POLICY "Users can delete their own custom assets" 
ON public.assets 
FOR DELETE 
USING (is_custom = true AND auth.uid() = user_id);

-- Create holdings table
CREATE TABLE IF NOT EXISTS public.holdings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.investment_accounts(id) ON DELETE CASCADE,
  quantity NUMERIC NOT NULL DEFAULT 0,
  average_cost_basis NUMERIC NOT NULL DEFAULT 0,
  current_value NUMERIC,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, asset_id, account_id)
);

-- Enable RLS on holdings
ALTER TABLE public.holdings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for holdings
CREATE POLICY "Users can view their own holdings" 
ON public.holdings 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own holdings" 
ON public.holdings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own holdings" 
ON public.holdings 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own holdings" 
ON public.holdings 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create investment_transactions table
CREATE TABLE IF NOT EXISTS public.investment_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE RESTRICT,
  account_id UUID NOT NULL REFERENCES public.investment_accounts(id) ON DELETE RESTRICT,
  sub_type TEXT NOT NULL DEFAULT 'buy',
  quantity NUMERIC NOT NULL DEFAULT 0,
  price_per_unit NUMERIC NOT NULL DEFAULT 0,
  fees NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on investment_transactions
ALTER TABLE public.investment_transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for investment_transactions
CREATE POLICY "Users can view their own investment transactions" 
ON public.investment_transactions 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.transactions t 
  WHERE t.id = investment_transactions.transaction_id 
  AND t.user_id = auth.uid()
));

CREATE POLICY "Users can create their own investment transactions" 
ON public.investment_transactions 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.transactions t 
  WHERE t.id = investment_transactions.transaction_id 
  AND t.user_id = auth.uid()
));

CREATE POLICY "Users can update their own investment transactions" 
ON public.investment_transactions 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.transactions t 
  WHERE t.id = investment_transactions.transaction_id 
  AND t.user_id = auth.uid()
));

CREATE POLICY "Users can delete their own investment transactions" 
ON public.investment_transactions 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.transactions t 
  WHERE t.id = investment_transactions.transaction_id 
  AND t.user_id = auth.uid()
));

-- Add triggers for automatic timestamp updates
CREATE TRIGGER update_investment_accounts_updated_at
BEFORE UPDATE ON public.investment_accounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_assets_updated_at
BEFORE UPDATE ON public.assets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_holdings_updated_at
BEFORE UPDATE ON public.holdings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_investment_transactions_updated_at
BEFORE UPDATE ON public.investment_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default investment categories (without ON CONFLICT)
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

-- Insert some common assets (without ON CONFLICT)
INSERT INTO public.assets (symbol, name, asset_type, exchange, is_custom) 
SELECT 'AAPL', 'Apple Inc.', 'stock', 'NASDAQ', false
WHERE NOT EXISTS (SELECT 1 FROM public.assets WHERE symbol = 'AAPL');

INSERT INTO public.assets (symbol, name, asset_type, exchange, is_custom) 
SELECT 'GOOGL', 'Alphabet Inc.', 'stock', 'NASDAQ', false
WHERE NOT EXISTS (SELECT 1 FROM public.assets WHERE symbol = 'GOOGL');

INSERT INTO public.assets (symbol, name, asset_type, exchange, is_custom) 
SELECT 'MSFT', 'Microsoft Corporation', 'stock', 'NASDAQ', false
WHERE NOT EXISTS (SELECT 1 FROM public.assets WHERE symbol = 'MSFT');

INSERT INTO public.assets (symbol, name, asset_type, exchange, is_custom) 
SELECT 'TSLA', 'Tesla Inc.', 'stock', 'NASDAQ', false
WHERE NOT EXISTS (SELECT 1 FROM public.assets WHERE symbol = 'TSLA');

INSERT INTO public.assets (symbol, name, asset_type, exchange, is_custom) 
SELECT 'BTC', 'Bitcoin', 'crypto', null, false
WHERE NOT EXISTS (SELECT 1 FROM public.assets WHERE symbol = 'BTC');

INSERT INTO public.assets (symbol, name, asset_type, exchange, is_custom) 
SELECT 'ETH', 'Ethereum', 'crypto', null, false
WHERE NOT EXISTS (SELECT 1 FROM public.assets WHERE symbol = 'ETH');

INSERT INTO public.assets (symbol, name, asset_type, exchange, is_custom) 
SELECT 'SPY', 'SPDR S&P 500 ETF Trust', 'etf', 'NYSE', false
WHERE NOT EXISTS (SELECT 1 FROM public.assets WHERE symbol = 'SPY');

INSERT INTO public.assets (symbol, name, asset_type, exchange, is_custom) 
SELECT 'VTI', 'Vanguard Total Stock Market ETF', 'etf', 'NYSE', false
WHERE NOT EXISTS (SELECT 1 FROM public.assets WHERE symbol = 'VTI');