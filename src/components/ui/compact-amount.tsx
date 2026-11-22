import { formatCompactCurrency, formatCurrency } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// Summary amounts stay compact; a touch or keyboard action reveals the exact value.
export function CompactAmount({ amount, currency, label, className }: {
  amount: number;
  currency: string;
  label: string;
  className?: string;
}) {
  const exact = formatCurrency(amount, currency);
  if (Math.abs(amount) < 1_000_000) return <span className={`whitespace-nowrap ${className ?? ""}`}>{exact}</span>;

  return <Popover>
    <PopoverTrigger asChild>
      <button type="button" className={`relative z-10 max-w-full whitespace-nowrap rounded-sm text-left underline decoration-dotted underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${className ?? ""}`}
        aria-label={`Show exact ${label}: ${exact}`}>
        ≈ {formatCompactCurrency(amount, currency)}
      </button>
    </PopoverTrigger>
    <PopoverContent className="w-auto max-w-[calc(100vw-2rem)] space-y-1" onClick={event => event.stopPropagation()}>
      <p className="text-xs text-muted-foreground">{label} · exact amount</p>
      <p className="break-words text-base font-semibold tabular-nums">{exact}</p>
    </PopoverContent>
  </Popover>;
}
