import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Circle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface SetupChecklistProps {
  currency: string;
  onCreatePocket: () => void;
  onAddTransaction: () => void;
}

export function SetupChecklist({ currency, onCreatePocket, onAddTransaction }: SetupChecklistProps) {
  const { user } = useAuth();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["setupProgress", user?.id],
    queryFn: async () => {
      const [pockets, transactions] = await Promise.all([
        supabase.from("budget_pockets").select("id").eq("user_id", user!.id)
          .eq("is_active", true).eq("is_template", false).limit(1),
        supabase.from("transactions").select("id").eq("user_id", user!.id).limit(1),
      ]);
      if (pockets.error) throw pockets.error;
      if (transactions.error) throw transactions.error;
      return { hasPocket: pockets.data.length > 0, hasTransaction: transactions.data.length > 0 };
    },
    enabled: !!user,
  });

  if (isLoading) {
    return <div className="h-48 rounded-xl bg-muted animate-pulse" role="status" aria-label="Loading setup progress" />;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
          <p role="alert" className="text-sm">We couldn't load your setup progress.</p>
          <Button variant="outline" onClick={() => refetch()}>Try again</Button>
        </CardContent>
      </Card>
    );
  }

  if (!data || (data.hasPocket && data.hasTransaction)) return null;

  const steps = [
    { title: `Choose your currency · ${currency}`, description: "Saved. You can change it in Settings.", complete: true },
    { title: "Create your first pocket", description: "A pocket is a monthly spending limit, like groceries or transport.", complete: data.hasPocket },
    { title: "Record your first transaction", description: "Add income or an expense to see your numbers update.", complete: data.hasTransaction },
  ];
  const completed = steps.filter(step => step.complete).length;

  return (
    <Card className="border-primary/20 bg-gradient-card shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl">Let's set up your budget</CardTitle>
        <CardDescription>{completed} of 3 steps complete · Start small. You can adjust everything later.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ol className="space-y-4">
          {steps.map(step => (
            <li key={step.title} className="flex items-start gap-3">
              {step.complete
                ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden="true" />
                : <Circle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />}
              <div className="min-w-0">
                <p className="text-sm font-medium"><span className="sr-only">{step.complete ? "Complete: " : "To do: "}</span>{step.title}</p>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
            </li>
          ))}
        </ol>
        <Button variant="hero" className="w-full sm:w-auto" onClick={data.hasPocket ? onAddTransaction : onCreatePocket}>
          {data.hasPocket ? "Add my first transaction" : "Create my first pocket"}
        </Button>
      </CardContent>
    </Card>
  );
}
