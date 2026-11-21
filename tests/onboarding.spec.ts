import { test, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

// Use a running app and migrated local Supabase. Never run admin fixtures against production.
// Required: E2E_BASE_URL, E2E_SUPABASE_URL, E2E_SUPABASE_SERVICE_ROLE_KEY.
// Optional: E2E_CHROME_PATH for an existing Chromium installation.
const apiUrl = process.env.E2E_SUPABASE_URL;
if (!process.env.E2E_BASE_URL || !apiUrl || !process.env.E2E_SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Set E2E_BASE_URL, E2E_SUPABASE_URL and E2E_SUPABASE_SERVICE_ROLE_KEY for local E2E tests.");
}
if (!["localhost", "127.0.0.1", "[::1]"].includes(new URL(apiUrl).hostname)) {
  throw new Error("Onboarding E2E fixtures require local Supabase.");
}
const admin = createClient(apiUrl, process.env.E2E_SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

test.use({
  baseURL: process.env.E2E_BASE_URL,
  viewport: { width: 390, height: 844 },
  launchOptions: { executablePath: process.env.E2E_CHROME_PATH },
});
test.setTimeout(60000);

let userId: string;
let email: string;
const password = "Local-test-password-42";

test.beforeEach(async () => {
  email = `onboarding-${randomUUID()}@pitipal.test`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  expect(error).toBeNull();
  userId = data.user!.id;
});

test.afterEach(async () => {
  if (!userId) return;
  for (const isTemplate of [false, true]) {
    const { error } = await admin.from("budget_pockets").delete().eq("user_id", userId).eq("is_template", isTemplate);
    expect(error).toBeNull();
  }
  const { error } = await admin.auth.admin.deleteUser(userId);
  expect(error).toBeNull();
});

async function signIn(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Get Started", exact: true }).click();
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
}

test("currency is required, persisted, and checklist follows real saves across months", async ({ page }) => {
  const initial = await admin.from("profiles").select("currency").eq("user_id", userId).single();
  expect(initial.error).toBeNull();
  expect(initial.data!.currency).toBeNull();
  await page.route("**/rest/v1/profiles*", route => route.fulfill({ status: 503, json: { message: "Temporary test outage" } }));
  await signIn(page);
  await expect(page.getByRole("heading", { name: "We couldn't load your preferences" })).toBeVisible({ timeout: 15000 });
  await expect(page.getByLabel("Your currency", { exact: true })).toHaveCount(0);
  await page.unroute("**/rest/v1/profiles*");
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.getByLabel("Your currency", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue to my dashboard" })).toBeDisabled();
  await page.goto("/transactions");
  await page.getByLabel("Your currency", { exact: true }).click();
  await page.getByRole("option", { name: "IDR · Indonesian Rupiah", exact: true }).click();
  await expect(page.getByText("Example amount:")).toContainText("IDR 1,500,000");

  // A failed save must not advance onboarding or silently replace the selection.
  await page.route("**/rest/v1/profiles*", async route => {
    if (route.request().method() === "POST") {
      await route.fulfill({ status: 503, json: { message: "Temporary test outage" } });
    } else await route.continue();
  });
  await page.getByRole("button", { name: "Continue to my dashboard" }).click();
  await expect(page.getByRole("alert")).toContainText("couldn't save your currency");
  await expect(page.getByLabel("Your currency", { exact: true })).toContainText("IDR");
  await page.unroute("**/rest/v1/profiles*");
  await page.getByRole("button", { name: "Continue to my dashboard" }).click();
  await expect(page.getByText("1 of 3 steps complete", { exact: false })).toBeVisible();
  const saved = await admin.from("profiles").select("currency").eq("user_id", userId).single();
  expect(saved.data!.currency).toBe("IDR");
  const checklist = page.locator("main").getByText("Let's set up your budget", { exact: true });
  const positions = await Promise.all([checklist.boundingBox(), page.getByRole("heading", { name: "Income", exact: true }).boundingBox()]);
  expect(positions[0]!.y).toBeLessThan(positions[1]!.y);
  await page.reload();
  await expect(page.getByRole("button", { name: "Create my first pocket", exact: true })).toBeVisible();
  await expect(page.getByLabel("Your currency", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Create my first pocket", exact: true }).click();
  await page.getByLabel("Pocket Name", { exact: false }).fill("Groceries");
  await page.getByLabel("Monthly Budget Amount", { exact: true }).fill("3000000");
  await page.getByRole("button", { name: "Create Pocket", exact: true }).last().click();
  await expect(page.getByText("2 of 3 steps complete", { exact: false })).toBeVisible();

  // Viewing another month must not restart the checklist.
  await page.locator("main button").filter({ has: page.locator("svg.lucide-chevron-right") }).click();
  await expect(page.getByText("2 of 3 steps complete", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Add my first transaction", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  // The global header entry point must update the same checklist too.
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByRole("button", { name: "Add Transaction", exact: true }).click();
  await page.getByLabel("Amount", { exact: false }).fill("250000");
  await page.getByLabel("Category", { exact: false }).click();
  await page.getByRole("option", { name: "Food & Dining", exact: true }).click();
  await page.getByRole("button", { name: "Add Transaction", exact: true }).last().click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(checklist).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
  await page.waitForLoadState("networkidle");
  await expect(checklist).toHaveCount(0);
});

test("saved USD users skip currency setup and historical activity completes setup", async ({ page }) => {
  const profile = await admin.from("profiles").update({ currency: "USD" }).eq("user_id", userId);
  expect(profile.error).toBeNull();
  const pocket = await admin.from("budget_pockets").insert({
    user_id: userId, name: "Prior month groceries", budget_amount: 600,
    month_year: "2020-01", is_template: false, is_active: true, pocket_type: "expense",
  }).select("id").single();
  expect(pocket.error).toBeNull();
  const transaction = await admin.from("transactions").insert({
    user_id: userId, amount: 20, type: "expense", category: "Groceries", transaction_date: "2020-01-15", pocket_id: pocket.data!.id,
  });
  expect(transaction.error).toBeNull();
  await signIn(page);
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
  await page.waitForLoadState("networkidle");
  await expect(page.getByLabel("Your currency", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Let's set up your budget", { exact: true })).toHaveCount(0);
  const result = await admin.from("profiles").select("currency").eq("user_id", userId).single();
  expect(result.data!.currency).toBe("USD");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Quick Stats", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Setup Progress", exact: true })).toHaveCount(0);
});
