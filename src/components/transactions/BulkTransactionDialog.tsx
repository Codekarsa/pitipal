import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/useAuth';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface Row { id: string; date: string; amount: string; category: string; pocket: string; description: string }
interface Props { open: boolean; onOpenChange: (open: boolean) => void; onSaved: () => void; currency: string; month: string }

export function BulkTransactionDialog({ open, onOpenChange, onSaved, currency, month }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [defaultDate, setDefaultDate] = useState('');
  const [defaultCategory, setDefaultCategory] = useState('');
  const [defaultPocket, setDefaultPocket] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [review, setReview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const newRow = (date = defaultDate): Row => ({ id: crypto.randomUUID(), date, amount: '', category: defaultCategory, pocket: defaultPocket, description: '' });
  useEffect(() => {
    if (!open) return;
    const today = format(new Date(), 'yyyy-MM-dd');
    const date = today.startsWith(month) ? today : `${month}-01`;
    setDefaultDate(date);
    setDefaultCategory('');
    setDefaultPocket('');
    setType('expense');
    setRows(Array.from({ length: 5 }, () => ({ id: crypto.randomUUID(), date, amount: '', category: '', pocket: '', description: '' })));
    setReview(false);
    setError('');
  }, [open, month]);
  const { data, isLoading, error: loadError } = useQuery({
    queryKey: ['bulk-entry-options', user?.id, type], enabled: open && !!user,
    queryFn: async () => {
      const [categories, pockets] = await Promise.all([
        supabase.from('categories').select('name').eq('type', type).order('name'),
        supabase.from('budget_pockets').select('id,name,month_year').eq('user_id', user!.id).eq('is_template', false).eq('is_active', true).eq('pocket_type', type).order('name'),
      ]);
      if (categories.error) throw categories.error;
      if (pockets.error) throw pockets.error;
      return { categories: [...new Set(categories.data.map(c => c.name))], pockets: pockets.data };
    },
  });
  const used = rows.filter(r => r.amount || r.description);
  const total = used.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  function update(id: string, value: Partial<Row>) {
    setRows(current => current.map(r => r.id === id ? { ...r, ...value } : r));
  }
  function validate() {
    if (!used.length) return 'Enter at least one transaction amount.';
    for (const row of used) {
      const i = rows.indexOf(row) + 1;
      if (!Number.isFinite(Number(row.amount)) || Number(row.amount) <= 0) return `Row ${i}: enter a positive amount.`;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(row.date) || Number.isNaN(Date.parse(row.date)) || new Date(`${row.date}T12:00:00Z`).toISOString().slice(0, 10) !== row.date) return `Row ${i}: choose a valid date.`;
      if (!data?.categories.includes(row.category)) return `Row ${i}: choose a category.`;
      if (row.pocket && !data?.pockets.some(p => p.id === row.pocket && p.month_year === row.date.slice(0, 7))) return `Row ${i}: choose a pocket for that date's month, or leave it unassigned.`;
    }
    return '';
  }
  async function save() {
    if (!user) return;
    const invalid = validate();
    if (invalid) { setError(invalid); setReview(false); return; }
    setSaving(true);
    setError('');
    try {
      // One atomic insert. Stable row IDs make an uncertain retry a conflict, never a duplicate.
      const result = await supabase.from('transactions').insert(used.map(row => ({
        id: row.id, user_id: user.id, amount: Number(row.amount), type, category: row.category,
        pocket_id: row.pocket || null, transaction_date: row.date, description: row.description.trim() || null,
      })));
      if (result.error) throw result.error;
      await Promise.all(['pocketSpending', 'setupProgress', 'data-counts', 'credit-card-balances'].map(key => queryClient.invalidateQueries({ queryKey: [key] })));
      onSaved();
      onOpenChange(false);
      toast({ title: `${used.length} transactions saved`, description: `${formatCurrency(total, currency)} ${type === 'expense' ? 'expenses' : 'income'} recorded on their selected dates.` });
    } catch (e) { setError((e as { message?: string }).message || 'Could not save. Your entries are still here.'); }
    finally { setSaving(false); }
  }
  const selectClass = 'h-10 w-full min-w-0 rounded-md border bg-background px-2 text-sm';
  return <Dialog open={open} onOpenChange={value => { if (!saving) onOpenChange(value); }}>
    <DialogContent className="max-h-[90vh] flex flex-col overflow-hidden sm:max-w-5xl">
      <DialogHeader><DialogTitle>Add multiple transactions</DialogTitle><DialogDescription>Enter a day's receipts or catch up on several days. Tab between fields, then review everything before saving.</DialogDescription></DialogHeader>
      <div className="min-h-0 overflow-y-auto space-y-4">
      {isLoading ? <p>Loading categories and pockets…</p> : loadError ? <p role="alert">Could not load entry options. Close and try again.</p> : <>
        {!review && <>
          <div className="space-y-1 sm:max-w-xs"><Label htmlFor="bulk-type">Transaction type</Label><select id="bulk-type" className={selectClass} value={type} onChange={e => {
            setType(e.target.value as 'expense' | 'income'); setDefaultCategory(''); setDefaultPocket('');
            setRows(current => current.map(r => ({ ...r, category: '', pocket: '' })));
          }}><option value="expense">Expense</option><option value="income">Income</option></select></div>
          <details className="rounded-lg bg-muted/50 p-3">
            <summary className="cursor-pointer text-sm font-medium">Defaults for repeated entries (optional)</summary>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1"><Label htmlFor="bulk-date">Date for empty / new rows</Label><Input id="bulk-date" type="date" value={defaultDate} onChange={e => {
              const date = e.target.value; setDefaultDate(date); setDefaultPocket('');
              setRows(current => current.map(r => !r.amount && !r.description ? { ...r, date, pocket: '' } : r));
            }} /></div>
            <div className="space-y-1"><Label htmlFor="bulk-category">Default category</Label><select id="bulk-category" className={selectClass} value={defaultCategory} onChange={e => {
              const category = e.target.value; setDefaultCategory(category);
              setRows(current => current.map(r => !r.amount && !r.description ? { ...r, category } : r));
            }}><option value="">Choose category</option>{data?.categories.map(c => <option key={c}>{c}</option>)}</select></div>
            <div className="space-y-1"><Label htmlFor="bulk-pocket">Default pocket</Label><select id="bulk-pocket" className={selectClass} value={defaultPocket} onChange={e => {
              const pocket = e.target.value; setDefaultPocket(pocket);
              setRows(current => current.map(r => !r.amount && !r.description && r.date.slice(0, 7) === defaultDate.slice(0, 7) ? { ...r, pocket } : r));
            }}><option value="">No pocket</option>{data?.pockets.filter(p => p.month_year === defaultDate.slice(0, 7)).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
          </div>
          </details>
          <p className="text-xs text-muted-foreground">Defaults fill empty and new rows only. Filled rows keep their dates and choices. Each row can be changed separately. Unassigned expenses still count in monthly totals.</p>
          <div className="space-y-3">
            {rows.map((row, i) => <fieldset key={row.id} className="rounded-lg border p-3 min-w-0" aria-label={`Transaction row ${i + 1}`}>
              <legend className="px-1 text-xs text-muted-foreground">Transaction {i + 1}</legend>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2">
                <Input aria-label={`Date ${i + 1}`} type="date" value={row.date} onChange={e => update(row.id, { date: e.target.value, pocket: '' })} />
                <CurrencyInput aria-label={`Amount ${i + 1}`} placeholder={`Amount (${currency})`} value={row.amount} onChange={amount => update(row.id, { amount })} inputMode="decimal" />
                <select aria-label={`Category ${i + 1}`} className={selectClass} value={row.category} onChange={e => update(row.id, { category: e.target.value })}><option value="">Category</option>{data?.categories.map(c => <option key={c}>{c}</option>)}</select>
                <select aria-label={`Pocket ${i + 1}`} className={selectClass} value={row.pocket} onChange={e => update(row.id, { pocket: e.target.value })}><option value="">No pocket</option>{data?.pockets.filter(p => p.month_year === row.date.slice(0, 7)).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
                <Input aria-label={`Description ${i + 1}`} placeholder="Description" value={row.description} maxLength={200} onChange={e => update(row.id, { description: e.target.value })} />
                <Button variant="ghost" aria-label={`Remove row ${i + 1}`} onClick={() => setRows(current => current.filter(r => r.id !== row.id))}>Remove</Button>
              </div>
            </fieldset>)}
          </div>
          <Button variant="outline" onClick={() => setRows(current => [...current, ...Array.from({ length: 5 }, () => newRow())])} disabled={rows.length >= 100}>Add 5 rows</Button>
        </>}
        {review && <div className="space-y-3">
          <p className="text-lg font-semibold">{used.length} {type === 'expense' ? used.length === 1 ? 'expense' : 'expenses' : used.length === 1 ? 'income entry' : 'income entries'} · {formatCurrency(total, currency)}</p>
          <p className="text-sm text-muted-foreground">{used.filter(r => !r.pocket).length} without a pocket. Blank rows are ignored. All entries will be saved together.</p>
          <ul className="max-h-64 overflow-y-auto space-y-2 rounded-lg border p-3 text-sm">{used.map(row => <li key={row.id} className="flex flex-wrap justify-between gap-2"><span>{row.date} · {row.category} · {row.description || 'No description'}</span><strong>{formatCurrency(Number(row.amount), currency)}</strong></li>)}</ul>
        </div>}
      </>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </div>
      <DialogFooter className="shrink-0 border-t bg-background pt-4 gap-2">
        <Button variant="outline" disabled={saving} onClick={() => review ? setReview(false) : onOpenChange(false)}>{review ? 'Back to entries' : 'Cancel'}</Button>
        <Button disabled={saving || isLoading || !!loadError || !used.length} onClick={() => {
          if (review) { void save(); return; }
          const invalid = validate(); setError(invalid); if (!invalid) setReview(true);
        }}>{saving ? 'Saving…' : `${review ? 'Save' : 'Review'} ${used.length} ${used.length === 1 ? 'transaction' : 'transactions'}`}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}
