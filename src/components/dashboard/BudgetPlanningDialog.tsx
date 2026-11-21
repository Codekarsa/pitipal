import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { addMonths, format, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/useAuth';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedMonth: string;
  currency: string;
  onPlanned: (month: string) => void;
}

export function BudgetPlanningDialog({ open, onOpenChange, selectedMonth, currency, onPlanned }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [source, setSource] = useState(selectedMonth);
  const [start, setStart] = useState(selectedMonth);
  const [count, setCount] = useState(3);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!open) return;
    setSource(selectedMonth);
    setStart(format(addMonths(parseISO(`${selectedMonth}-01`), 1), 'yyyy-MM'));
    setCount(3);
    setError('');
  }, [open, selectedMonth]);
  const { data: pockets = [], isLoading, error: loadError } = useQuery({
    queryKey: ['planning-source', user?.id, source],
    enabled: open && !!user && !!source,
    queryFn: async () => {
      const result = await supabase.from('budget_pockets').select('id,name,budget_amount,base_budget_amount,pocket_type')
        .eq('user_id', user!.id).eq('month_year', source).eq('is_template', false).eq('is_active', true).order('name');
      if (result.error) throw result.error;
      return result.data;
    },
  });
  const targets = start ? Array.from({ length: count }, (_, i) => format(addMonths(parseISO(`${start}-01`), i), 'yyyy-MM')) : [];
  const invalidMonths = !!source && !!start && (start <= source || start < format(new Date(), 'yyyy-MM'));
  const total = pockets.filter(p => p.pocket_type === 'expense').reduce((sum, p) => sum + (p.base_budget_amount ?? p.budget_amount), 0);
  async function save() {
    setSaving(true);
    setError('');
    try {
      const result = await supabase.rpc('plan_budget_months', { source_month: source, target_months: targets });
      if (result.error) throw result.error;
      await queryClient.invalidateQueries({ queryKey: ['pocketSpending'] });
      await queryClient.invalidateQueries({ queryKey: ['planning-source'] });
      await queryClient.invalidateQueries({ queryKey: ['setupProgress'] });
      toast({ title: 'Budget plan saved', description: `${result.data} pockets created. Existing monthly plans were kept.` });
      onOpenChange(false);
      onPlanned(targets[0]);
    } catch (e) { setError(e instanceof Error ? e.message : (e as { message?: string }).message || 'Could not save the plan. Try again.'); }
    finally { setSaving(false); }
  }
  return <Dialog open={open} onOpenChange={value => { if (!saving) onOpenChange(value); }}>
    <DialogContent className="max-h-[90vh] flex flex-col overflow-hidden sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Plan monthly budgets</DialogTitle>
        <DialogDescription>Copy base allowances, not spending or income. Existing monthly pockets and their amounts will not be overwritten.</DialogDescription>
      </DialogHeader>
      <div className="min-h-0 overflow-y-auto space-y-4">
      <Button variant="outline" onClick={() => {
        setSource(format(addMonths(parseISO(`${selectedMonth}-01`), -1), 'yyyy-MM'));
        setStart(selectedMonth);
        setCount(1);
      }}>Copy last month into {format(parseISO(`${selectedMonth}-01`), 'MMMM')}</Button>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-2"><Label htmlFor="plan-source">Copy budgets from</Label><Input id="plan-source" type="month" value={source} onChange={e => setSource(e.target.value)} /></div>
        <div className="space-y-2"><Label htmlFor="plan-start">First month to plan</Label><Input id="plan-start" type="month" value={start} onChange={e => setStart(e.target.value)} /></div>
      </div>
      <div className="space-y-2"><Label htmlFor="plan-count">Number of months</Label><select id="plan-count" className="h-10 w-full rounded-md border bg-background px-3" value={count} onChange={e => setCount(Number(e.target.value))}>
        <option value={1}>One month</option><option value={3}>Three months</option>
      </select></div>
      {isLoading ? <p>Loading budgets…</p> : loadError ? <p role="alert">Could not load source budgets. Choose a month and try again.</p> : pockets.length === 0 ? <p className="text-sm text-muted-foreground">No budgets in this source month. Choose a month with pockets, or create your first pocket.</p> : <div className="rounded-lg border p-3 space-y-2">
        <p className="font-medium">{pockets.length} pockets · {formatCurrency(total, currency)} spending allowance per month</p>
        <ul className="max-h-40 overflow-y-auto text-sm space-y-1">{pockets.map(p => <li key={p.id} className="flex justify-between gap-3"><span>{p.name}</span><span>{formatCurrency(p.base_budget_amount ?? p.budget_amount, currency)}</span></li>)}</ul>
        <p className="text-sm">Plan for {targets.map(m => format(parseISO(`${m}-01`), 'MMM yyyy')).join(', ')}.</p>
      </div>}
      <p className="text-xs text-muted-foreground">Edit a pocket afterward to adjust only that month or that month and future plans. Carryover is confirmed when the month begins; it is not new income.</p>
      {invalidMonths && <p role="alert" className="text-sm text-destructive">Choose a target after the source month, starting this month or later.</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </div>
      <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button><Button onClick={save} disabled={saving || isLoading || !!loadError || !source || !start || invalidMonths || !pockets.length}>{saving ? 'Saving…' : 'Save budget plan'}</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}
