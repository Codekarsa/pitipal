-- Stock research schema (StockPal feature)
-- Stores analyst-workbook data (statements, ratios, breakdowns, forecasts,
-- insights, chart definitions) so the app can render full equity research
-- pages and charts. Modeled from sample workbook BBCA.xlsx.
--
-- Anchored on public.assets: each researched company (and each peer that
-- appears in benchmark/market-share data) is an assets row. Research data is
-- shared reference data, like assets: everyone can view, authenticated users
-- maintain it.

-- ============================================================
-- Company-level research profile (1:1 extension of assets)
-- ============================================================

CREATE TABLE public.research_company_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID NOT NULL UNIQUE REFERENCES public.assets(id) ON DELETE CASCADE,
  kbmi_tier SMALLINT,                 -- Indonesian bank capital tier (Benchmark sheet)
  credit_focus TEXT,                  -- 'Corporate', 'Consumer', ... (Benchmark sheet)
  is_covered BOOLEAN NOT NULL DEFAULT false,  -- true = full analysis, false = peer-only
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================================
-- Shared reference tables
-- ============================================================

-- Reporting periods. 'FY 2024 Restated' = (2024, 'FY', is_restated = true).
CREATE TABLE public.research_periods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fiscal_year SMALLINT NOT NULL,
  period_type TEXT NOT NULL CHECK (period_type IN ('Q1', 'Q2', 'Q3', 'Q4', 'FY')),
  is_restated BOOLEAN NOT NULL DEFAULT false,
  end_date DATE,
  label TEXT NOT NULL,                -- 'Q1 2026', 'FY 2024 Restated'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (fiscal_year, period_type, is_restated)
);

-- Canonical chart-of-accounts for the three statement sheets.
CREATE TABLE public.research_line_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  statement TEXT NOT NULL CHECK (statement IN ('income_statement', 'balance_sheet', 'cash_flow')),
  code TEXT NOT NULL UNIQUE,          -- 'interest_income', 'cash', 'cfo_interest_received'
  label_en TEXT NOT NULL,
  label_id TEXT,                      -- Indonesian label
  parent_id UUID REFERENCES public.research_line_items(id),
  display_order INTEGER NOT NULL DEFAULT 0,
  is_subtotal BOOLEAN NOT NULL DEFAULT false,
  unit TEXT NOT NULL DEFAULT 'idr_million'
    CHECK (unit IN ('idr_million', 'idr_billion', 'idr', 'percent', 'ratio', 'count')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Named ratios / derived measures: NIM, CASA, LDR, NPL, LAR, CAR, Cost of
-- Fund, Cost of Credit, CKPN-to-loan, FCF, RWA, market_share, LCR, NSFR, ...
CREATE TABLE public.research_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,          -- 'nim', 'casa_ratio', 'npl', 'fcf'
  label TEXT NOT NULL,
  description TEXT,                   -- definition / formula notes
  unit TEXT NOT NULL DEFAULT 'percent'
    CHECK (unit IN ('idr_million', 'idr_billion', 'idr', 'percent', 'ratio', 'count')),
  higher_is_better BOOLEAN,           -- null = neutral/contextual
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Breakdown axes: 'loan_segment', 'deposit_type', 'industry',
-- 'revenue_stream', 'sbdk_category', ...
CREATE TABLE public.research_dimensions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.research_dimension_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dimension_id UUID NOT NULL REFERENCES public.research_dimensions(id) ON DELETE CASCADE,
  code TEXT NOT NULL,                 -- 'corporate', 'sme', 'demand_deposit'
  label TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (dimension_id, code)
);

-- Provenance: which uploaded workbook produced which facts.
CREATE TABLE public.research_source_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  sha256 TEXT,
  uploaded_by UUID,                   -- auth.users id
  imported_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================================
-- Fact tables
-- ============================================================

-- Statement values (Income Statement / Balance Sheet / Cash Flow sheets).
-- Bank quarterlies are reported cumulative, hence basis 'ytd'; importer may
-- also store differenced 'standalone' values for per-quarter charts.
CREATE TABLE public.research_financial_facts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  line_item_id UUID NOT NULL REFERENCES public.research_line_items(id),
  period_id UUID NOT NULL REFERENCES public.research_periods(id),
  basis TEXT NOT NULL DEFAULT 'ytd' CHECK (basis IN ('ytd', 'standalone')),
  value NUMERIC NOT NULL,
  source_document_id UUID REFERENCES public.research_source_documents(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (asset_id, line_item_id, period_id, basis)
);

-- Ratio / derived-measure time series. Multi-company by design: the
-- Benchmark sheet is a pivot of this table across assets.
CREATE TABLE public.research_metric_values (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  metric_id UUID NOT NULL REFERENCES public.research_metrics(id),
  period_id UUID NOT NULL REFERENCES public.research_periods(id),
  value NUMERIC NOT NULL,
  source_document_id UUID REFERENCES public.research_source_documents(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (asset_id, metric_id, period_id)
);

-- Dimensional facts: a measure sliced by a breakdown axis (loan mix by
-- segment, NPL by segment, deposits by type, loans by industry, revenue by
-- stream, deposit/loan market share).
CREATE TABLE public.research_segment_facts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  metric_id UUID NOT NULL REFERENCES public.research_metrics(id),   -- what is measured
  dimension_member_id UUID NOT NULL REFERENCES public.research_dimension_members(id),
  period_id UUID NOT NULL REFERENCES public.research_periods(id),
  value NUMERIC NOT NULL,
  source_document_id UUID REFERENCES public.research_source_documents(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (asset_id, metric_id, dimension_member_id, period_id)
);

-- Prime lending rates (SBDK sheet): dated snapshots, not fiscal periods.
CREATE TABLE public.research_prime_lending_rates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.research_dimension_members(id), -- 'sbdk_category' members
  as_of_date DATE NOT NULL,
  rate NUMERIC,                       -- null = N/A in source
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (asset_id, category_id, as_of_date)
);

-- ============================================================
-- Company profile content
-- ============================================================

CREATE TABLE public.research_shareholders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  holder_name TEXT NOT NULL,          -- 'PT Dwimuria Investama Andalan', 'Public', 'Treasury Stock'
  shares NUMERIC,
  ownership_pct NUMERIC,
  as_of_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (asset_id, holder_name, as_of_date)
);

CREATE TABLE public.research_key_people (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL,                 -- 'President Director', 'Commissioner'
  photo_url TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================================
-- Forecasts (Forecasting sheet: optimistic/moderate/conservative)
-- ============================================================

CREATE TABLE public.research_forecasts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  target_period_id UUID NOT NULL REFERENCES public.research_periods(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (asset_id, target_period_id)
);

CREATE TABLE public.research_forecast_facts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  forecast_id UUID NOT NULL REFERENCES public.research_forecasts(id) ON DELETE CASCADE,
  line_item_id UUID NOT NULL REFERENCES public.research_line_items(id),
  scenario TEXT NOT NULL CHECK (scenario IN ('optimistic', 'moderate', 'conservative')),
  value NUMERIC NOT NULL,
  growth_assumption NUMERIC,          -- per-scenario growth % column
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (forecast_id, line_item_id, scenario)
);

-- ============================================================
-- Qualitative content (DV Insight sheet), bilingual
-- ============================================================

CREATE TABLE public.research_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  fiscal_year SMALLINT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('insight', 'strength', 'downside', 'note')),
  sentiment TEXT CHECK (sentiment IN ('positive', 'negative', 'neutral')),
  tag TEXT,                           -- 'Moat'
  body_en TEXT,
  body_id TEXT,                       -- Indonesian text
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================================
-- Chart definitions (rebuild the workbook's 22 charts as config)
-- ============================================================

-- Each series points at ONE fact store; the app resolves it to a query:
--   metric_id set             -> research_metric_values over periods
--   line_item_id set          -> research_financial_facts over periods
--   metric_id + dimension_id  -> research_segment_facts, one series/slice per member
CREATE TABLE public.research_charts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,          -- 'npl_trend', 'shareholders', 'loan_by_segment'
  title TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('line', 'bar', 'stacked_bar', 'combo', 'pie', 'doughnut', 'sankey')),
  page TEXT NOT NULL,                 -- app page/group: 'profile', 'business_map'
  display_order INTEGER NOT NULL DEFAULT 0,
  options JSONB NOT NULL DEFAULT '{}'::jsonb,  -- axis formats, colors, stacking, y2
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.research_chart_series (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chart_id UUID NOT NULL REFERENCES public.research_charts(id) ON DELETE CASCADE,
  label TEXT,
  role TEXT NOT NULL DEFAULT 'line' CHECK (role IN ('bar', 'line', 'slice')),
  axis SMALLINT NOT NULL DEFAULT 1,   -- 1 = primary y, 2 = secondary y (combo charts)
  metric_id UUID REFERENCES public.research_metrics(id),
  line_item_id UUID REFERENCES public.research_line_items(id),
  dimension_id UUID REFERENCES public.research_dimensions(id),
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CHECK (metric_id IS NOT NULL OR line_item_id IS NOT NULL)
);

-- ============================================================
-- Indexes for read paths
-- ============================================================

CREATE INDEX idx_research_financial_facts_asset_period
  ON public.research_financial_facts (asset_id, period_id);
CREATE INDEX idx_research_metric_values_metric
  ON public.research_metric_values (metric_id, period_id);
CREATE INDEX idx_research_segment_facts_member
  ON public.research_segment_facts (dimension_member_id, period_id);
CREATE INDEX idx_research_line_items_statement
  ON public.research_line_items (statement, display_order);
CREATE INDEX idx_research_insights_asset_year
  ON public.research_insights (asset_id, fiscal_year);

-- ============================================================
-- RLS: shared reference data — everyone can view, authenticated
-- users maintain it (mirrors the assets-table pattern)
-- ============================================================

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'research_company_profiles',
    'research_periods',
    'research_line_items',
    'research_metrics',
    'research_dimensions',
    'research_dimension_members',
    'research_source_documents',
    'research_financial_facts',
    'research_metric_values',
    'research_segment_facts',
    'research_prime_lending_rates',
    'research_shareholders',
    'research_key_people',
    'research_forecasts',
    'research_forecast_facts',
    'research_insights',
    'research_charts',
    'research_chart_series'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY "Everyone can view %s" ON public.%I FOR SELECT USING (true)',
      t, t);
    EXECUTE format(
      'CREATE POLICY "Authenticated users can manage %s" ON public.%I FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL)',
      t, t);
  END LOOP;
END $$;

-- ============================================================
-- updated_at triggers (uses existing public.update_updated_at_column)
-- ============================================================

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'research_company_profiles',
    'research_line_items',
    'research_metrics',
    'research_shareholders',
    'research_key_people',
    'research_forecasts',
    'research_insights',
    'research_charts',
    'research_chart_series'
  ] LOOP
    EXECUTE format(
      'CREATE TRIGGER update_%s_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()',
      t, t);
  END LOOP;
END $$;
