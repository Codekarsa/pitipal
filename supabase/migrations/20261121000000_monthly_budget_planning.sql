BEGIN;

-- Historical allowances cannot safely be split by inference. Preserve them as
-- base; audit existing carry/duplicates before deploying to a populated system.
ALTER TABLE public.budget_pockets
  ADD COLUMN base_budget_amount numeric(15,2),
  ADD COLUMN carried_over_amount numeric(15,2) NOT NULL DEFAULT 0;
UPDATE public.budget_pockets SET base_budget_amount = coalesce(budget_amount, 0);
ALTER TABLE public.budget_pockets ALTER COLUMN base_budget_amount SET NOT NULL;

-- Effective-dated defaults distinguish a one-month override from future edits.
CREATE TABLE public.monthly_budget_defaults (
  lineage_id uuid NOT NULL REFERENCES public.budget_pockets(id) ON DELETE CASCADE,
  effective_month text NOT NULL CHECK (effective_month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  base_amount numeric(15,2) NOT NULL CHECK (base_amount >= 0),
  PRIMARY KEY (lineage_id, effective_month)
);
ALTER TABLE public.monthly_budget_defaults ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.monthly_budget_defaults FROM anon, authenticated;

CREATE FUNCTION public.monthly_budget_sync_amounts() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.base_budget_amount := coalesce(NEW.base_budget_amount, NEW.budget_amount, 0);
  ELSIF NEW.budget_amount IS DISTINCT FROM OLD.budget_amount
    AND NEW.base_budget_amount IS NOT DISTINCT FROM OLD.base_budget_amount
    AND NEW.carried_over_amount IS NOT DISTINCT FROM OLD.carried_over_amount THEN
    NEW.base_budget_amount := NEW.budget_amount - NEW.carried_over_amount;
  END IF;
  NEW.budget_amount := NEW.base_budget_amount + NEW.carried_over_amount;
  RETURN NEW;
END $$;
CREATE TRIGGER monthly_budget_sync_amounts BEFORE INSERT OR UPDATE ON public.budget_pockets
FOR EACH ROW EXECUTE FUNCTION public.monthly_budget_sync_amounts();

-- Matching-type magnitudes add to the pocket total; other types offset it.
-- Legacy negative expenses are not refunds: type, not sign, is authoritative.
CREATE FUNCTION public.monthly_pocket_spent(p_id uuid) RETURNS numeric
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT coalesce(sum(CASE WHEN t.type = p.pocket_type THEN abs(t.amount)
    ELSE -abs(t.amount) END), 0) FROM public.transactions t
  JOIN public.budget_pockets p ON p.id=t.pocket_id AND p.user_id=t.user_id
  WHERE t.pocket_id = p_id
$$;
REVOKE ALL ON FUNCTION public.monthly_pocket_spent(uuid) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.monthly_refresh_spent() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p uuid;
BEGIN
  FOR p IN SELECT DISTINCT v FROM unnest(ARRAY[
    CASE WHEN TG_OP <> 'INSERT' THEN OLD.pocket_id END,
    CASE WHEN TG_OP <> 'DELETE' THEN NEW.pocket_id END]) v WHERE v IS NOT NULL ORDER BY v
  LOOP
    PERFORM 1 FROM public.budget_pockets WHERE id = p FOR UPDATE;
    UPDATE public.budget_pockets SET current_amount = public.monthly_pocket_spent(p) WHERE id = p;
  END LOOP;
  RETURN NULL;
END $$;
CREATE TRIGGER monthly_refresh_spent AFTER INSERT OR UPDATE OR DELETE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.monthly_refresh_spent();
UPDATE public.budget_pockets SET current_amount = public.monthly_pocket_spent(id);

-- All public entry points serialize per owner (including planning and edits).
CREATE FUNCTION public.monthly_budget_owner(p_id uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner_id uuid;
BEGIN
  SELECT user_id INTO owner_id FROM public.budget_pockets WHERE id = p_id;
  IF owner_id IS NULL OR (coalesce(auth.role(), '') <> 'service_role'
      AND (auth.uid() IS NULL OR auth.uid() <> owner_id)) THEN
    RAISE EXCEPTION 'Pocket not found or access denied' USING ERRCODE = '42501';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(owner_id::text, 61121));
  RETURN owner_id;
END $$;
REVOKE ALL ON FUNCTION public.monthly_budget_owner(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.generate_monthly_pocket_instance(template_pocket_id uuid, target_month text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  source public.budget_pockets%ROWTYPE;
  root public.budget_pockets%ROWTYPE;
  previous public.budget_pockets%ROWTYPE;
  instance public.budget_pockets%ROWTYPE;
  owner_id uuid; root_id uuid; ids uuid[]; d date; prev_month text;
  base numeric; carry numeric := 0; unused numeric; rule jsonb;
BEGIN
  owner_id := public.monthly_budget_owner(template_pocket_id);
  IF target_month IS NULL OR target_month !~ '^\d{4}-(0[1-9]|1[0-2])$' THEN
    RAISE EXCEPTION 'Invalid target_month: expected YYYY-MM';
  END IF;
  d := (target_month || '-01')::date;
  SELECT * INTO source FROM public.budget_pockets WHERE id = template_pocket_id;
  root_id := coalesce(source.parent_pocket_id, source.id);
  SELECT * INTO root FROM public.budget_pockets WHERE id = root_id;
  IF root.user_id <> owner_id OR root.parent_pocket_id IS NOT NULL THEN
    RAISE EXCEPTION 'Invalid lineage for pocket %. Repair parent_pocket_id explicitly before retrying.', source.id;
  END IF;
  IF root.is_template AND root.cycle_start_date IS NOT NULL AND d < date_trunc('month',root.cycle_start_date)::date THEN
    RAISE EXCEPTION 'This repeating pocket starts in %', to_char(root.cycle_start_date,'YYYY-MM');
  END IF;
  SELECT array_agg(id) INTO ids FROM public.budget_pockets
    WHERE (parent_pocket_id = root_id OR (id = root_id AND NOT coalesce(is_template,false)))
      AND month_year = target_month;
  IF cardinality(ids) > 1 THEN
    RAISE EXCEPTION 'Conflicting monthly instances for lineage %, month %: %. Resolve records explicitly; no records were merged.', root_id, target_month, ids;
  END IF;
  IF cardinality(ids) = 1 THEN
    SELECT * INTO instance FROM public.budget_pockets WHERE id = ids[1];
    IF instance.user_id <> owner_id THEN RAISE EXCEPTION 'Cross-owner lineage conflict'; END IF;
  END IF;
  base := root.base_budget_amount;
  SELECT base_amount INTO base FROM public.monthly_budget_defaults
    WHERE lineage_id = root_id AND effective_month <= target_month ORDER BY effective_month DESC LIMIT 1;
  base := coalesce(base, root.base_budget_amount);
  prev_month := to_char(d - interval '1 month', 'YYYY-MM');
  SELECT array_agg(id) INTO ids FROM public.budget_pockets
    WHERE (parent_pocket_id = root_id OR (id = root_id AND NOT coalesce(is_template,false))) AND month_year = prev_month;
  IF cardinality(ids) > 1 THEN
    RAISE EXCEPTION 'Conflicting previous monthly instances for lineage %, month %: %. Resolve records explicitly.', root_id, prev_month, ids;
  END IF;
  IF cardinality(ids) = 1 AND d <= date_trunc('month', CURRENT_DATE)::date THEN
    SELECT * INTO previous FROM public.budget_pockets WHERE id = ids[1];
    IF previous.user_id <> owner_id THEN RAISE EXCEPTION 'Cross-owner lineage conflict'; END IF;
    unused := greatest(0, previous.budget_amount - public.monthly_pocket_spent(previous.id));
    rule := coalesce(previous.recurring_rule, root.recurring_rule, '{"type":"reset"}'::jsonb);
    CASE coalesce(rule->>'type','reset')
      WHEN 'reset' THEN carry := 0;
      WHEN 'carry_over' THEN carry := unused;
      WHEN 'percentage' THEN
        IF coalesce((rule->>'percentage')::numeric,0) NOT BETWEEN 0 AND 100 THEN RAISE EXCEPTION 'Rollover percentage must be 0..100'; END IF;
        carry := unused * coalesce((rule->>'percentage')::numeric,0) / 100;
      ELSE RAISE EXCEPTION 'Unknown rollover rule %', rule;
    END CASE;
    IF rule->>'max_carry_over' IS NOT NULL THEN
      IF (rule->>'max_carry_over')::numeric < 0 THEN RAISE EXCEPTION 'Carry cap must be nonnegative'; END IF;
      carry := least(carry, (rule->>'max_carry_over')::numeric);
    END IF;
  END IF;
  carry := round(carry, 2);
  IF instance.id IS NULL THEN
    INSERT INTO public.budget_pockets(user_id,name,description,color,icon,budget_amount,base_budget_amount,
      carried_over_amount,current_amount,budget_type,cycle_type,pocket_type,parent_pocket_id,
      is_template,month_year,auto_renew,recurring_rule,cycle_start_date,cycle_end_date)
    VALUES(owner_id,root.name,root.description,root.color,root.icon,base+carry,base,carry,0,
      root.budget_type,'monthly',root.pocket_type,root_id,false,target_month,root.auto_renew,
      root.recurring_rule,d,(d + interval '1 month - 1 day')::date) RETURNING * INTO instance;
  ELSE
    UPDATE public.budget_pockets SET carried_over_amount = carry,
      current_amount = public.monthly_pocket_spent(instance.id) WHERE id = instance.id;
  END IF;
  RETURN instance.id;
END $$;

CREATE FUNCTION public.plan_budget_months(source_month text, target_months text[]) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p record; m text; new_id uuid; root_id uuid; n integer := 0; existing integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authenticated owner required' USING ERRCODE = '42501'; END IF;
  IF source_month IS NULL OR source_month !~ '^\d{4}-(0[1-9]|1[0-2])$' THEN RAISE EXCEPTION 'Invalid source_month'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::text,61121));
  FOREACH m IN ARRAY coalesce(target_months, ARRAY[]::text[]) LOOP
    IF m IS NULL OR m !~ '^\d{4}-(0[1-9]|1[0-2])$' OR m <= source_month
      OR m < to_char(CURRENT_DATE,'YYYY-MM') THEN RAISE EXCEPTION 'Target months must follow source and not be past'; END IF;
    FOR p IN SELECT * FROM public.budget_pockets WHERE user_id = auth.uid()
      AND month_year = source_month AND NOT coalesce(is_template,false) AND is_active LOOP
      root_id := coalesce(p.parent_pocket_id,p.id);
      IF (SELECT count(*) FROM public.budget_pockets WHERE month_year = source_month
        AND (parent_pocket_id = root_id OR id = root_id)) > 1 THEN RAISE EXCEPTION 'Duplicate source lineage %; resolve explicitly',root_id; END IF;
      SELECT count(*) INTO existing FROM public.budget_pockets WHERE month_year = m
        AND (parent_pocket_id = root_id OR id = root_id);
      -- Generation validates duplicate targets even when no insertion is needed.
      new_id := public.generate_monthly_pocket_instance(p.id,m);
      IF existing = 0 THEN
        UPDATE public.budget_pockets SET base_budget_amount = p.base_budget_amount WHERE id = new_id;
        n := n+1;
      END IF;
    END LOOP;
  END LOOP;
  RETURN n;
END $$;

CREATE FUNCTION public.set_monthly_pocket_budget(pocket_id uuid, base_amount numeric, apply_to_future boolean DEFAULT false)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.budget_pockets%ROWTYPE; root_id uuid;
BEGIN
  PERFORM public.monthly_budget_owner(pocket_id);
  SELECT * INTO p FROM public.budget_pockets WHERE id = pocket_id;
  IF base_amount IS NULL OR base_amount < 0 OR base_amount = 'NaN'::numeric THEN RAISE EXCEPTION 'Base amount must be nonnegative'; END IF;
  IF coalesce(p.is_template,false) OR p.month_year IS NULL OR p.month_year < to_char(CURRENT_DATE,'YYYY-MM') THEN
    RAISE EXCEPTION 'Select a current or future monthly instance; past budgets are immutable via this RPC';
  END IF;
  root_id := coalesce(p.parent_pocket_id,p.id);
  IF NOT EXISTS(SELECT 1 FROM public.budget_pockets WHERE id=root_id AND user_id=p.user_id AND parent_pocket_id IS NULL) THEN
    RAISE EXCEPTION 'Invalid or cross-owner lineage; repair parent_pocket_id explicitly';
  END IF;
  IF (SELECT count(*) FROM public.budget_pockets WHERE month_year = p.month_year AND (parent_pocket_id=root_id OR id=root_id)) > 1 THEN
    RAISE EXCEPTION 'Duplicate monthly lineage %; resolve explicitly',root_id;
  END IF;
  IF apply_to_future AND EXISTS(SELECT 1 FROM public.budget_pockets
    WHERE (parent_pocket_id=root_id OR id=root_id) AND month_year > p.month_year
    GROUP BY month_year HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Duplicate future monthly instances for lineage %; resolve explicitly before editing future budgets',root_id;
  END IF;
  -- A standalone source is also its lineage root. Preserve its original default
  -- before changing that source's one-month override.
  INSERT INTO public.monthly_budget_defaults(lineage_id,effective_month,base_amount)
    SELECT root_id,'0001-01',base_budget_amount FROM public.budget_pockets WHERE id=root_id
    ON CONFLICT DO NOTHING;
  UPDATE public.budget_pockets SET base_budget_amount = base_amount WHERE id = pocket_id;
  IF apply_to_future THEN
    INSERT INTO public.monthly_budget_defaults VALUES(root_id,p.month_year,base_amount)
      ON CONFLICT(lineage_id,effective_month) DO UPDATE SET base_amount=EXCLUDED.base_amount;
    DELETE FROM public.monthly_budget_defaults WHERE lineage_id=root_id AND effective_month > p.month_year;
    UPDATE public.budget_pockets SET base_budget_amount = base_amount
      WHERE user_id=p.user_id AND (parent_pocket_id=root_id OR id=root_id) AND month_year > p.month_year;
  END IF;
END $$;

REVOKE ALL ON FUNCTION public.generate_monthly_pocket_instance(uuid,text),
  public.plan_budget_months(text,text[]), public.set_monthly_pocket_budget(uuid,numeric,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_monthly_pocket_instance(uuid,text),
  public.plan_budget_months(text,text[]), public.set_monthly_pocket_budget(uuid,numeric,boolean) TO authenticated, service_role;

-- Old clients must not increment the derived total a second time after inserting
-- a transaction, nor may this legacy SECURITY DEFINER RPC edit another owner.
CREATE OR REPLACE FUNCTION public.update_pocket_amount(pocket_id uuid, amount_to_add numeric)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.monthly_budget_owner(pocket_id);
  UPDATE public.budget_pockets SET current_amount=public.monthly_pocket_spent(pocket_id) WHERE id=pocket_id;
END $$;
REVOKE ALL ON FUNCTION public.update_pocket_amount(uuid,numeric) FROM PUBLIC, anon;

-- Existing cron definitions used an anon bearer. Require an explicitly configured
-- server-only setting instead; never embed a credential in migration source.
DO $$ DECLARE j record; BEGIN
  IF to_regclass('cron.job') IS NOT NULL THEN
    FOR j IN SELECT jobid,command FROM cron.job WHERE command LIKE '%/functions/v1/monthly-rollover%' LOOP
      PERFORM cron.alter_job(j.jobid,command := replace(j.command,
        'app.settings.supabase_anon_key','app.settings.supabase_service_role_key'));
    END LOOP;
  END IF;
END $$;
NOTIFY pgrst, 'reload schema';
COMMIT;
