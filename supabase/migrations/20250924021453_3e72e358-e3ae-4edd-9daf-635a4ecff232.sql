-- Add new columns to budget_pockets for month filtering and recurring functionality
ALTER TABLE budget_pockets 
ADD COLUMN recurring_rule jsonb,
ADD COLUMN parent_pocket_id uuid REFERENCES budget_pockets(id),
ADD COLUMN is_template boolean DEFAULT false,
ADD COLUMN month_year text,
ADD COLUMN auto_renew boolean DEFAULT true;

-- Add index for month filtering performance
CREATE INDEX idx_budget_pockets_month_year ON budget_pockets(month_year, user_id, is_active);

-- Add constraint for month_year format validation
ALTER TABLE budget_pockets 
ADD CONSTRAINT check_month_year_format 
CHECK (month_year IS NULL OR month_year ~ '^\d{4}-(0[1-9]|1[0-2])$');

-- Update existing pockets to be current month instances
UPDATE budget_pockets 
SET month_year = to_char(CURRENT_DATE, 'YYYY-MM')
WHERE month_year IS NULL;

-- Create function to generate monthly pocket instances from templates
CREATE OR REPLACE FUNCTION generate_monthly_pocket_instance(
  template_pocket_id uuid,
  target_month text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
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