-- Fix function search path security issue
CREATE OR REPLACE FUNCTION generate_monthly_pocket_instance(
  template_pocket_id uuid,
  target_month text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  template_record budget_pockets%ROWTYPE;
  new_pocket_id uuid;
BEGIN
  -- Get the template pocket
  SELECT * INTO template_record 
  FROM budget_pockets 
  WHERE id = template_pocket_id AND is_template = true;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Template pocket not found';
  END IF;
  
  -- Create new instance
  INSERT INTO budget_pockets (
    user_id, name, description, budget_amount, budget_type, cycle_type,
    color, icon, pocket_type, parent_pocket_id, is_template, month_year,
    auto_renew, recurring_rule, cycle_start_date, cycle_end_date
  ) VALUES (
    template_record.user_id,
    template_record.name,
    template_record.description,
    template_record.budget_amount,
    template_record.budget_type,
    template_record.cycle_type,
    template_record.color,
    template_record.icon,
    template_record.pocket_type,
    template_pocket_id,
    false,
    target_month,
    template_record.auto_renew,
    template_record.recurring_rule,
    (target_month || '-01')::date,
    (date_trunc('month', (target_month || '-01')::date) + interval '1 month - 1 day')::date
  ) RETURNING id INTO new_pocket_id;
  
  RETURN new_pocket_id;
END;
$$;