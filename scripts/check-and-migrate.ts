import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://nhqlaikoiyqmwsxqjorn.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ocWxhaWtvaXlxbXdzeHFqb3JuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1MTA3NDUsImV4cCI6MjA3NDA4Njc0NX0.8cr36_MnLrwjGh22-Vu1TQtLbIJfBb0KL9i6DYgKeEg";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  console.log('🔍 Checking database...\n');

  // RLS might be blocking - try to get count
  const { count: totalCount, error: countError } = await supabase
    .from('budget_pockets')
    .select('*', { count: 'exact', head: true });

  console.log(`Total rows in table: ${totalCount}`);
  if (countError) {
    console.error('❌ Error counting rows:', countError.message);
    console.log('\n⚠️  This might be a Row Level Security (RLS) issue.');
    console.log('The anon key cannot read pockets without user authentication.\n');
  }

  // Try with auth - get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    console.log('❌ No authenticated user. RLS is blocking access.');
    console.log('\n💡 Solution: The migration needs to run as an authenticated user.');
    console.log('   Option 1: Use service_role key (has admin access)');
    console.log('   Option 2: Run migration from the app UI while logged in\n');
    return;
  }

  console.log(`✅ Authenticated as: ${user.email}`);

  // Now try to fetch pockets for this user
  const { data: pockets, error } = await supabase
    .from('budget_pockets')
    .select('id, name, is_template, is_active, month_year, parent_pocket_id')
    .eq('user_id', user.id)
    .order('name', { ascending: true });

  if (error) {
    console.error('❌ Error fetching pockets:', error.message);
    return;
  }

  console.log(`\n📊 Found ${pockets?.length || 0} pockets for user ${user.email}\n`);

  const active = pockets?.filter(p => p.is_active) || [];
  const orphaned = active.filter(p => !p.is_template && !p.parent_pocket_id);

  console.log(`Active pockets: ${active.length}`);
  console.log(`Need migration: ${orphaned.length}\n`);

  if (orphaned.length > 0) {
    console.log('⚠️  Pockets that need templates:');
    orphaned.forEach(p => console.log(`   - ${p.name} (${p.month_year})`));
  }
}

main();
