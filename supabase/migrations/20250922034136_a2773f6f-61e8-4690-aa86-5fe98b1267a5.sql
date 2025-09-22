-- Create function to update pocket amount
CREATE OR REPLACE FUNCTION public.update_pocket_amount(pocket_id UUID, amount_to_add DECIMAL)
RETURNS VOID AS $$
BEGIN
  UPDATE public.budget_pockets 
  SET current_amount = current_amount + amount_to_add,
      updated_at = now()
  WHERE id = pocket_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;