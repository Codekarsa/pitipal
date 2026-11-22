import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

export interface SetupPocket {
  id: string;
  name: string;
  month_year: string | null;
  pocket_type: string;
}

interface SetupChecklistProps {
  currency: string;
  onCreatePocket: () => void;
  onAddTransaction: (pocket?: SetupPocket) => void;
  remaining: number;
  hasSpendingBudget: boolean;
}

export function SetupChecklist({ currency, onCreatePocket, onAddTransaction, remaining, hasSpendingBudget }: SetupChecklistProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const sawIncomplete = useRef(false);
  const [showComplete, setShowComplete] = useState(false);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["setupProgress", user?.id],
    queryFn: async () => {
      const [pockets, transactions] = await Promise.all([
        supabase.from("budget_pockets").select("id,name,month_year,pocket_type").eq("user_id", user!.id)
          .eq("is_active", true).eq("is_template", false).order("created_at").limit(1),
        supabase.from("transactions").select("id,amount,type").eq("user_id", user!.id).order("created_at").limit(1),
      ]);
      if (pockets.error) throw pockets.error;
      if (transactions.error) throw transactions.error;
      return { hasPocket: pockets.data.length > 0, hasTransaction: transactions.data.length > 0, pocket: pockets.data[0], transaction: transactions.data[0] };
    },
    enabled: !!user,
  });

  useEffect(() => {
    sawIncomplete.current = false;
    setShowComplete(false);
  }, [user?.id]);
  useEffect(() => {
    if (!data) return;
    if (!data.hasPocket || !data.hasTransaction) sawIncomplete.current = true;
    else if (sawIncomplete.current) {
      setShowComplete(true);
      sawIncomplete.current = false;
    }
  }, [data]);

  if (isLoading) {
    return <div className="h-24 rounded-xl bg-muted animate-pulse" role="status" aria-label="Loading setup progress" />;
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

  if (!data) return null;
  if (data.hasPocket && data.hasTransaction) return showComplete ? <Card className="border-success/30 shadow-none">
    <CardContent className="space-y-3 pt-5" role="status">
      <p className="flex items-center gap-2 font-semibold"><CheckCircle2 className="h-5 w-5 text-success" />Setup complete</p>
      <p className="text-sm">First transaction recorded: {formatCurrency(Math.abs(data.transaction.amount), currency)} {data.transaction.type}.</p>
      <p className="text-sm text-muted-foreground">{hasSpendingBudget ? remaining < 0
        ? `Your spending budget is ${formatCurrency(Math.abs(remaining), currency)} over its limit.`
        : `Your spending budget has ${formatCurrency(remaining, currency)} remaining.`
        : 'Your transaction is now included in your monthly totals.'}</p>
      <div className="flex flex-wrap gap-2"><Button size="sm" onClick={() => navigate('/transactions')}>Review my transactions</Button><Button size="sm" variant="ghost" onClick={() => setShowComplete(false)}>Dismiss</Button></div>
    </CardContent>
  </Card> : null;

  const completed = 1 + Number(data.hasPocket) + Number(data.hasTransaction);

  return (
    <Card className="border-primary/20 shadow-none">
      <CardHeader className="pb-2 pt-5">
        <CardTitle className="text-lg">Let's set up your budget</CardTitle>
        <CardDescription>{completed} of 3 steps complete · Next: {data.hasPocket ? 'record a transaction' : 'create a pocket'}.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 pb-5">
        <p className="text-sm text-muted-foreground">{data.hasPocket
          ? `Record income or spending. ${data.pocket?.name} will be selected so you can see its budget update.`
          : 'A pocket is a monthly spending limit, like groceries or transport. Start with just one.'}</p>
        <details className="text-xs text-muted-foreground"><summary className="cursor-pointer">Completed steps</summary><ul className="mt-2 space-y-1"><li>✓ Currency saved · {currency}</li>{data.hasPocket && <li>✓ First pocket created</li>}{data.hasTransaction && <li>✓ First transaction recorded</li>}</ul></details>
        <Button variant="hero" className="w-full sm:w-auto" onClick={() => data.hasPocket ? onAddTransaction(data.pocket) : onCreatePocket()}>
          {data.hasPocket ? "Add my first transaction" : "Create my first pocket"}
        </Button>
      </CardContent>
    </Card>
  );
}
