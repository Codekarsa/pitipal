/**
 * db-sync: check that all Supabase migrations and the seed are applied,
 * and apply anything missing. Runs automatically before every build
 * (prebuild / prebuild:dev) and manually via `npm run db:sync`.
 *
 * Requires SUPABASE_DB_URL (direct Postgres connection string) — DDL cannot
 * run through the anon-key REST API. Without it the check is skipped with a
 * warning so environments that build without database access (e.g. Lovable)
 * keep working.
 *
 * Applied migrations are tracked in supabase_migrations.schema_migrations —
 * the same table the Supabase CLI uses, so this stays compatible with
 * `supabase db push`. Seeds are tracked by content hash in
 * supabase_migrations.seed_history and re-run when supabase/seed.sql changes.
 *
 * First run against a database whose migration history was applied outside
 * this script (e.g. by Lovable) needs a one-time baseline so historical
 * migrations are marked applied without re-running:
 *   npm run db:sync -- --baseline <last-applied-version>
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const migrationsDir = path.join(root, 'supabase', 'migrations');
const seedFile = path.join(root, 'supabase', 'seed.sql');

// Minimal .env loader (no dotenv dependency); never overrides real env vars.
const envFile = path.join(root, '.env');
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
}

const dbUrl = process.env.SUPABASE_DB_URL;
if (!dbUrl) {
  console.warn(
    '⚠️  SUPABASE_DB_URL is not set — skipping migration/seed check.\n' +
    '   Set it to your Supabase Postgres connection string to enable db-sync on build.'
  );
  process.exit(0);
}

const baselineArg = (() => {
  const argv = process.argv.slice(2);
  const eq = argv.find((a) => a.startsWith('--baseline='));
  if (eq) return eq.slice('--baseline='.length);
  const i = argv.indexOf('--baseline');
  return i >= 0 ? argv[i + 1] : undefined;
})();

const isLocal = /localhost|127\.0\.0\.1/.test(dbUrl);
const client = new Client({
  connectionString: dbUrl,
  ssl: isLocal ? undefined : { rejectUnauthorized: false },
});

async function main() {
  await client.connect();

  await client.query('CREATE SCHEMA IF NOT EXISTS supabase_migrations');
  await client.query(`
    CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (
      version text PRIMARY KEY,
      statements text[],
      name text
    )`);
  await client.query(`
    CREATE TABLE IF NOT EXISTS supabase_migrations.seed_history (
      path text PRIMARY KEY,
      sha256 text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    )`);

  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  const versionOf = (f: string) => f.split('_')[0];

  const appliedRes = await client.query(
    'SELECT version FROM supabase_migrations.schema_migrations'
  );
  const applied = new Set(appliedRes.rows.map((r) => r.version));

  if (baselineArg) {
    const toBaseline = files.filter(
      (f) => versionOf(f) <= baselineArg && !applied.has(versionOf(f))
    );
    for (const f of toBaseline) {
      await client.query(
        'INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [versionOf(f), f]
      );
      applied.add(versionOf(f));
    }
    console.log(`📌 Baselined ${toBaseline.length} migration(s) up to ${baselineArg}`);
  }

  const pending = files.filter((f) => !applied.has(versionOf(f)));

  // Safety: an untracked but non-empty database means its history was applied
  // outside this script. Re-running every migration would fail (or worse,
  // partially apply). Require an explicit baseline instead of guessing.
  if (applied.size === 0 && pending.length === files.length) {
    const { rows } = await client.query(
      `SELECT count(*)::int AS n FROM pg_tables WHERE schemaname = 'public'`
    );
    if (rows[0].n > 0) {
      console.error(
        '❌ This database has tables but no tracked migrations.\n' +
        '   Its history was applied outside db-sync (e.g. by Lovable/Supabase).\n' +
        '   Mark already-applied migrations once with:\n' +
        '     npm run db:sync -- --baseline <version>\n' +
        '   using the version of the NEWEST migration already applied in this\n' +
        '   database (check supabase/migrations/ against your Supabase dashboard).\n' +
        '   Migrations after that version will then be applied normally.'
      );
      process.exit(1);
    }
  }

  if (pending.length === 0) {
    console.log(`✅ Migrations: all ${files.length} applied`);
  } else {
    console.log(`🚀 Applying ${pending.length} pending migration(s)...`);
    for (const f of pending) {
      const sql = readFileSync(path.join(migrationsDir, f), 'utf8');
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query(
          'INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ($1, $2)',
          [versionOf(f), f]
        );
        await client.query('COMMIT');
        console.log(`   ✅ ${f}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`   ❌ ${f}\n      ${(err as Error).message}`);
        process.exit(1);
      }
    }
  }

  if (existsSync(seedFile)) {
    const sql = readFileSync(seedFile, 'utf8');
    const sha = createHash('sha256').update(sql).digest('hex');
    const { rows } = await client.query(
      'SELECT sha256 FROM supabase_migrations.seed_history WHERE path = $1',
      ['supabase/seed.sql']
    );
    if (rows[0]?.sha256 === sha) {
      console.log('✅ Seed: up to date');
    } else {
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query(
          `INSERT INTO supabase_migrations.seed_history (path, sha256, applied_at)
           VALUES ($1, $2, now())
           ON CONFLICT (path) DO UPDATE SET sha256 = EXCLUDED.sha256, applied_at = now()`,
          ['supabase/seed.sql', sha]
        );
        await client.query('COMMIT');
        console.log('🌱 Seed: applied supabase/seed.sql');
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`❌ Seed failed: ${(err as Error).message}`);
        process.exit(1);
      }
    }
  } else {
    console.log('ℹ️  No supabase/seed.sql — nothing to seed');
  }
}

main()
  .then(() => client.end())
  .catch((err) => {
    console.error(`❌ db-sync failed: ${err.message}`);
    return client.end().finally(() => process.exit(1));
  });
