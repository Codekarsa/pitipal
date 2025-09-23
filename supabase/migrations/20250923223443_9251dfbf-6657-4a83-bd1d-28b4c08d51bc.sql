-- Create assets table for stocks, ETFs, crypto, etc.
CREATE TABLE public.assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('stock', 'etf', 'crypto', 'mutual_fund', 'bond', 'commodity', 'other')),
  exchange TEXT,
  sector TEXT,
  currency TEXT DEFAULT 'USD',
  is_active BOOLEAN DEFAULT true,
  is_custom BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create holdings table to track user positions
CREATE TABLE public.holdings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  investment_account_id UUID NOT NULL REFERENCES public.investment_accounts(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  quantity NUMERIC NOT NULL DEFAULT 0,
  average_cost NUMERIC NOT NULL DEFAULT 0,
  current_value NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(investment_account_id, asset_id)
);

-- Create investment_transactions table for detailed investment transaction tracking
CREATE TABLE public.investment_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES public.assets(id),
  quantity NUMERIC NOT NULL,
  price_per_unit NUMERIC NOT NULL,
  fees NUMERIC DEFAULT 0,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('buy', 'sell', 'dividend', 'split', 'transfer')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investment_transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for assets
CREATE POLICY "Assets are viewable by everyone" ON public.assets
FOR SELECT USING (true);

CREATE POLICY "Users can create custom assets" ON public.assets
FOR INSERT WITH CHECK (auth.uid() = created_by AND is_custom = true);

CREATE POLICY "Users can update their custom assets" ON public.assets
FOR UPDATE USING (auth.uid() = created_by AND is_custom = true);

-- RLS policies for holdings
CREATE POLICY "Users can view their own holdings" ON public.holdings
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own holdings" ON public.holdings
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own holdings" ON public.holdings
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own holdings" ON public.holdings
FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for investment_transactions
CREATE POLICY "Users can view their own investment transactions" ON public.investment_transactions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.transactions t 
    WHERE t.id = investment_transactions.transaction_id 
    AND t.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create their own investment transactions" ON public.investment_transactions
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.transactions t 
    WHERE t.id = investment_transactions.transaction_id 
    AND t.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own investment transactions" ON public.investment_transactions
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.transactions t 
    WHERE t.id = investment_transactions.transaction_id 
    AND t.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own investment transactions" ON public.investment_transactions
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.transactions t 
    WHERE t.id = investment_transactions.transaction_id 
    AND t.user_id = auth.uid()
  )
);

-- Create indexes for better performance
CREATE INDEX idx_assets_symbol ON public.assets(symbol);
CREATE INDEX idx_assets_type ON public.assets(asset_type);
CREATE INDEX idx_holdings_user_account ON public.holdings(user_id, investment_account_id);
CREATE INDEX idx_holdings_asset ON public.holdings(asset_id);
CREATE INDEX idx_investment_transactions_transaction ON public.investment_transactions(transaction_id);
CREATE INDEX idx_investment_transactions_asset ON public.investment_transactions(asset_id);

-- Create triggers for updated_at timestamps
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

-- Function to update holdings after investment transactions
CREATE OR REPLACE FUNCTION public.update_holdings_on_transaction()
RETURNS TRIGGER AS $$
DECLARE
  holding_record public.holdings%ROWTYPE;
  new_quantity NUMERIC;
  new_avg_cost NUMERIC;
  total_cost NUMERIC;
BEGIN
  -- Get existing holding if any
  SELECT * INTO holding_record
  FROM public.holdings h
  JOIN public.transactions t ON t.investment_account_id = h.investment_account_id
  WHERE h.asset_id = NEW.asset_id 
  AND t.id = NEW.transaction_id;

  -- Calculate new quantity based on transaction type
  IF NEW.transaction_type = 'buy' THEN
    new_quantity = COALESCE(holding_record.quantity, 0) + NEW.quantity;
    
    -- Calculate new average cost
    IF COALESCE(holding_record.quantity, 0) = 0 THEN
      new_avg_cost = NEW.price_per_unit;
    ELSE
      total_cost = (holding_record.quantity * holding_record.average_cost) + (NEW.quantity * NEW.price_per_unit);
      new_avg_cost = total_cost / new_quantity;
    END IF;
  ELSIF NEW.transaction_type = 'sell' THEN
    new_quantity = COALESCE(holding_record.quantity, 0) - NEW.quantity;
    new_avg_cost = COALESCE(holding_record.average_cost, 0);
    
    -- Ensure quantity doesn't go negative
    IF new_quantity < 0 THEN
      RAISE EXCEPTION 'Cannot sell more shares than owned';
    END IF;
  ELSE
    -- For dividend, split, transfer - don't change quantity/cost for now
    RETURN NEW;
  END IF;

  -- Insert or update holding
  INSERT INTO public.holdings (user_id, investment_account_id, asset_id, quantity, average_cost)
  SELECT t.user_id, t.investment_account_id, NEW.asset_id, new_quantity, new_avg_cost
  FROM public.transactions t
  WHERE t.id = NEW.transaction_id
  ON CONFLICT (investment_account_id, asset_id)
  DO UPDATE SET
    quantity = new_quantity,
    average_cost = new_avg_cost,
    updated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for automatic holdings updates
CREATE TRIGGER update_holdings_after_investment_transaction
AFTER INSERT ON public.investment_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_holdings_on_transaction();

-- Insert default assets
INSERT INTO public.assets (symbol, name, asset_type, exchange, sector, is_custom) VALUES
('AAPL', 'Apple Inc.', 'stock', 'NASDAQ', 'Technology', false),
('GOOGL', 'Alphabet Inc.', 'stock', 'NASDAQ', 'Technology', false),
('MSFT', 'Microsoft Corporation', 'stock', 'NASDAQ', 'Technology', false),
('AMZN', 'Amazon.com Inc.', 'stock', 'NASDAQ', 'Consumer Discretionary', false),
('TSLA', 'Tesla Inc.', 'stock', 'NASDAQ', 'Consumer Discretionary', false),
('SPY', 'SPDR S&P 500 ETF Trust', 'etf', 'NYSE', 'Diversified', false),
('QQQ', 'Invesco QQQ Trust', 'etf', 'NASDAQ', 'Technology', false),
('VTI', 'Vanguard Total Stock Market ETF', 'etf', 'NYSE', 'Diversified', false),
('VTSAX', 'Vanguard Total Stock Market Index Fund', 'mutual_fund', null, 'Diversified', false),
('VTIAX', 'Vanguard Total International Stock Index Fund', 'mutual_fund', null, 'International', false),
('BTC', 'Bitcoin', 'crypto', null, 'Cryptocurrency', false),
('ETH', 'Ethereum', 'crypto', null, 'Cryptocurrency', false);