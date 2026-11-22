import { test, expect, type Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { addMonths, format, startOfMonth } from 'date-fns';

const apiUrl = process.env.E2E_SUPABASE_URL;
if (!apiUrl || !process.env.E2E_BASE_URL || !process.env.E2E_SUPABASE_SERVICE_ROLE_KEY) throw new Error('Set local E2E_BASE_URL, E2E_SUPABASE_URL and E2E_SUPABASE_SERVICE_ROLE_KEY');
if (!['localhost', '127.0.0.1', '[::1]'].includes(new URL(apiUrl).hostname)) throw new Error('Local Supabase required');
const admin = createClient(apiUrl, process.env.E2E_SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
test.use({ baseURL: process.env.E2E_BASE_URL, viewport: { width: 1280, height: 900 }, launchOptions: { executablePath: process.env.E2E_CHROME_PATH } });
test.setTimeout(120000);
const month = format(new Date(), 'yyyy-MM');
const today = format(new Date(), 'yyyy-MM-dd');
const next = (n: number) => format(addMonths(startOfMonth(new Date()), n), 'yyyy-MM');
let userId: string;
let pocketId: string;
let email: string;
const password = 'Local-workflows-password-42';

async function checked<T>(request: PromiseLike<{ data: T; error: unknown }>): Promise<T> {
  const result = await request;
  expect(result.error).toBeNull();
  return result.data;
}
async function signIn(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Get Started', exact: true }).click();
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
}
test.beforeEach(async () => {
  email = `workflows-${randomUUID()}@pitipal.test`;
  userId = (await checked(admin.auth.admin.createUser({ email, password, email_confirm: true }))).user!.id;
  await checked(admin.from('profiles').update({ currency: 'IDR' }).eq('user_id', userId));
  pocketId = (await checked(admin.from('budget_pockets').insert({ user_id: userId, name: 'Groceries', month_year: month, is_template: false, budget_amount: 3000000, pocket_type: 'expense' }).select('id').single())).id;
});
test.afterEach(async () => {
  if (!userId) return;
  await checked(admin.from('transactions').delete().eq('user_id', userId));
  // Remove children before standalone lineage roots as well as templates.
  await checked(admin.from('budget_pockets').delete().eq('user_id', userId).not('parent_pocket_id', 'is', null));
  await checked(admin.from('budget_pockets').delete().eq('user_id', userId));
  await checked(admin.auth.admin.deleteUser(userId));
});

test('dashboard activity uses the selected month and keeps income separate from spending', async ({ page }) => {
  const rows = [
    { transaction_date: `${month}-02`, type: 'income', amount: 500, category: 'Salary', description: 'Pay received', pocket_id: null },
    { transaction_date: `${month}-03`, type: 'expense', amount: -127, category: 'Food & Dining', description: 'Legacy grocery expense', pocket_id: pocketId },
    { transaction_date: `${month}-05`, type: 'expense', amount: 83, category: 'Transportation', description: 'Train ticket', pocket_id: null },
    { transaction_date: `${month}-06`, type: 'investment', amount: 900, category: 'Investment', description: 'Investment purchase', pocket_id: null },
    { transaction_date: `${next(-1)}-28`, type: 'expense', amount: 9999, category: 'Shopping', description: 'Last month purchase', pocket_id: null },
  ];
  await checked(admin.from('transactions').insert(rows.map(row => ({ ...row, user_id: userId }))));
  await signIn(page);
  const activity = page.getByRole('complementary', { name: 'Monthly activity', exact: true });
  await expect(activity).toContainText('Investment purchase');
  await expect(activity).not.toContainText('Last month purchase');
  const categories = activity.getByRole('region', { name: 'Where it went', exact: true });
  await expect(categories).toContainText('Food & Dining');
  await expect(categories).toContainText('60%');
  await expect(categories).toContainText('40%');
  await expect(categories).not.toContainText('Investment');
  await expect(categories).not.toContainText('Salary');
  await page.getByText('View daily amounts', { exact: true }).click();
  const table = page.getByRole('table', { name: `Cumulative recorded income and expenses for ${month}` });
  const second = table.getByRole('row').filter({ has: page.getByRole('cell', { name: '2', exact: true }) });
  await expect(second.getByRole('cell').nth(1)).toHaveText(/IDR\s500/);
  await expect(second.getByRole('cell').nth(2)).toHaveText(/IDR\s0/);
  const fifth = table.getByRole('row').filter({ has: page.getByRole('cell', { name: '5', exact: true }) });
  await expect(fifth.getByRole('cell').nth(1)).toHaveText(/IDR\s500/);
  await expect(fifth.getByRole('cell').nth(2)).toHaveText(/IDR\s210/);
  const sixth = table.getByRole('row').filter({ has: page.getByRole('cell', { name: '6', exact: true }) });
  await expect(sixth.getByRole('cell').nth(1)).toHaveText(/IDR\s500/);
  await expect(sixth.getByRole('cell').nth(2)).toHaveText(/IDR\s210/);
  await page.getByText('View daily amounts', { exact: true }).click();

  // A real header save refreshes both the chart and side panel without a reload.
  await page.getByRole('button', { name: 'Add Transaction', exact: true }).click();
  await page.getByLabel('Amount', { exact: false }).fill('47');
  await page.getByLabel('Date', { exact: true }).fill(`${month}-07`);
  await page.getByLabel('Category', { exact: false }).click();
  await page.getByRole('option', { name: 'Food & Dining', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Add Transaction', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(activity).toContainText('Food & Dining');
  await page.getByText('View daily amounts', { exact: true }).click();
  await expect(table.getByRole('row').filter({ has: page.getByRole('cell', { name: '7', exact: true }) })).toContainText('257');
  await page.getByRole('button', { name: 'Next month', exact: true }).click();
  await expect(page.getByText('Your story starts with one transaction', { exact: true })).toBeVisible();
  await expect(activity).not.toContainText('Investment purchase');
  await expect(activity.getByRole('link', { name: 'View all transactions' })).toHaveAttribute('href', `/transactions?month=${next(1)}`);
});

test('20 header saves retain choices and refresh the mounted list after every save', async ({ page }) => {
  await signIn(page);
  await page.getByRole('navigation').getByRole('button', { name: 'Transactions', exact: true }).click();
  await page.getByRole('button', { name: 'Add Transaction', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('radio', { name: 'Expense', exact: true }).focus();
  await page.keyboard.down('ArrowRight');
  await expect(dialog.getByRole('radio', { name: 'Income', exact: true })).toBeChecked();
  await page.keyboard.up('ArrowRight');
  await page.keyboard.down('ArrowLeft');
  await expect(dialog.getByRole('radio', { name: 'Expense', exact: true })).toBeChecked();
  await page.keyboard.up('ArrowLeft');
  await dialog.getByLabel('Category', { exact: false }).click();
  await page.getByRole('option', { name: 'Food & Dining', exact: true }).click();
  await page.getByLabel('Budget Pocket', { exact: true }).click();
  await page.getByRole('option', { name: 'Groceries', exact: true }).click();
  await page.getByLabel('Keep adding transactions', { exact: true }).check();
  for (let i = 1; i <= 20; i++) {
    await dialog.getByLabel('Amount', { exact: false }).fill(String(i * 1000));
    await dialog.getByRole('button', { name: 'Save & add another', exact: true }).click();
    await expect(dialog.getByLabel('Amount', { exact: false })).toHaveValue('');
    await expect(dialog.getByLabel('Category', { exact: false })).toContainText('Food & Dining');
    await expect(page.getByLabel('Budget Pocket', { exact: true })).toContainText('Groceries');
    await expect(page.getByLabel('Date', { exact: true })).toHaveValue(today);
    await expect(page.getByRole('heading', { name: new RegExp(`Transactions for.*\\(${i}\\)`), includeHidden: true })).toBeAttached();
  }
  await dialog.getByRole('button', { name: 'Done — 20 saved', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Total Expenses', exact: true })).toContainText('210,000');
  const saved = await checked(admin.from('transactions').select('amount,pocket_id,category,transaction_date').eq('user_id', userId));
  expect(saved).toHaveLength(20);
  expect(saved.reduce((sum, row) => sum + row.amount, 0)).toBe(210000);
  expect(saved.every(row => row.pocket_id === pocketId && row.transaction_date === today && row.category === 'Food & Dining')).toBe(true);
  await page.getByRole('button', { name: 'Add Transaction', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Cancel', exact: true })).toBeVisible();
  await expect(page.getByLabel('Keep adding transactions', { exact: true })).not.toBeChecked();
});

test('50 rows on several dates review an independent total, survive failure, and save once', async ({ page }) => {
  await signIn(page);
  await page.getByRole('navigation').getByRole('button', { name: 'Transactions', exact: true }).click();
  await page.getByRole('button', { name: 'Add multiple', exact: true }).click();
  await page.getByText('Defaults for repeated entries (optional)', { exact: true }).click();
  await page.getByLabel('Default category', { exact: true }).selectOption({ label: 'Food & Dining' });
  await page.getByLabel('Default pocket', { exact: true }).selectOption(pocketId);
  for (let i = 0; i < 9; i++) await page.getByRole('button', { name: 'Add 5 rows', exact: true }).click();
  for (let i = 1; i <= 50; i++) {
    await page.getByLabel(`Amount ${i}`, { exact: true }).fill(String(i * 1000));
    if (i % 2 === 0) await page.getByLabel(`Date ${i}`, { exact: true }).fill(`${month}-02`);
    if (i === 50) await page.getByLabel(`Date ${i}`, { exact: true }).fill(`${next(-1)}-28`);
  }
  await page.getByRole('button', { name: 'Review 50 transactions', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('1,275,000');
  await expect(page.getByRole('dialog')).toContainText('25 without a pocket');
  await page.route('**/rest/v1/transactions*', async route => {
    if (route.request().method() === 'POST') await route.fulfill({ status: 503, json: { message: 'Temporary test outage' } });
    else await route.continue();
  });
  await page.getByRole('button', { name: 'Save 50 transactions', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Temporary test outage');
  expect(await checked(admin.from('transactions').select('id').eq('user_id', userId))).toHaveLength(0);
  await page.unroute('**/rest/v1/transactions*');
  await page.getByRole('button', { name: 'Save 50 transactions', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: /Transactions for.*\(49\)/ })).toBeVisible();
  const saved = await checked(admin.from('transactions').select('amount,transaction_date,pocket_id').eq('user_id', userId));
  expect(saved).toHaveLength(50);
  expect(saved.reduce((sum, row) => sum + row.amount, 0)).toBe(1275000);
  expect(saved.filter(row => row.transaction_date === `${next(-1)}-28`)).toEqual([expect.objectContaining({ amount: 50000, pocket_id: null })]);
  await page.getByRole('navigation').getByRole('button', { name: 'Dashboard', exact: true }).click();
  await expect(page.getByText(/in 24 unassigned expenses/)).toContainText('600,000');
});

test('selected-month creation, three-month planning and explicit edit scopes preserve monthly overrides', async ({ page }) => {
  await signIn(page);
  await page.getByRole('navigation').getByRole('button', { name: 'Pockets', exact: true }).click();
  await page.locator('main button').filter({ has: page.locator('svg.lucide-chevron-right') }).click();
  await page.getByRole('button', { name: 'Create Pocket', exact: true }).click();
  await expect(page.getByLabel('Budget month', { exact: true })).toHaveValue(next(1));
  await page.getByLabel('Pocket Name', { exact: false }).fill('Transport');
  await page.getByLabel('Monthly Budget Amount', { exact: true }).fill('500000');
  await page.getByRole('dialog').getByRole('button', { name: 'Create Pocket', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const transport = await checked(admin.from('budget_pockets').select('month_year,is_template').eq('user_id', userId).eq('name', 'Transport'));
  expect(transport.filter(row => !row.is_template)).toEqual([{ month_year: next(1), is_template: false }]);
  await page.getByRole('button', { name: 'Plan months', exact: true }).click();
  await page.getByLabel('Copy budgets from', { exact: true }).fill(month);
  await page.getByLabel('First month to plan', { exact: true }).fill(next(1));
  await expect(page.getByRole('dialog')).toContainText('3,000,000 spending allowance per month');
  await page.getByRole('button', { name: 'Save budget plan', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Actions for Groceries', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Edit', exact: true }).click();
  await expect(page.getByLabel('Budget edit scope')).toContainText('This month only');
  await page.getByLabel('Monthly base budget', { exact: true }).fill('3500000');
  await page.getByRole('button', { name: 'Update Pocket', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  let plans = await checked(admin.from('budget_pockets').select('month_year,base_budget_amount').eq('user_id', userId).eq('name', 'Groceries').order('month_year'));
  expect(plans.map(p => p.base_budget_amount)).toEqual([3000000, 3500000, 3000000, 3000000]);
  await page.getByRole('button', { name: 'Plan months', exact: true }).click();
  await page.getByLabel('Copy budgets from', { exact: true }).fill(month);
  await page.getByLabel('First month to plan', { exact: true }).fill(next(1));
  await page.getByRole('button', { name: 'Save budget plan', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Actions for Groceries', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Edit', exact: true }).click();
  await page.getByLabel('Budget edit scope').click();
  await page.getByRole('option', { name: 'This month and future months', exact: true }).click();
  await page.getByLabel('Monthly base budget', { exact: true }).fill('4000000');
  await page.getByRole('button', { name: 'Update Pocket', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  plans = await checked(admin.from('budget_pockets').select('month_year,base_budget_amount').eq('user_id', userId).eq('name', 'Groceries').order('month_year'));
  expect(plans.map(p => p.base_budget_amount)).toEqual([3000000, 4000000, 4000000, 4000000]);
});

test('unassigned review keeps month and totals scoped and persists an explicit pocket correction', async ({ page }) => {
  const previousMonth = next(-1);
  const previousPocket = (await checked(admin.from('budget_pockets').insert({
    user_id: userId, name: 'Previous groceries', month_year: previousMonth,
    is_template: false, budget_amount: 90000, pocket_type: 'expense',
  }).select('id').single())).id;
  const rows = [
    { description: 'Current unassigned', amount: 123456789, type: 'expense', pocket_id: null, transaction_date: `${month}-12` },
    { description: 'Current assigned', amount: 37000, type: 'expense', pocket_id: pocketId, transaction_date: `${month}-13` },
    { description: 'Current income', amount: 910000, type: 'income', pocket_id: null, transaction_date: `${month}-14` },
    { description: 'Previous unassigned', amount: 8100, type: 'expense', pocket_id: null, transaction_date: `${previousMonth}-12` },
    { description: 'Previous assigned', amount: 19000, type: 'expense', pocket_id: previousPocket, transaction_date: `${previousMonth}-13` },
    { description: 'Previous income', amount: 43000, type: 'income', pocket_id: null, transaction_date: `${previousMonth}-14` },
  ];
  await checked(admin.from('transactions').insert(rows.map(row => ({ ...row, user_id: userId, category: row.type === 'expense' ? 'Food & Dining' : 'Salary' }))));
  await signIn(page);
  await page.getByRole('button', { name: 'Review unassigned expenses', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/transactions\\?month=${month}&pocket=unassigned$`));
  await expect(page.getByLabel('Pocket', { exact: true })).toHaveValue('unassigned');
  await expect(page.getByRole('heading', { name: /Transactions for.*\(1\)/ })).toBeVisible();
  const currentRow = page.getByRole('row').filter({ hasText: 'Current unassigned' });
  await expect(currentRow).toContainText('Unassigned');
  await expect(currentRow).toContainText('123,456,789');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const assignAction = currentRow.getByRole('button', { name: 'Assign pocket', exact: true });
  await expect(assignAction).toBeInViewport();
  expect(await assignAction.evaluate(element => {
    const bounds = element.getBoundingClientRect();
    const tableViewport = element.closest('table')!.parentElement!.getBoundingClientRect();
    return bounds.left >= tableViewport.left && bounds.right <= tableViewport.right;
  })).toBe(true);
  await expect(page.getByRole('region', { name: 'Total Income', exact: true })).toContainText('0');
  const exactAmount = currentRow.locator('td').filter({ hasText: '123,456,789' }).locator('span');
  expect(await exactAmount.evaluate(element => {
    const range = document.createRange();
    range.selectNodeContents(element);
    return { lines: new Set([...range.getClientRects()].map(rect => rect.top)).size, whiteSpace: getComputedStyle(element).whiteSpace, clipped: element.scrollWidth > element.clientWidth };
  })).toEqual({ lines: 1, whiteSpace: 'nowrap', clipped: false });
  const exactExpenses = page.getByRole('button', { name: /Show exact Total Expenses:.*123,456,789/ });
  await exactExpenses.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText('Total Expenses · exact amount', { exact: true })).toBeVisible();
  await page.keyboard.press('Escape');

  // The dashboard-style URL must also work for a non-current month, including reloads.
  await page.goto(`/transactions?month=${previousMonth}&pocket=unassigned`);
  await expect(page.getByRole('heading', { name: /Transactions for.*\(1\)/ })).toBeVisible();
  await expect(page.getByRole('row').filter({ hasText: 'Previous unassigned' })).toContainText('8,100');
  await expect(page.getByRole('region', { name: 'Total Expenses', exact: true })).toContainText('8,100');
  await expect(page.getByRole('row').filter({ hasText: 'Current unassigned' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Next month', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Transactions for.*\(1\)/ })).toBeVisible();
  await expect(currentRow).toBeVisible();

  await page.setViewportSize({ width: 320, height: 740 });
  const mobileRow = page.locator('li').filter({ hasText: 'Current unassigned' });
  await expect(mobileRow).toContainText('Pocket: Unassigned');
  await expect(mobileRow).toContainText('123,456,789');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await exactExpenses.click();
  await expect(page.getByText('Total Expenses · exact amount', { exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await mobileRow.getByRole('button', { name: 'Assign pocket', exact: true }).click();
  await expect(page.getByLabel('Budget Pocket', { exact: true })).toBeVisible();
  await page.getByLabel('Budget Pocket', { exact: true }).click();
  await page.getByRole('option', { name: 'Groceries', exact: true }).click();
  await page.getByRole('button', { name: 'Update Transaction', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByText('No transactions found', { exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Total Expenses', exact: true })).toContainText('0');
  await page.getByRole('button', { name: 'Clear pocket filter', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Transactions for.*\(3\)/ })).toBeVisible();
  await expect(mobileRow).toContainText('Pocket: Groceries');
  await page.reload();
  await expect(mobileRow).toContainText('Pocket: Groceries');
  const corrected = await checked(admin.from('transactions').select('pocket_id,amount,transaction_date').eq('user_id', userId).eq('description', 'Current unassigned').single());
  expect(corrected).toEqual({ pocket_id: pocketId, amount: 123456789, transaction_date: `${month}-12` });

  await page.getByLabel('Pocket', { exact: true }).selectOption(pocketId);
  await expect(page.getByRole('heading', { name: /Transactions for.*\(2\)/ })).toBeVisible();
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(currentRow).toContainText('Groceries');
  // Legacy pocket routes must win over a conflicting unassigned query filter.
  await page.goto(`/transactions/${pocketId}?month=${month}&pocket=unassigned`);
  await expect(page.getByRole('heading', { name: /Transactions for.*\(2\)/ })).toBeVisible();
  await expect(currentRow).toContainText('Groceries');
  await page.goto('/transactions?month=not-a-month');
  await expect(page.getByRole('heading', { name: /Transactions for.*\(3\)/ })).toBeVisible();
});
