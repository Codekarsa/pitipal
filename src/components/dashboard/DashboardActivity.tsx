import { useId } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  ChartNoAxesCombined,
  Receipt,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, getDaysInMonth, parseISO } from "date-fns";
import { CompactAmount } from "@/components/ui/compact-amount";
import { formatCompactCurrency, formatCurrency } from "@/lib/utils";
import type { SpendingCalculationResult } from "@/utils/pocketCalculations";

interface ActivityProps {
  transactions: SpendingCalculationResult["monthlyTransactions"];
  currency: string;
  month: string;
}

export function SpendingTrend({
  transactions,
  currency,
  month,
}: ActivityProps) {
  const headingId = useId();
  const days = Array.from(
    { length: getDaysInMonth(parseISO(`${month}-01`)) },
    (_, index) => ({ day: index + 1, income: 0, expenses: 0 }),
  );
  for (const transaction of transactions) {
    const day = days[Number(transaction.transaction_date.slice(8, 10)) - 1];
    if (transaction.type === "income")
      day.income += Math.abs(transaction.amount);
    if (transaction.type === "expense")
      day.expenses += Math.abs(transaction.amount);
  }
  let income = 0;
  let expenses = 0;
  const data = days.map((day) => ({
    day: day.day,
    income: (income += day.income),
    expenses: (expenses += day.expenses),
  }));
  const hasActivity = transactions.some(
    (transaction) =>
      transaction.type === "expense" || transaction.type === "income",
  );

  return (
    <section
      aria-labelledby={headingId}
      className="min-w-0 rounded-[1.75rem] bg-card p-5 sm:p-7"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id={headingId} className="text-xl font-medium tracking-tight">
            Your month in motion
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Recorded income and expenses · cumulative
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#517cf5]" />
            Income
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#ed7b85]" />
            Expenses
          </span>
        </div>
      </div>
      {hasActivity ? (
        <>
          <div className="mt-6 h-56 min-w-0" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data}
                margin={{ top: 12, right: 8, bottom: 0, left: 0 }}
              >
                <CartesianGrid
                  vertical={false}
                  stroke="hsl(var(--border))"
                  strokeDasharray="3 6"
                />
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  minTickGap={30}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  dy={8}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  width={80}
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickFormatter={(value) =>
                    formatCompactCurrency(Number(value), currency)
                  }
                />
                <Tooltip
                  labelFormatter={(day) =>
                    format(
                      parseISO(`${month}-${String(day).padStart(2, "0")}`),
                      "d MMMM",
                    )
                  }
                  formatter={(value: number, name: string) => [
                    formatCurrency(value, currency),
                    name === "income" ? "Income" : "Expenses",
                  ]}
                  contentStyle={{
                    borderRadius: 16,
                    border: "1px solid hsl(var(--border))",
                    background: "hsl(var(--card))",
                    color: "hsl(var(--foreground))",
                    fontSize: 12,
                  }}
                />
                <Line
                  type="stepAfter"
                  dataKey="income"
                  stroke="#517cf5"
                  strokeWidth={2.5}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="stepAfter"
                  dataKey="expenses"
                  stroke="#ed7b85"
                  strokeWidth={2.5}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Day of {format(parseISO(`${month}-01`), "MMMM")}</span>
            <span>Logged activity, not a forecast</span>
          </div>
          <details className="mt-4 border-t pt-3 text-xs text-muted-foreground">
            <summary className="w-fit cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              View daily amounts
            </summary>
            <div className="mt-3 max-h-60 overflow-auto">
              <table className="w-full text-left tabular-nums">
                <caption className="sr-only">
                  Cumulative recorded income and expenses for {month}
                </caption>
                <thead>
                  <tr>
                    <th className="py-2">Day</th>
                    <th className="py-2">Income</th>
                    <th className="py-2">Expenses</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((day) => (
                    <tr key={day.day} className="border-t">
                      <td className="py-2">{day.day}</td>
                      <td className="py-2">
                        {formatCurrency(day.income, currency)}
                      </td>
                      <td className="py-2">
                        {formatCurrency(day.expenses, currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      ) : (
        <div className="flex min-h-56 flex-col items-center justify-center gap-3 text-center">
          <span className="rounded-2xl bg-muted p-3">
            <ChartNoAxesCombined className="h-6 w-6 text-muted-foreground" />
          </span>
          <p className="text-sm font-medium">
            Your story starts with one transaction
          </p>
          <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
            Record income or an expense to see this month's activity here. No
            estimates or sample data.
          </p>
        </div>
      )}
    </section>
  );
}

export function DashboardActivity({
  transactions,
  currency,
  month,
}: ActivityProps) {
  const recent = [...transactions]
    .sort(
      (a, b) =>
        b.transaction_date.localeCompare(a.transaction_date) ||
        b.id.localeCompare(a.id),
    )
    .slice(0, 5);
  const expenses = transactions.filter(
    (transaction) => transaction.type === "expense",
  );
  const total = expenses.reduce(
    (sum, transaction) => sum + Math.abs(transaction.amount),
    0,
  );
  const byCategory = new Map<string, number>();
  for (const transaction of expenses)
    byCategory.set(
      transaction.category,
      (byCategory.get(transaction.category) ?? 0) +
        Math.abs(transaction.amount),
    );
  const categories = [...byCategory].sort((a, b) => b[1] - a[1]).slice(0, 4);

  return (
    <aside
      aria-label="Monthly activity"
      className="min-w-0 space-y-8 rounded-[1.75rem] bg-card/50 p-5 xl:rounded-none xl:border-l xl:border-border/70 xl:bg-transparent xl:pl-7 xl:pr-0 xl:pt-1"
    >
      <section aria-labelledby="recent-activity-title">
        <div className="flex items-center justify-between gap-3">
          <h2
            id="recent-activity-title"
            className="text-xl font-medium tracking-tight"
          >
            Recent activity
          </h2>
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-card">
            <Receipt className="h-4 w-4" />
          </span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {format(parseISO(`${month}-01`), "MMMM yyyy")} · latest by transaction
          date
        </p>
        {recent.length > 0 ? (
          <ul className="mt-3 divide-y divide-border/70">
            {recent.map((transaction) => (
              <li key={transaction.id} className="flex items-start gap-3 py-5">
                <span
                  className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${transaction.type === "income" ? "bg-emerald-100/70 text-emerald-800" : transaction.type === "investment" ? "bg-violet-100 text-violet-800" : "bg-rose-100/70 text-rose-800"}`}
                >
                  {transaction.type === "income" ? (
                    <ArrowDownLeft className="h-4 w-4" />
                  ) : transaction.type === "investment" ? (
                    <ArrowLeftRight className="h-4 w-4" />
                  ) : (
                    <ArrowUpRight className="h-4 w-4" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-medium leading-snug">
                    {transaction.description || transaction.category}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {format(parseISO(transaction.transaction_date), "d MMM")} ·{" "}
                    {transaction.type}
                  </p>
                  <p
                    className={`mt-2 inline-flex max-w-full items-baseline text-sm font-medium tabular-nums ${transaction.type === "income" ? "text-success" : ""}`}
                  >
                    {transaction.type === "income" ? "+" : transaction.type === "expense" ? "−" : ""}
                    <CompactAmount
                      amount={Math.abs(transaction.amount)}
                      currency={currency}
                      label={`${transaction.description || transaction.category} amount`}
                    />
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-8 text-sm leading-relaxed text-muted-foreground">
            No transactions this month. Your latest entries will appear here
            after you save them.
          </p>
        )}
        <Link
          to={`/transactions?month=${month}`}
          className="mt-2 inline-flex min-h-10 items-center gap-2 rounded-md text-sm font-medium hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          View all transactions <ArrowUpRight className="h-4 w-4" />
        </Link>
      </section>
      <section
        aria-labelledby="spending-categories-title"
        className="border-t border-border/70 pt-7"
      >
        <h2
          id="spending-categories-title"
          className="text-xl font-medium tracking-tight"
        >
          Where it went
        </h2>
        <p className="mt-2 text-xs text-muted-foreground">
          Top categories · share of recorded expenses
        </p>
        {categories.length > 0 ? (
          <ul className="mt-6 space-y-6">
            {categories.map(([category, amount], index) => (
              <li key={category}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="break-words text-sm">{category}</span>
                  <span className="text-xs text-muted-foreground">
                    {Math.round((amount / total) * 100)}%
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border/70">
                  <div
                    className={`h-full rounded-full ${["bg-blue-500", "bg-violet-400", "bg-rose-400", "bg-teal-400"][index]}`}
                    style={{ width: `${(amount / total) * 100}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  <CompactAmount
                    amount={amount}
                    currency={currency}
                    label={`${category} expenses`}
                  />
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-6 text-sm leading-relaxed text-muted-foreground">
            Add an expense to see which categories make up your spending.
          </p>
        )}
      </section>
    </aside>
  );
}
