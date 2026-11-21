import { test, expect, type Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';

// Run against a Vite app and migrated LOCAL Supabase only. The browser imports the
// actual exported contract, using its signed-in client and real RLS, not a mock.
const apiUrl = process.env.E2E_SUPABASE_URL;
if (!apiUrl || !process.env.E2E_BASE_URL || !process.env.E2E_SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Set E2E_BASE_URL, E2E_SUPABASE_URL and E2E_SUPABASE_SERVICE_ROLE_KEY');
}
if (!['localhost', '127.0.0.1', '[::1]'].includes(new URL(apiUrl).hostname)) throw new Error('Local Supabase required');
const admin = createClient(apiUrl, process.env.E2E_SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
test.use({ baseURL: process.env.E2E_BASE_URL, viewport: { width: 1280, height: 900 }, launchOptions: { executablePath: process.env.E2E_CHROME_PATH } });
test.setTimeout(60000);
let userId: string;
let otherId: string;
let email: string;
const password = 'Local-csv-password-42';
const headers = 'date,description,amount,type,category,payee,notes,account_type,account_name,pocket';
const csvRow = (description: string, amount = '30000', extra = 'Shop,,savings_account,Main,Food') => `2026-11-15,${description},${amount},expense,Food & Dining,${extra}`;

async function checked<T>(request: PromiseLike<{ data: T; error: unknown }>): Promise<T> {
  const result = await request;
  expect(result.error).toBeNull();
  return result.data;
}

test.beforeEach(async ({ page }) => {
  email = `csv-${randomUUID()}@pitipal.test`;
  userId = (await checked(admin.auth.admin.createUser({ email, password, email_confirm: true }))).user!.id;
  otherId = (await checked(admin.auth.admin.createUser({ email: `other-${randomUUID()}@pitipal.test`, password, email_confirm: true }))).user!.id;
  await checked(admin.from('profiles').update({ currency: 'IDR' }).eq('user_id', userId));
  for (const id of [userId, otherId]) {
    await checked(admin.from('payees').insert({ user_id: id, name: 'Shop' }));
    await checked(admin.from('savings_accounts').insert({ user_id: id, account_name: 'Main', account_type: 'savings', institution_name: 'Local' }));
    await checked(admin.from('budget_pockets').insert([
      { user_id: id, name: 'Food', month_year: '2026-11', is_template: false, budget_amount: 500000 },
      { user_id: id, name: 'Food', month_year: '2026-10', is_template: false, budget_amount: 500000 },
      { user_id: id, name: 'Food', month_year: null, is_template: true, budget_amount: 500000 },
      { user_id: id, name: 'Template only', month_year: '2026-11', is_template: true, budget_amount: 500000 },
    ]));
  }
  await page.goto('/');
  await page.getByRole('button', { name: 'Get Started', exact: true }).click();
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
});

test.afterEach(async () => {
  for (const id of [userId, otherId].filter(Boolean)) {
    await checked(admin.from('transactions').delete().eq('user_id', id));
    for (const template of [false, true]) await checked(admin.from('budget_pockets').delete().eq('user_id', id).eq('is_template', template));
    await checked(admin.auth.admin.deleteUser(id));
  }
});

async function contract(page: Page, text: string, action: 'review' | 'import') {
  return page.evaluate(async ({ text, userId, action }) => {
    const path = '/src/lib/csv-utils.ts';
    const csv = await import(path) as typeof import('../src/lib/csv-utils');
    const data = csv.parseCSV(text);
    if (action === 'review') return csv.reviewTransactionImport(data, userId);
    return csv.importTransactions(data, userId);
  }, { text, userId, action });
}

test('exported importer normalizes magnitudes, resolves owned month instances, skips repeated files and rows', async ({ page }) => {
  await checked(admin.from('transactions').insert({ user_id: userId, transaction_date: '2026-11-15', amount: 100000, type: 'expense', category: 'Food & Dining', description: 'Manual' }));
  const text = `${headers}\n${csvRow('CSV', '-30000')}\n${csvRow('CSV', '30000')}`;
  expect(await contract(page, text, 'review')).toMatchObject({ ready: 1, skipped: 1, failed: 0, expense: 30000, income: 0 });
  expect(await contract(page, text, 'import')).toMatchObject({ success: 1, skipped: 1, failed: 0 });
  expect(await contract(page, text, 'import')).toMatchObject({ success: 0, skipped: 2, failed: 0 });
  const rows = await checked(admin.from('transactions').select('*').eq('user_id', userId));
  expect(rows.reduce((sum, row) => sum + row.amount, 0)).toBe(130000);
  const saved = rows.find(row => row.description === 'CSV')!;
  const pocket = await checked(admin.from('budget_pockets').select('*').eq('id', saved.pocket_id).single());
  expect(pocket).toMatchObject({ user_id: userId, month_year: '2026-11', is_template: false });
  expect((await checked(admin.from('payees').select('user_id').eq('id', saved.payee_id).single())).user_id).toBe(userId);
  expect((await checked(admin.from('savings_accounts').select('user_id').eq('id', saved.savings_account_id).single())).user_id).toBe(userId);
});

test('rejects invalid dates, numbers, types, widths, unmatched and ambiguous links without writes', async ({ page }) => {
  await checked(admin.from('payees').insert({ user_id: userId, name: 'shop' }));
  await checked(admin.from('savings_accounts').insert({ user_id: userId, account_name: 'main', account_type: 'savings', institution_name: 'Local' }));
  await checked(admin.from('budget_pockets').insert({ user_id: userId, name: 'Food', month_year: '2026-11', is_template: false }));
  const valid = csvRow('bad', '10', ',,,,');
  const bad = [valid.replace('2026-11-15', '2026-02-30'), ...['', '10junk', 'NaN', 'Infinity', '1e3', '0', '1.234'].map(amount => csvRow('number', amount, ',,,,')), valid.replace(',expense,', ',transfer,'), `${valid},extra`, csvRow('payee', '10', 'Unknown,,,,'), csvRow('ambiguous payee', '10', 'Shop,,,,'), csvRow('account', '10', ',,savings_account,Missing,'), csvRow('ambiguous account', '10', ',,savings_account,Main,'), csvRow('incomplete account', '10', ',,,Main,'), csvRow('template', '10', ',,,,Template only'), csvRow('ambiguous pocket', '10', ',,,,Food')];
  const result = await contract(page, `${headers}\n${bad.join('\n')}`, 'import');
  expect(result).toMatchObject({ success: 0, failed: bad.length, skipped: 0 });
  expect(result.errors.join('\n')).toContain('Ambiguous payee');
  expect(result.errors.join('\n')).toContain('Ambiguous account');
  expect(result.errors.join('\n')).toContain('Ambiguous pocket');
  expect(result.errors.join('\n')).toContain('Unmatched pocket');
  expect(await checked(admin.from('transactions').select('id').eq('user_id', userId))).toHaveLength(0);
  await expect(contract(page, 'date,amount,account_type,category\n2026-11-15,10,expense,Food', 'import')).rejects.toThrow('Missing required column: type');
});

test('parses multiline escaped CSV and maps credit and investment accounts', async ({ page }) => {
  await checked(admin.from('credit_card_accounts').insert({ user_id: userId, account_name: 'Card', institution_name: 'Local' }));
  await checked(admin.from('investment_accounts').insert({ user_id: userId, account_name: 'Invest', institution_name: 'Local', account_type: 'brokerage' }));
  const text = '\uFEFFDate,Description,Amount,Type,Category,Account Type,Account Name\r\n2026-11-15,"He said ""hello"",\nnext line",-10,income,Salary,credit_card,Card\r\n2026-11-15,Investment,20,income,Salary,investment_account,Invest';
  expect(await contract(page, text, 'review')).toMatchObject({ ready: 2, income: 30, expense: 0 });
  expect(await contract(page, text, 'import')).toMatchObject({ success: 2, failed: 0 });
  const rows = await checked(admin.from('transactions').select('*').eq('user_id', userId));
  expect(rows.find(row => row.credit_card_account_id)?.description).toBe('He said "hello",\nnext line');
  expect(rows.find(row => row.investment_account_id)?.amount).toBe(20);
  await expect(contract(page, 'date,amount,type,category\n"broken', 'import')).rejects.toThrow('Unclosed');
});

test('real UI reviews totals and problems, keeps partial failures visible, and retries safely', async ({ page }) => {
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('tab', { name: 'Data', exact: true }).click();
  await page.getByRole('button', { name: 'Import Data', exact: true }).click();
  const text = `${headers}\n${csvRow('UI', '-30000')}\n${csvRow('UI')}\n${csvRow('Fix me', '20', 'Missing,,,,')}`;
  await page.locator('#csv-upload').setInputFiles({ name: 'review.csv', mimeType: 'text/csv', buffer: Buffer.from(text) });
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('1 ready • 1 invalid • 1 duplicates skipped');
  await expect(dialog).toContainText('Expenses IDR 30,000');
  await expect(dialog).toContainText('Unmatched payee "Missing"');
  await dialog.getByRole('button', { name: 'Import Data', exact: true }).click();
  await expect(dialog).toContainText('Import outcomes: 1 saved • 1 failed • 1 duplicates skipped');
  await expect(dialog.getByRole('button', { name: 'Import Data', exact: true })).toBeDisabled();
  await dialog.getByRole('button', { name: 'Done', exact: true }).click();
  // The already-mounted data-counts query is refreshed without a page reload.
  await expect(page.locator('p').filter({ hasText: /^Transactions$/ }).locator('..')).toContainText('1 items');
  await page.getByRole('button', { name: 'Import Data', exact: true }).click();
  await dialog.getByRole('button').filter({ has: page.locator('svg.lucide-x') }).first().click();
  await page.locator('#csv-upload').setInputFiles({ name: 'fixed.csv', mimeType: 'text/csv', buffer: Buffer.from(text.replace('Missing,,,,', ',,,,')) });
  await expect(dialog).toContainText('1 ready • 0 invalid • 2 duplicates skipped');
  await dialog.getByRole('button', { name: 'Import Data', exact: true }).click();
  await expect(dialog).toContainText('Import outcomes: 1 saved • 0 failed • 2 duplicates skipped');
  expect(await checked(admin.from('transactions').select('id').eq('user_id', userId))).toHaveLength(2);
});

test('database save failures remain row-specific and retry skips successes; lookup errors prevent writes', async ({ page }) => {
  const text = `${headers}\n${csvRow('Save first')}\n${csvRow('Retry second')}`;
  let posts = 0;
  await page.route('**/rest/v1/transactions*', async route => {
    if (route.request().method() === 'POST' && ++posts === 2) {
      await route.fulfill({ status: 503, json: { message: 'Temporary CSV save outage' } });
    } else await route.continue();
  });
  const result = await contract(page, text, 'import');
  expect(result).toMatchObject({ success: 1, failed: 1, skipped: 0 });
  expect(result.errors).toEqual(['Row 3: Temporary CSV save outage']);
  await page.unroute('**/rest/v1/transactions*');
  expect(await contract(page, text, 'import')).toMatchObject({ success: 1, failed: 0, skipped: 1 });
  await page.route('**/rest/v1/payees*', route => route.fulfill({ status: 403, json: { message: 'Lookup denied' } }));
  await expect(contract(page, `${headers}\n${csvRow('Must not save')}`, 'import')).rejects.toThrow('Lookup denied');
  expect(await checked(admin.from('transactions').select('id').eq('user_id', userId))).toHaveLength(2);
});

test('duplicates beyond the default database row cap are still skipped', async ({ page }) => {
  await checked(admin.from('transactions').insert(Array.from({ length: 1001 }, (_, index) => ({
    user_id: userId, transaction_date: '2026-11-15', amount: 10, type: 'expense', category: 'Food', description: `Earlier ${index}`,
  }))));
  await checked(admin.from('transactions').insert({
    id: 'ffffffff-ffff-4fff-8fff-ffffffffffff', user_id: userId, transaction_date: '2026-11-15', amount: 10, type: 'expense', category: 'Food', description: 'Last duplicate',
  }));
  expect(await contract(page, 'date,description,amount,type,category\n2026-11-15,Last duplicate,10,expense,Food', 'import')).toMatchObject({ success: 0, skipped: 1, failed: 0 });
});
