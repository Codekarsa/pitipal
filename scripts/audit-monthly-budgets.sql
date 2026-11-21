-- Read-only: execute before migration/deployment. No inferred merges or repairs.
BEGIN TRANSACTION READ ONLY;
SELECT id, user_id, pocket_id, amount, type, transaction_date
FROM public.transactions WHERE type IN ('expense','investment') AND amount < 0;

SELECT user_id, coalesce(parent_pocket_id,id) AS lineage_id, month_year,
  array_agg(id ORDER BY created_at) AS conflicting_ids, count(*)
FROM public.budget_pockets WHERE NOT coalesce(is_template,false) AND month_year IS NOT NULL
GROUP BY user_id, coalesce(parent_pocket_id,id), month_year HAVING count(*) > 1;

-- Name matches are ambiguous candidates only, NEVER instructions to merge.
SELECT user_id,name,month_year,array_agg(id) AS review_ids
FROM public.budget_pockets WHERE NOT coalesce(is_template,false)
GROUP BY user_id,name,month_year HAVING count(*) > 1;

SELECT p.id,p.parent_pocket_id,p.user_id,r.user_id AS parent_owner
FROM public.budget_pockets p JOIN public.budget_pockets r ON r.id=p.parent_pocket_id
WHERE p.user_id<>r.user_id OR r.parent_pocket_id IS NOT NULL;

-- Old total allowances may already contain carry. Preserve history and manually
-- establish the split; migration does not guess carry from names or stale totals.
SELECT id,user_id,parent_pocket_id,month_year,budget_amount,current_amount
FROM public.budget_pockets WHERE parent_pocket_id IS NOT NULL;
ROLLBACK;
