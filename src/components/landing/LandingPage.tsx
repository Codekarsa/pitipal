import {
  ArrowDown,
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronDown,
  Github,
  Layers3,
  Plus,
  ReceiptText,
  Sparkles,
  Upload,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface LandingPageProps {
  onGetStarted: () => void;
  onSignIn: () => void;
  onAbout?: () => void;
}

const scenarios = [
  {
    value: "everyday",
    label: "Everyday spending",
    icon: Wallet,
    title: "Little purchases. A clearer picture.",
    description:
      "Record a coffee, groceries, or your monthly bills. Give each expense a pocket so you know what’s left for the rest of the month.",
    caption: "Example transactions · manually recorded",
    rows: [
      {
        label: "Weekly groceries",
        detail: "Groceries pocket",
        amount: "− IDR 220,000",
        icon: ReceiptText,
      },
      {
        label: "Morning coffee",
        detail: "Eating out pocket",
        amount: "− IDR 30,000",
        icon: ReceiptText,
      },
      {
        label: "Monthly salary",
        detail: "Income · separate from spending",
        amount: "+ IDR 8,000,000",
        icon: ArrowDownLeft,
      },
    ],
    note: "Income and expenses stay separate. Your budget reflects what you record.",
  },
  {
    value: "busy",
    label: "Busy days",
    icon: Upload,
    title: "A busy week doesn’t need a busy spreadsheet.",
    description:
      "Enter several transactions together, or bring in a CSV file. Check dates, pockets, and totals before saving your records.",
    caption: "Your catch-up checklist",
    rows: [
      {
        label: "Add multiple transactions",
        detail: "Keep your entries together",
        amount: "01",
        icon: Plus,
      },
      {
        label: "Import a CSV",
        detail: "Use a template or your own file",
        amount: "02",
        icon: Upload,
      },
      {
        label: "Review before saving",
        detail: "Check totals and flagged rows",
        amount: "03",
        icon: Check,
      },
    ],
    note: "Use the original transaction dates when catching up on previous days.",
  },
  {
    value: "planning",
    label: "Months ahead",
    icon: CalendarDays,
    title: "Plan ahead. Leave room for real life.",
    description:
      "Copy a month’s budgets into the next three months, then adjust each month. Repeat the pockets that work without starting from scratch.",
    caption: "Example three-month plan · base budgets",
    rows: [
      {
        label: "Month one",
        detail: "Groceries",
        amount: "IDR 3,000,000",
        icon: CalendarDays,
      },
      {
        label: "Month two",
        detail: "Groceries",
        amount: "IDR 3,000,000",
        icon: CalendarDays,
      },
      {
        label: "Month three",
        detail: "Groceries",
        amount: "IDR 3,000,000",
        icon: CalendarDays,
      },
    ],
    note: "Carryover is confirmed when the month starts. It is not new income.",
  },
];

const questions = [
  {
    question: "What is a budget pocket?",
    answer:
      "A pocket is an amount you set aside in your plan for something like groceries, rent, or eating out. Record expenses against it to see what remains. It does not move money between bank accounts.",
  },
  {
    question: "Do I need to connect my bank?",
    answer:
      "No. Add transactions yourself or import them from a CSV file. Pitipal’s summaries depend on the records you enter; the remaining budget is not your bank balance.",
  },
  {
    question: "Can I catch up on several days of transactions?",
    answer:
      "Yes. Use Add multiple for a batch of entries, or import a CSV for a larger list. Keep each transaction’s original date and review the totals before saving.",
  },
  {
    question: "What happens to last month’s unused budget?",
    answer:
      "Choose a rollover rule for your pocket: reset, carry over, or carry a percentage. With carryover, this month’s allowance is its base budget plus the eligible unused amount—not automatically double. For example, a 3M base plus 500k carried over gives you 3.5M to spend. Carryover is not income.",
  },
  {
    question: "Is Pitipal free and open source?",
    answer:
      "The software is open source under the AGPL-3.0 license. You can get started here without a credit card. Hosting, support, and data practices depend on the deployment; read the privacy and usage information before entering sensitive data.",
  },
];

export function LandingPage({
  onGetStarted,
  onSignIn,
  onAbout,
}: LandingPageProps) {
  const primaryButton =
    "rounded-lg bg-[hsl(0_0%_8%)] text-white shadow-sm hover:bg-[hsl(0_0%_20%)] focus-visible:ring-[hsl(15_75%_45%)]";

  return (
    <div className="min-h-screen bg-[hsl(30_20%_96%)] text-[hsl(0_0%_8%)] selection:bg-[hsl(15_90%_86%)] [&_a]:focus-visible:outline-offset-4">
      <a
        href="#landing-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:p-3"
      >
        Skip to content
      </a>

      <div className="relative isolate overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_0%_18%,hsl(20_90%_85%_/_0.5),transparent_38%),radial-gradient(ellipse_at_100%_30%,hsl(335_80%_89%_/_0.55),transparent_40%),radial-gradient(ellipse_at_55%_65%,hsl(275_80%_91%_/_0.5),transparent_45%)]"
        />

        <header className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
          <a
            href="#"
            aria-label="Pitipal home"
            className="flex shrink-0 items-center gap-2 font-semibold tracking-tight sm:text-lg"
          >
            <img
              src="/pitipal_square.png"
              alt=""
              width="32"
              height="32"
              className="rounded-lg"
            />
            Pitipal
          </a>
          <nav
            aria-label="Main navigation"
            className="hidden items-center gap-7 text-sm md:flex"
          >
            <a
              href="#how-it-works"
              className="transition-colors hover:text-[hsl(15_70%_38%)]"
            >
              How it works
            </a>
            <a
              href="#features"
              className="transition-colors hover:text-[hsl(15_70%_38%)]"
            >
              Features
            </a>
            <a
              href="#faq"
              className="transition-colors hover:text-[hsl(15_70%_38%)]"
            >
              FAQs
            </a>
            {onAbout && (
              <button
                onClick={onAbout}
                className="rounded-sm hover:underline focus-visible:outline-offset-4"
              >
                About
              </button>
            )}
          </nav>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <Button
              onClick={onSignIn}
              variant="ghost"
              size="sm"
              className="px-2 text-xs hover:bg-black/5 hover:text-black sm:px-3 sm:text-sm"
            >
              Sign In
            </Button>
            <Button
              onClick={onGetStarted}
              size="sm"
              className={`${primaryButton} px-2.5 text-xs sm:px-4 sm:text-sm`}
            >
              Get Started
            </Button>
          </div>
        </header>

        <main id="landing-main">
          <section
            aria-labelledby="hero-title"
            className="mx-auto max-w-6xl px-4 pb-14 pt-9 text-center sm:px-6 sm:pb-20 sm:pt-16 lg:px-8"
          >
            <p className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/55 px-3 py-1.5 text-xs text-[hsl(0_0%_30%)] shadow-sm">
              <Sparkles
                aria-hidden="true"
                className="h-3.5 w-3.5 text-[hsl(15_75%_45%)]"
              />{" "}
              A little clarity for your everyday money
            </p>
            <h1
              id="hero-title"
              className="mx-auto mt-5 max-w-3xl text-[clamp(1.75rem,8.5vw,2.5rem)] font-semibold leading-[1.08] tracking-[-0.045em] sm:text-6xl lg:text-[4.5rem]"
            >
              Know what’s left.
              <br />
              Enjoy what’s next.
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-[hsl(0_0%_38%)] sm:text-lg">
              Set budgets for your priorities. Record your spending, see what
              remains, and make room for what matters.
            </p>
            <Button
              onClick={onGetStarted}
              size="lg"
              className={`${primaryButton} mt-7 h-12 px-6 text-sm`}
            >
              Get started free <ArrowUpRight aria-hidden="true" />
            </Button>
            <p className="mt-3 text-xs text-[hsl(0_0%_40%)]">
              No credit card. No bank connection required.
            </p>

            <figure className="mx-auto mt-10 max-w-5xl text-left sm:mt-14">
              <div className="rounded-2xl bg-gradient-to-br from-[hsl(12_90%_69%)] via-[hsl(330_75%_83%)] to-[hsl(275_80%_73%)] p-[1.5px] shadow-[0_24px_70px_-30px_hsl(310_30%_45%_/_0.35)]">
                <div className="overflow-hidden rounded-[calc(1rem-1.5px)] bg-white">
                  <div className="flex items-center justify-between gap-2 border-b border-black/5 px-3 py-2.5 sm:px-4">
                    <div aria-hidden="true" className="flex gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-[hsl(12_80%_76%)]" />
                      <span className="h-2 w-2 rounded-full bg-[hsl(35_80%_77%)]" />
                      <span className="h-2 w-2 rounded-full bg-[hsl(155_35%_71%)]" />
                    </div>
                    <span className="text-[10px] text-[hsl(0_0%_40%)] sm:text-xs">
                      A look inside Pitipal · example data
                    </span>
                    <span aria-hidden="true" className="w-8" />
                  </div>
                  <img
                    src="/landing-dashboard.webp"
                    alt="Pitipal dashboard example showing remaining budget, separate income and spending cards, a monthly trend chart, and recent transactions."
                    width="1800"
                    height="1215"
                    fetchPriority="high"
                    className="block h-auto w-full"
                  />
                </div>
              </div>
              <figcaption className="mt-3 text-center text-xs leading-relaxed text-[hsl(0_0%_40%)]">
                Illustrative account, not live financial data. Your totals
                depend on the transactions you record.
              </figcaption>
            </figure>
            <div className="mt-8 flex flex-wrap justify-center gap-x-7 gap-y-3 text-xs text-[hsl(0_0%_35%)] sm:mt-10 sm:text-sm">
              {[
                { icon: Wallet, label: "Budgets that make sense" },
                { icon: Upload, label: "CSV import & export" },
                { icon: Github, label: "Open source, by design" },
              ].map(({ icon: Icon, label }) => (
                <span key={label} className="inline-flex items-center gap-2">
                  <Icon
                    aria-hidden="true"
                    className="h-4 w-4 text-[hsl(0_0%_45%)]"
                  />
                  {label}
                </span>
              ))}
            </div>
          </section>

          <div className="mx-auto max-w-6xl space-y-20 px-4 pb-16 sm:space-y-28 sm:px-6 lg:px-8">
            <section
              id="how-it-works"
              aria-labelledby="how-title"
              className="scroll-mt-8"
            >
              <div className="grid gap-7 md:grid-cols-[0.9fr_1.1fr] md:gap-16">
                <div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs">
                    A simpler starting point
                  </span>
                  <h2
                    id="how-title"
                    className="mt-4 max-w-sm text-3xl font-semibold leading-tight tracking-tight sm:text-4xl"
                  >
                    Less money guesswork.
                    <br />
                    More everyday confidence.
                  </h2>
                  <p className="mt-4 max-w-sm text-sm leading-relaxed text-[hsl(0_0%_40%)]">
                    You don’t need a perfect spreadsheet. Start with one pocket
                    and one transaction.
                  </p>
                </div>
                <ol className="divide-y divide-black/10">
                  {[
                    {
                      title: "Choose your currency",
                      text: "Set up your account with the currency you use every day.",
                    },
                    {
                      title: "Give your money a plan",
                      text: "Create pockets for groceries, rent, or your next adventure.",
                    },
                    {
                      title: "Record it. See what’s left.",
                      text: "Add your first transaction and watch your pocket update.",
                    },
                  ].map(({ title, text }, index) => (
                    <li
                      key={title}
                      className="flex gap-4 py-5 first:pt-0 last:pb-0"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-black/10 bg-white text-xs text-[hsl(0_0%_35%)]">
                        0{index + 1}
                      </span>
                      <div>
                        <h3 className="font-medium">{title}</h3>
                        <p className="mt-1 text-sm leading-relaxed text-[hsl(0_0%_40%)]">
                          {text}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </section>

            <section
              id="features"
              aria-labelledby="pockets-title"
              className="scroll-mt-8 rounded-3xl border border-white bg-white/75 p-5 sm:p-8 lg:p-10"
            >
              <div className="grid items-center gap-9 md:grid-cols-2 lg:gap-16">
                <div>
                  <span className="inline-flex items-center gap-2 text-xs text-[hsl(15_70%_38%)]">
                    <Layers3 aria-hidden="true" className="h-4 w-4" />A place
                    for every priority
                  </span>
                  <h2
                    id="pockets-title"
                    className="mt-4 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl"
                  >
                    Your budget.
                    <br />
                    In little, useful pockets.
                  </h2>
                  <p className="mt-4 max-w-md text-sm leading-relaxed text-[hsl(0_0%_40%)]">
                    A pocket is a spending limit, not another bank account. Give
                    each priority an amount, then see what’s still available as
                    you go.
                  </p>
                  <ul className="mt-6 space-y-3 text-sm">
                    {[
                      "See budget, spending, and remaining at a glance",
                      "Repeat monthly without rebuilding your plan",
                      "Choose how unused budget rolls over",
                    ].map((text) => (
                      <li key={text} className="flex gap-2.5">
                        <Check
                          aria-hidden="true"
                          className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(155_35%_36%)]"
                        />
                        {text}
                      </li>
                    ))}
                  </ul>
                  <a
                    href="#situations"
                    className="mt-7 inline-flex min-h-10 items-center gap-2 rounded-sm text-sm font-medium underline decoration-black/25 underline-offset-4 hover:decoration-black"
                  >
                    Find your rhythm{" "}
                    <ArrowDown aria-hidden="true" className="h-4 w-4" />
                  </a>
                </div>
                <figure className="rounded-2xl bg-[linear-gradient(135deg,hsl(22_85%_90%),hsl(340_60%_92%)_52%,hsl(272_60%_89%))] p-5 sm:p-8">
                  <div className="rounded-2xl border border-white/80 bg-white/85 p-5 shadow-[0_12px_30px_-20px_hsl(320_20%_30%_/_0.4)] sm:p-6">
                    <div className="flex items-center justify-between gap-3">
                      <span className="rounded-xl bg-[hsl(25_85%_92%)] p-2.5">
                        <Wallet
                          aria-hidden="true"
                          className="h-5 w-5 text-[hsl(18_60%_40%)]"
                        />
                      </span>
                      <span className="rounded-full bg-[hsl(145_30%_94%)] px-2.5 py-1 text-xs text-[hsl(155_35%_28%)]">
                        Monthly pocket
                      </span>
                    </div>
                    <h3 className="mt-5 text-lg font-semibold">Groceries</h3>
                    <p className="mt-1 text-xs text-[hsl(0_0%_40%)]">
                      Left to spend
                    </p>
                    <p className="mt-2 whitespace-nowrap text-[clamp(1.25rem,5vw,2rem)] font-semibold tracking-tight">
                      IDR 2,750,000
                    </p>
                    <div
                      aria-hidden="true"
                      className="mt-5 h-2 overflow-hidden rounded-full bg-[hsl(270_30%_92%)]"
                    >
                      <div className="h-full w-[8.3333%] rounded-full bg-[hsl(15_75%_65%)]" />
                    </div>
                    <dl className="mt-5 space-y-3 text-xs sm:text-sm">
                      <div className="flex flex-wrap justify-between gap-1">
                        <dt className="text-[hsl(0_0%_40%)]">Monthly budget</dt>
                        <dd className="font-medium">IDR 3,000,000</dd>
                      </div>
                      <div className="flex flex-wrap justify-between gap-1">
                        <dt className="text-[hsl(0_0%_40%)]">
                          Spending recorded
                        </dt>
                        <dd className="font-medium">IDR 250,000</dd>
                      </div>
                    </dl>
                  </div>
                  <figcaption className="mt-4 text-center text-xs leading-relaxed text-[hsl(0_0%_35%)]">
                    Example only · 3M budget − 250k spent = 2.75M left
                  </figcaption>
                </figure>
              </div>
            </section>

            <section
              id="situations"
              aria-labelledby="situations-title"
              className="scroll-mt-8"
            >
              <div className="mx-auto max-w-xl text-center">
                <span className="rounded-full bg-white px-3 py-1 text-xs">
                  Made for your kind of month
                </span>
                <h2
                  id="situations-title"
                  className="mt-4 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl"
                >
                  A little structure.
                  <br />A lot of flexibility.
                </h2>
              </div>
              <Tabs defaultValue="everyday" className="mt-8">
                <TabsList
                  aria-label="Budgeting situations"
                  className="mx-auto grid h-auto w-full grid-cols-1 gap-1.5 rounded-2xl bg-white/65 p-2 sm:max-w-2xl sm:grid-cols-3"
                >
                  {scenarios.map(({ value, label, icon: Icon }) => (
                    <TabsTrigger
                      key={value}
                      value={value}
                      className="min-h-11 gap-2 rounded-lg border border-transparent px-3 text-xs text-[hsl(0_0%_35%)] data-[state=active]:border-[hsl(15_70%_75%)] data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-none sm:text-sm"
                    >
                      <Icon aria-hidden="true" className="h-4 w-4" />
                      {label}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {scenarios.map(
                  ({ value, title, description, caption, rows, note }) => (
                    <TabsContent
                      key={value}
                      value={value}
                      className="mt-4 rounded-3xl bg-white p-5 sm:p-8 lg:p-10"
                    >
                      <div className="grid items-center gap-7 md:grid-cols-2 lg:gap-16">
                        <div>
                          <h3 className="max-w-sm text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
                            {title}
                          </h3>
                          <p className="mt-4 max-w-md text-sm leading-relaxed text-[hsl(0_0%_40%)]">
                            {description}
                          </p>
                          <Button
                            onClick={onGetStarted}
                            className={`${primaryButton} mt-6`}
                          >
                            Get started free <ArrowUpRight aria-hidden="true" />
                          </Button>
                        </div>
                        <div className="min-w-0 rounded-2xl bg-[hsl(30_20%_97%)] p-4 sm:p-5">
                          <p className="mb-2 text-xs text-[hsl(0_0%_40%)]">
                            {caption}
                          </p>
                          <ul className="divide-y divide-black/5">
                            {rows.map(
                              ({ label, detail, amount, icon: Icon }) => (
                                <li
                                  key={label}
                                  className="flex flex-wrap items-center gap-3 py-4"
                                >
                                  <span className="rounded-xl bg-white p-2.5">
                                    <Icon
                                      aria-hidden="true"
                                      className="h-4 w-4 text-[hsl(325_40%_45%)]"
                                    />
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium">
                                      {label}
                                    </p>
                                    <p className="mt-0.5 text-xs text-[hsl(0_0%_40%)]">
                                      {detail}
                                    </p>
                                  </div>
                                  <p className="ml-auto text-xs font-medium tabular-nums">
                                    {amount}
                                  </p>
                                </li>
                              ),
                            )}
                          </ul>
                          <p className="mt-2 text-xs leading-relaxed text-[hsl(0_0%_40%)]">
                            {note}
                          </p>
                        </div>
                      </div>
                    </TabsContent>
                  ),
                )}
              </Tabs>
            </section>

            <section
              id="faq"
              aria-labelledby="faq-title"
              className="mx-auto max-w-3xl scroll-mt-8"
            >
              <div className="text-center">
                <span className="rounded-full bg-white px-3 py-1 text-xs">
                  A few things worth knowing
                </span>
                <h2
                  id="faq-title"
                  className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl"
                >
                  Good questions. Clear answers.
                </h2>
              </div>
              <div className="mt-8 divide-y divide-black/10 border-y border-black/10">
                {questions.map(({ question, answer }) => (
                  <details key={question} className="group py-1">
                    <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 rounded-sm py-4 text-left text-sm font-medium focus-visible:outline-offset-4 [&::-webkit-details-marker]:hidden sm:text-base">
                      {question}
                      <ChevronDown
                        aria-hidden="true"
                        className="h-4 w-4 shrink-0 text-[hsl(0_0%_45%)] transition-transform group-open:rotate-180 motion-reduce:transition-none"
                      />
                    </summary>
                    <p className="max-w-2xl pb-5 pr-5 text-sm leading-relaxed text-[hsl(0_0%_38%)]">
                      {answer}
                    </p>
                  </details>
                ))}
              </div>
              <p className="mt-5 text-center text-xs leading-relaxed text-[hsl(0_0%_40%)]">
                Your data matters. Read our{" "}
                <a
                  href="/privacy.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2"
                >
                  privacy information (new tab)
                </a>{" "}
                before getting started.
              </p>
            </section>

            <section
              aria-labelledby="start-title"
              className="rounded-3xl bg-[linear-gradient(120deg,hsl(18_85%_82%),hsl(335_75%_87%),hsl(275_70%_83%))] p-[1px]"
            >
              <div className="rounded-[calc(1.5rem-1px)] bg-[hsl(30_20%_97%_/_0.88)] px-5 py-10 text-center sm:px-8 sm:py-14">
                <span className="inline-flex rounded-2xl bg-white/70 p-3">
                  <Wallet aria-hidden="true" className="h-6 w-6" />
                </span>
                <h2
                  id="start-title"
                  className="mx-auto mt-5 max-w-xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl"
                >
                  Make a little room
                  <br />
                  for peace of mind.
                </h2>
                <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-[hsl(0_0%_38%)]">
                  Start with your currency, one pocket, and your first
                  transaction. Build a plan that feels like you.
                </p>
                <Button
                  onClick={onGetStarted}
                  size="lg"
                  className={`${primaryButton} mt-6 text-sm`}
                >
                  Get started free <ArrowRight aria-hidden="true" />
                </Button>
              </div>
            </section>
          </div>
        </main>

        <footer className="mx-auto max-w-6xl border-t border-black/10 px-4 py-7 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
            <div>
              <a
                href="#"
                className="inline-flex items-center gap-2 font-semibold"
              >
                <img
                  src="/pitipal_square.png"
                  alt=""
                  width="28"
                  height="28"
                  className="rounded-lg"
                />
                Pitipal
              </a>
              <p className="mt-2 text-xs text-[hsl(0_0%_40%)]">
                A little more clarity. A little more control.
              </p>
            </div>
            <nav
              aria-label="Data and usage information"
              className="flex flex-wrap items-center gap-x-5 gap-y-3 text-xs text-[hsl(0_0%_35%)]"
            >
              <a
                href="https://github.com/Codekarsa/pitipal"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 hover:underline"
              >
                <Github aria-hidden="true" className="h-3.5 w-3.5" />
                Source on GitHub<span className="sr-only"> (new tab)</span>
              </a>
              <a
                href="/privacy.html"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                Privacy information (new tab)
              </a>
              <a
                href="/usage.html"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                Usage information (new tab)
              </a>
              {onAbout && (
                <button
                  onClick={onAbout}
                  className="rounded-sm hover:underline"
                >
                  About Pitipal
                </button>
              )}
            </nav>
          </div>
          <p className="mt-6 text-xs text-[hsl(0_0%_45%)]">
            Open-source software · AGPL-3.0
          </p>
        </footer>
      </div>
    </div>
  );
}
