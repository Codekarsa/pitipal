-- NUMERIC(10,2) caps a single amount at 99,999,999.99, which blocks ordinary
-- rupiah entries such as a car or house payment. NUMERIC(15,2) allows amounts
-- up to 9,999,999,999,999.99. Widening precision at the same scale keeps every
-- existing value unchanged.
ALTER TABLE public.transactions
  ALTER COLUMN amount TYPE NUMERIC(15,2);

ALTER TABLE public.budget_pockets
  ALTER COLUMN budget_amount TYPE NUMERIC(15,2),
  ALTER COLUMN current_amount TYPE NUMERIC(15,2);
