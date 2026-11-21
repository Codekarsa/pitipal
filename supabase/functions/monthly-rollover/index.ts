import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'

// The cron caller must use the service-role bearer, never the public anon key.
Deno.serve(async (req) => {
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!serviceKey || req.headers.get('authorization') !== `Bearer ${serviceKey}`) {
    return Response.json({ error: 'Trusted service-role authorization required' }, { status: 401 })
  }
  if (req.method !== 'POST') return Response.json({ error: 'POST required' }, { status: 405 })
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', serviceKey)
    const now = new Date()
    const month = now.toISOString().slice(0, 7)
    const previous = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)).toISOString().slice(0, 7)
    const { data: pockets, error } = await supabase.from('budget_pockets')
      .select('id,parent_pocket_id,is_template,cycle_start_date')
      .eq('auto_renew', true).eq('is_active', true)
      .or(`is_template.eq.true,month_year.eq.${previous}`)
    if (error) throw error
    // Templates and their prior instances are a single lineage. Standalone roots
    // use their UUID as lineage; equal display names never imply identity.
    const lineages = new Set((pockets ?? [])
      .filter(p => !p.is_template || !p.cycle_start_date || p.cycle_start_date.slice(0, 7) <= month)
      .map(p => p.parent_pocket_id ?? p.id))
    const failures: { lineage_id: string; error: string }[] = []
    let processed = 0
    for (const lineage of lineages) {
      const { error: rpcError } = await supabase.rpc('generate_monthly_pocket_instance', {
        template_pocket_id: lineage, target_month: month,
      })
      if (rpcError) failures.push({ lineage_id: lineage, error: rpcError.message })
      else processed++
    }
    return Response.json({ success: failures.length === 0, month, processed, failures }, {
      status: failures.length ? 409 : 200,
    })
  } catch (error) {
    return Response.json({ success: false, error: error instanceof Error ? error.message : 'Rollover failed' }, { status: 500 })
  }
})
