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

test('20 header saves retain choices and refresh the mounted list after every save', async ({ page }) => {
  await signIn(page);
  await page.getByRole('navigation').getByRole('button', { name: 'Transactions', exact: true }).click();
  await page.getByRole('button', { name: 'Add Transaction', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await page.getByLabel('Category', { exact: false }).click();
  await page.getByRole('option', { name: 'Food & Dining', exact: true }).click();
  await page.getByLabel('Budget Pocket', { exact: true }).click();
  await page.getByRole('option', { name: 'Groceries', exact: true }).click();
  await page.getByLabel('Keep adding transactions', { exact: true }).check();
  for (let i = 1; i <= 20; i++) {
    await page.getByLabel('Amount', { exact: false }).fill(String(i * 1000));
    await dialog.getByRole('button', { name: 'Save & add another', exact: true }).click();
    await expect(page.getByLabel('Amount', { exact: false })).toHaveValue('');
    await expect(page.getByLabel('Category', { exact: false })).toContainText('Food & Dining');
    await expect(page.getByLabel('Budget Pocket', { exact: true })).toContainText('Groceries');
    await expect(page.getByLabel('Date', { exact: true })).toHaveValue(today);
    await expect(page.getByRole('heading', { name: new RegExp(`Transactions for.*\\(${i}\\)`), includeHidden: true })).toBeAttached();
  }
  await dialog.getByRole('button', { name: 'Done — 20 saved', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByText('Total Expenses', { exact: true }).locator('..')).toContainText('210,000');
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
  await expect(page.getByText(/expenses has no spending pocket/)).toContainText('600,000');
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
