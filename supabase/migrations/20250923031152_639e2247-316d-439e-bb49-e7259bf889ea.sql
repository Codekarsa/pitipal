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

-- Insert default investment categories
INSERT INTO public.categories (name, type, icon, color, is_default) VALUES
('Stocks', 'investment', 'trendingUp', '#10b981', true),
('ETFs', 'investment', 'pieChart', '#3b82f6', true),
('Mutual Funds', 'investment', 'barChart3', '#8b5cf6', true),
('Cryptocurrency', 'investment', 'bitcoin', '#f59e0b', true),
('Bonds', 'investment', 'shield', '#06b6d4', true),
('REITs', 'investment', 'building', '#ef4444', true),
('Commodities', 'investment', 'coins', '#f97316', true),
('Options', 'investment', 'zap', '#ec4899', true),
('Dividend', 'investment', 'dollarSign', '#22c55e', true),
('Interest', 'investment', 'percent', '#14b8a6', true)
ON CONFLICT (name, type) DO NOTHING;

-- Insert some common assets
INSERT INTO public.assets (symbol, name, asset_type, exchange, is_custom) VALUES
('AAPL', 'Apple Inc.', 'stock', 'NASDAQ', false),
('GOOGL', 'Alphabet Inc.', 'stock', 'NASDAQ', false),
('MSFT', 'Microsoft Corporation', 'stock', 'NASDAQ', false),
('TSLA', 'Tesla Inc.', 'stock', 'NASDAQ', false),
('AMZN', 'Amazon.com Inc.', 'stock', 'NASDAQ', false),
('SPY', 'SPDR S&P 500 ETF Trust', 'etf', 'NYSE', false),
('VTI', 'Vanguard Total Stock Market ETF', 'etf', 'NYSE', false),
('QQQ', 'Invesco QQQ Trust', 'etf', 'NASDAQ', false),
('BTC', 'Bitcoin', 'crypto', null, false),
('ETH', 'Ethereum', 'crypto', null, false),
('VTSAX', 'Vanguard Total Stock Market Index Fund', 'mutual_fund', null, false),
('VTIAX', 'Vanguard Total International Stock Index Fund', 'mutual_fund', null, false)
ON CONFLICT (symbol) DO NOTHING;

-- Create function to update holdings based on investment transactions
CREATE OR REPLACE FUNCTION public.update_holdings_from_investment_transaction()
RETURNS TRIGGER AS $$
DECLARE
  quantity_change NUMERIC;
  total_cost NUMERIC;
  current_holding RECORD;
BEGIN
  -- Calculate quantity change based on sub_type
  CASE NEW.sub_type
    WHEN 'buy' THEN
      quantity_change := NEW.quantity;
      total_cost := NEW.quantity * NEW.price_per_unit + NEW.fees;
    WHEN 'sell' THEN
      quantity_change := -NEW.quantity;
      total_cost := -(NEW.quantity * NEW.price_per_unit - NEW.fees);
    ELSE
      quantity_change := 0;
      total_cost := 0;
  END CASE;

  -- Get current holding if exists
  SELECT * INTO current_holding
  FROM public.holdings h
  JOIN public.transactions t ON t.user_id = h.user_id
  WHERE h.asset_id = NEW.asset_id 
    AND h.account_id = NEW.account_id
    AND t.id = NEW.transaction_id;

  IF FOUND THEN
    -- Update existing holding
    UPDATE public.holdings
    SET 
      quantity = quantity + quantity_change,
      average_cost_basis = CASE 
        WHEN quantity + quantity_change > 0 THEN
          ((quantity * average_cost_basis) + total_cost) / (quantity + quantity_change)
        ELSE 0
      END,
      last_updated = now(),
      updated_at = now()
    WHERE id = current_holding.id;
  ELSE
    -- Create new holding
    INSERT INTO public.holdings (user_id, asset_id, account_id, quantity, average_cost_basis, last_updated)
    SELECT t.user_id, NEW.asset_id, NEW.account_id, quantity_change, 
           CASE WHEN quantity_change > 0 THEN ABS(total_cost / quantity_change) ELSE 0 END,
           now()
    FROM public.transactions t
    WHERE t.id = NEW.transaction_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for automatic holdings updates
CREATE TRIGGER update_holdings_on_investment_transaction
AFTER INSERT OR UPDATE ON public.investment_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_holdings_from_investment_transaction();