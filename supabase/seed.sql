-- Seed: stock-research taxonomies (metrics, dimensions, dimension members).
-- Idempotent: safe to re-run; existing rows are left untouched so manual
-- edits in the database are never clobbered. Applied by scripts/db-sync.ts,
-- which re-runs this file whenever its content hash changes.

-- ============================================================
-- Metrics (ratio / derived-measure catalog, from BBCA workbook)
-- ============================================================

INSERT INTO public.research_metrics (code, label, unit, higher_is_better, description) VALUES
  ('npl',              'Non Performing Loan',           'percent',     false, 'Portion of loans already in default (collectibility 3-5)'),
  ('lar',              'Loan at Risk',                  'percent',     false, 'Portion of loans showing signs of stress (incl. restructured and NPL)'),
  ('casa_ratio',       'CASA Ratio',                    'percent',     true,  'Current Account + Saving Account share of third-party funds'),
  ('ldr',              'Loan to Deposit Ratio',         'percent',     NULL,  'Loans as a share of third-party deposits'),
  ('nim',              'Net Interest Margin',           'percent',     true,  'Net interest income over average earning assets'),
  ('cost_of_fund',     'Cost of Fund',                  'percent',     false, 'Interest expense over average interest-bearing liabilities'),
  ('cost_of_credit',   'Cost of Credit',                'percent',     false, 'Provision expense over average loans'),
  ('ckpn_to_loan',     'CKPN to Loan',                  'percent',     false, 'Allowance for impairment losses over gross loans'),
  ('car',              'Capital Adequacy Ratio',        'percent',     true,  'Total capital over risk-weighted assets'),
  ('lcr',              'Liquidity Coverage Ratio',      'ratio',       true,  NULL),
  ('nsfr',             'Net Stable Funding Ratio',      'ratio',       true,  NULL),
  ('rwa',              'Risk-Weighted Assets',          'idr_million', NULL,  NULL),
  ('required_capital', 'Required Regulatory Capital',   'idr_million', NULL,  'Capital needed to fund RWA growth at target CAR'),
  ('fcf',              'Free Cash Flow (Bank)',         'idr_million', true,  'Net income minus required regulatory capital'),
  ('loan_outstanding', 'Loan Outstanding',              'idr_billion', NULL,  'Outstanding loan portfolio (segment/industry breakdowns)'),
  ('deposit_outstanding', 'Deposit Outstanding',        'idr_billion', NULL,  'Outstanding third-party deposits (by type)'),
  ('market_share',     'Market Share',                  'percent',     true,  'Share of industry-wide outstanding amount'),
  ('revenue',          'Revenue',                       'idr_million', NULL,  'Revenue by stream (Business Map composition)')
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- Dimensions (breakdown axes)
-- ============================================================

INSERT INTO public.research_dimensions (code, label) VALUES
  ('loan_segment',   'Loan Segment'),
  ('deposit_type',   'Deposit Type'),
  ('industry',       'Industry'),
  ('revenue_stream', 'Revenue Stream'),
  ('sbdk_category',  'Prime Lending Rate Category')
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- Dimension members
-- ============================================================

INSERT INTO public.research_dimension_members (dimension_id, code, label, display_order)
SELECT d.id, m.code, m.label, m.ord
FROM (VALUES
  ('corporate',      'Corporate Banking',        1),
  ('commercial_sme', 'Commercial & SME Banking', 2),
  ('individual',     'Individual Banking',       3)
) AS m(code, label, ord)
JOIN public.research_dimensions d ON d.code = 'loan_segment'
ON CONFLICT (dimension_id, code) DO NOTHING;

INSERT INTO public.research_dimension_members (dimension_id, code, label, display_order)
SELECT d.id, m.code, m.label, m.ord
FROM (VALUES
  ('demand_deposit', 'Demand Deposits', 1),
  ('saving_deposit', 'Saving Deposits', 2),
  ('time_deposit',   'Time Deposits',   3)
) AS m(code, label, ord)
JOIN public.research_dimensions d ON d.code = 'deposit_type'
ON CONFLICT (dimension_id, code) DO NOTHING;

INSERT INTO public.research_dimension_members (dimension_id, code, label, display_order)
SELECT d.id, m.code, m.label, m.ord
FROM (VALUES
  ('non_msme_corporate', 'Non-MSME Corporate', 1),
  ('non_msme_retail',    'Non-MSME Retail',    2),
  ('msme_medium',        'MSME Medium',        3),
  ('msme_small',         'MSME Small',         4),
  ('msme_micro',         'MSME Micro',         5),
  ('housing',            'Housing Loan',       6),
  ('non_housing',        'Non-Housing Loan',   7)
) AS m(code, label, ord)
JOIN public.research_dimensions d ON d.code = 'sbdk_category'
ON CONFLICT (dimension_id, code) DO NOTHING;

-- 'industry' and 'revenue_stream' members are created by the workbook
-- importer, since their member lists vary per company.
