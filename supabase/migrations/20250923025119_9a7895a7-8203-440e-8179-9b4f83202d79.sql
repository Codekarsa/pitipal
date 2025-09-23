-- Create payees table for storing user payees
CREATE TABLE public.payees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.payees ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own payees" 
ON public.payees 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own payees" 
ON public.payees 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own payees" 
ON public.payees 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own payees" 
ON public.payees 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_payees_updated_at
BEFORE UPDATE ON public.payees
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create unique index to prevent duplicate payee names per user
CREATE UNIQUE INDEX idx_payees_user_name ON public.payees(user_id, name);