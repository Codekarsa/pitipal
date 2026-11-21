# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/09e802dd-a8fe-4c66-a073-9aae898d2747

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/09e802dd-a8fe-4c66-a073-9aae898d2747) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Supabase (Backend & Database)

## Supabase Setup

This project uses Supabase for backend functionality (authentication, database, etc.).

### Quick Start (Demo Instance)

The project comes pre-configured with a demo Supabase instance. Just run:

```sh
npm run dev
```

The demo instance is safe for testing and development. The credentials are hardcoded in `src/integrations/supabase/client.ts`.

### Using Your Own Supabase Instance (Optional)

If you want to use your own Supabase project:

1. **Create a Supabase project** at [https://supabase.com](https://supabase.com)

2. **Get your credentials** from Project Settings → API:
   - Project URL
   - Anon/Public Key

3. **Update the credentials** in `src/integrations/supabase/client.ts`:
   ```typescript
   const SUPABASE_URL = "your_project_url";
   const SUPABASE_PUBLISHABLE_KEY = "your_anon_key";
   ```

4. **Run the database migrations** located in `supabase/migrations/` to set up the schema

5. **(Optional)** Use environment variables:
   - Copy `.env.example` to `.env`
   - Add your credentials to `.env`
   - Update `client.ts` to use `import.meta.env.VITE_SUPABASE_URL`

**Note:** The Supabase anon/public key is safe to expose in client-side code - it's designed for this purpose and protected by Row Level Security (RLS) policies.

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/09e802dd-a8fe-4c66-a073-9aae898d2747) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

## Currency onboarding and browser tests

Apply `supabase/migrations/20261120000000_require_currency_choice.sql` before deploying
the currency-first UI. It removes the default currency for future profiles without
changing existing preferences. New accounts choose a currency before entering amounts.
The dashboard checklist uses account-wide pocket and transaction records, not the
currently selected month, and disappears when both steps are complete.

Run the app against a migrated **local** Supabase instance, install Chromium with
`npx playwright install chromium`, and run `npm run test:e2e` with these environment
variables supplied securely:

- `E2E_BASE_URL`: the running app's URL.
- `E2E_SUPABASE_URL`: the local Supabase API URL.
- `E2E_SUPABASE_SERVICE_ROLE_KEY`: the local admin key, used only to create and clean up disposable test users.
- `E2E_CHROME_PATH` (optional): an existing Chromium executable instead of Playwright's download.

Tests refuse non-loopback Supabase URLs. They cover required currency selection,
failed profile loading/saving and retry, persistence, live checklist updates,
month navigation, and existing USD users. Never provide production credentials.

## Monthly budgets and transaction workflows

The updated UI requires `supabase/migrations/20261121000000_monthly_budget_planning.sql`.
Before deploying to an existing database, run the read-only
`scripts/audit-monthly-budgets.sql` and review any duplicate lineages or historical
allowances. The migration preserves historical totals as base allowances with zero
known carry; it does not guess a split or merge/delete existing records. Apply only
pending migrations through your normal migration process; do not replay old ones.

Deploy the updated `monthly-rollover` edge function with the migration. Scheduled
calls now require a service-role bearer, not the public anon key. A trusted operator
must securely configure the server-only `app.settings.supabase_service_role_key`
setting used by the rollover cron jobs. Never put it in browser environment variables
or commit credentials. Existing cron jobs are updated by the migration; check their
deployed execution separately. Frontend-only deployment is insufficient.

Monthly allowance is base budget + confirmed carry. Future plans contain base amounts
only until rollover runs for that month. Copying a plan preserves existing destination
overrides. Budget edits default to one month; future scope changes base amounts only,
not metadata or rollover rules. Past monthly budgets are read-only in the editor.

`npm run test:e2e` also covers repeated saves, multi-date bulk entry, monthly planning
and CSV validation/mapping/retries. With the same local credentials plus
`E2E_SUPABASE_DB_URL` (local PostgreSQL URL) and `E2E_SUPABASE_ANON_KEY`, run
`npx tsx --test tests/monthly-budget.test.ts` for the real database/RPC and edge-handler
regressions. All fixtures are disposable; these tests reject non-loopback backends.
Use `npx vite build` for a frontend-only build; `npm run build` also invokes DB sync.
