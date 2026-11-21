// Disposable local stack only. Run: npx tsx --test tests/monthly-budget.test.ts
// Required: E2E_SUPABASE_DB_URL, E2E_SUPABASE_URL,
// E2E_SUPABASE_SERVICE_ROLE_KEY, E2E_SUPABASE_ANON_KEY.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import pg from 'pg'
import { transpileModule, ModuleKind, ScriptTarget } from 'typescript'

const dbUrl = process.env.E2E_SUPABASE_DB_URL
const apiUrl = process.env.E2E_SUPABASE_URL
const serviceKey = process.env.E2E_SUPABASE_SERVICE_ROLE_KEY
const anonKey = process.env.E2E_SUPABASE_ANON_KEY
if (!dbUrl || !apiUrl || !serviceKey || !anonKey) {
  throw new Error('Set E2E_SUPABASE_DB_URL, E2E_SUPABASE_URL, E2E_SUPABASE_SERVICE_ROLE_KEY and E2E_SUPABASE_ANON_KEY for local budget tests.')
}
for (const value of [dbUrl, apiUrl]) {
  assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(new URL(value).hostname), 'Only the disposable local database/API is allowed')
}
const db = new pg.Pool({ connectionString: dbUrl })
const admin = createClient(apiUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
const tokens = new Map<string, string>()
let user: string = randomUUID(), other: string = randomUUID()
async function rpc(name: string, args: unknown[], uid = user, role = 'authenticated') {
  const c = await db.connect()
  try {
    await c.query('begin')
    await c.query(`select set_config('request.jwt.claims',$1,true)`, [JSON.stringify({ sub: uid, role })])
    await c.query(`set local role ${role === 'service_role' ? 'service_role' : role === 'anon' ? 'anon' : 'authenticated'}`)
    const result = await c.query(`select public.${name}(${args.map((_, i) => '$' + (i + 1)).join(',')}) as value`, args)
    await c.query('commit')
    return result.rows[0].value
  } catch (e) { await c.query('rollback'); throw e } finally { c.release() }
}
async function pocket(month: string | null, rule: object, parent: string | null = null, template = false, base = 1000) {
  return (await db.query(`insert into budget_pockets(user_id,name,budget_amount,is_template,month_year,parent_pocket_id,recurring_rule)
    values($1,'Same display name',$2,$3,$4,$5,$6) returning id`, [user, base, template, month, parent, rule])).rows[0].id
}
async function row(id: string) { return (await db.query('select * from budget_pockets where id=$1', [id])).rows[0] }
async function spend(id: string, amount: number, type = 'expense') {
  return (await db.query(`insert into transactions(user_id,pocket_id,amount,type,category) values($1,$2,$3,$4,'test') returning id`, [user,id,amount,type])).rows[0].id
}
const generate = (id: string, month: string) => rpc('generate_monthly_pocket_instance', [id,month])

test('real DB monthly budget RPC regression suite', async t => {
  // Real local Auth sessions avoid requiring a JWT signing secret or assuming
  // the local stack's signing algorithm. Never print keys/session tokens.
  const fixtureIds: string[] = []
  async function createFixtureUser() {
    const email = `monthly-budget-${randomUUID()}@pitipal.test`
    const password = `Local-test-${randomUUID()}`
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true })
    assert.equal(created.error, null)
    const id = created.data.user!.id
    fixtureIds.push(id)
    const client = createClient(apiUrl!, anonKey!, { auth: { persistSession: false, autoRefreshToken: false } })
    const signed = await client.auth.signInWithPassword({ email, password })
    assert.equal(signed.error, null)
    tokens.set(id, signed.data.session!.access_token)
    return id
  }
  const { current, previous, next, later } = (await db.query(`select to_char(current_date,'YYYY-MM') current,
    to_char(current_date-interval '1 month','YYYY-MM') previous,to_char(current_date+interval '1 month','YYYY-MM') next,
    to_char(current_date+interval '2 month','YYYY-MM') later`)).rows[0]
  try {
    user = await createFixtureUser()
    other = await createFixtureUser()
    await t.test('asymmetric real transactions, refunds, both call orders and repeated concurrency', async () => {
      const root = await pocket(null,{type:'carry_over'},null,true)
      const prior = await pocket(previous,{type:'carry_over'},root)
      await spend(prior,-237); await spend(prior,19,'income')
      assert.equal(Number((await row(prior)).current_amount),218)
      const ids = await Promise.all(Array.from({length:8},(_,i)=>generate(i%2 ? prior : root,current)))
      assert.equal(new Set(ids).size,1)
      const result = await row(ids[0])
      assert.equal(Number(result.base_budget_amount),1000)
      assert.equal(Number(result.carried_over_amount),782)
      assert.equal(Number(result.budget_amount),1782)
      assert.equal(Number(result.current_amount),0)
      await spend(ids[0],91)
      await generate(root,current)
      assert.equal(Number((await row(ids[0])).current_amount),91)
      await rpc('set_monthly_pocket_budget',[ids[0],1250,false])
      await generate(root,current)
      assert.equal(Number((await row(ids[0])).budget_amount),2032)
    })
    await t.test('full/percentage/caps including zero, reset, overspending', async () => {
      for (const [rule,spent,expected] of [
        [{type:'percentage',percentage:25},237,190.75],
        [{type:'percentage',percentage:0},237,0],
        [{type:'carry_over',max_carry_over:0},237,0],
        [{type:'carry_over',max_carry_over:123},237,123],
        [{type:'reset'},237,0], [{type:'carry_over'},1237,0],
      ] as [object,number,number][]) {
        const root = await pocket(previous,rule)
        await spend(root,spent)
        const result = await row(await generate(root,current))
        assert.equal(Number(result.carried_over_amount),expected)
      }
    })
    await t.test('planned override receives actual carry on activation, never future unspent allowance', async () => {
      const root = await pocket(null,{type:'carry_over'},null,true)
      const prior = await pocket(previous,{type:'carry_over'},root)
      const planned = await pocket(current,{type:'carry_over'},root,false,1555)
      await spend(prior,321)
      await generate(root,current)
      assert.equal(Number((await row(planned)).budget_amount),2234)
      const future = await generate(root,next)
      assert.equal(Number((await row(future)).carried_over_amount),0)
      await rpc('set_monthly_pocket_budget',[planned,1777,true])
      assert.equal(Number((await row(future)).base_budget_amount),1777)
      assert.equal(Number((await row(prior)).base_budget_amount),1000)
      assert.equal(Number((await row(await generate(root,later))).base_budget_amount),1777)
      await rpc('set_monthly_pocket_budget',[planned,1888,false])
      assert.equal(Number((await row(future)).base_budget_amount),1777)
    })
    await t.test('planning includes one-off sources, preserves overrides and is idempotent', async () => {
      const source = await pocket(current,{type:'reset'},null,false,432)
      await db.query('update budget_pockets set auto_renew=false where id=$1',[source])
      const before = await rpc('plan_budget_months',[current,[next,later]])
      assert.ok(before > 0)
      assert.equal(await rpc('plan_budget_months',[current,[next,later]]),0)
      const child = (await db.query('select id from budget_pockets where parent_pocket_id=$1 and month_year=$2',[source,next])).rows[0].id
      assert.equal(Number((await row(child)).base_budget_amount),432)
      await rpc('set_monthly_pocket_budget',[child,987,false])
      await rpc('plan_budget_months',[current,[next]])
      assert.equal(Number((await row(child)).base_budget_amount),987)
      await rpc('set_monthly_pocket_budget',[source,111,false])
      const distant = `${Number(current.slice(0,4))+3}-01`
      assert.equal(Number((await row(await generate(source,distant))).base_budget_amount),432)
    })
    await t.test('duplicate history flagged, not deleted or merged; permissions checked', async () => {
      const root = await pocket(null,{type:'reset'},null,true)
      await pocket(current,{type:'reset'},root)
      await pocket(current,{type:'reset'},root)
      await assert.rejects(generate(root,current),/Conflicting monthly instances/)
      assert.equal((await db.query('select count(*) from budget_pockets where parent_pocket_id=$1',[root])).rows[0].count,'2')
      await assert.rejects(rpc('generate_monthly_pocket_instance',[root,current],other),/access denied/)
      await assert.rejects(rpc('set_monthly_pocket_budget',[root,1,false],other),/access denied/)
      await assert.rejects(rpc('generate_monthly_pocket_instance',[root,current],user,'anon'),/permission denied/)
      const serviceRoot = await pocket(null,{type:'reset'},null,true)
      assert.ok(await rpc('generate_monthly_pocket_instance',[serviceRoot,current],other,'service_role'))
      await assert.rejects(generate(serviceRoot,'2026-13'),/Invalid target_month/)
      await assert.rejects(rpc('set_monthly_pocket_budget',[serviceRoot,-1,false]),/nonnegative/)
    })
    await t.test('December to January uses correct predecessor and leap-day-safe month end', async () => {
      const root = await pocket('2024-12',{type:'carry_over'})
      await spend(root,123)
      const january = await row(await generate(root,'2025-01'))
      assert.equal(Number(january.carried_over_amount),877)
      assert.equal(january.cycle_end_date.getDate(),31)
    })
    await t.test('transaction update, reassignment, delete keep derived totals accurate', async () => {
      const a=await pocket(current,{type:'reset'}), b=await pocket(current,{type:'reset'})
      const tx=await spend(a,-127)
      await db.query('update transactions set pocket_id=$1,amount=83 where id=$2',[b,tx])
      assert.equal(Number((await row(a)).current_amount),0)
      assert.equal(Number((await row(b)).current_amount),83)
      await rpc('update_pocket_amount',[b,83])
      assert.equal(Number((await row(b)).current_amount),83)
      await db.query('delete from transactions where id=$1',[tx])
      assert.equal(Number((await row(b)).current_amount),0)
    })
    await t.test('overlapping READ COMMITTED transaction inserts do not undercount cached activity', async () => {
      const root = await pocket(previous,{type:'carry_over'})
      const first = await db.connect(), second = await db.connect()
      let pending: Promise<{ error?: unknown }> | undefined
      try {
        await first.query('begin isolation level read committed')
        await second.query('begin isolation level read committed')
        const pid = (await second.query('select pg_backend_pid() pid')).rows[0].pid
        await first.query(`insert into transactions(user_id,pocket_id,amount,type,category)
          values($1,$2,-127,'expense','test')`,[user,root])
        // Start the second INSERT before committing the first. Verify real lock
        // overlap rather than relying on timing or Promise.all scheduling.
        pending = second.query(`insert into transactions(user_id,pocket_id,amount,type,category)
          values($1,$2,83,'expense','test')`,[user,root]).then(() => ({}),error => ({error}))
        let waiting = false
        const deadline = Date.now() + 5000
        while (Date.now() < deadline) {
          waiting = (await db.query(`select wait_event_type='Lock' waiting from pg_stat_activity where pid=$1`,[pid])).rows[0]?.waiting === true
          if (waiting) break
          await new Promise(resolve => setTimeout(resolve,10))
        }
        assert.ok(waiting,'Second insert must overlap and wait for the first transaction')
        await first.query('commit')
        const outcome = await pending
        assert.equal(outcome.error,undefined)
        await second.query('commit')
        const live = (await db.query(`select sum(abs(amount)) amount from transactions where pocket_id=$1`,[root])).rows[0].amount
        assert.equal(Number(live),210)
        assert.equal(Number((await row(root)).current_amount),210)
        assert.equal(Number((await row(await generate(root,current))).carried_over_amount),790)
      } finally {
        await first.query('rollback')
        if (pending) await pending
        await second.query('rollback')
        first.release(); second.release()
      }
    })
    await t.test('HTTP PostgREST exposes exact named contracts and rejects another owner', async () => {
      const root=await pocket(null,{type:'reset'},null,true)
      const call=(name:string,body:object,uid=user)=>fetch(`${apiUrl}/rest/v1/rpc/${name}`,{
        method:'POST',headers:{apikey:anonKey!,authorization:`Bearer ${tokens.get(uid)}`,'Content-Type':'application/json'},body:JSON.stringify(body),
      })
      const result=await call('generate_monthly_pocket_instance',{template_pocket_id:root,target_month:current})
      assert.equal(result.status,200,await result.clone().text())
      const id=await result.json()
      assert.equal((await call('set_monthly_pocket_budget',{pocket_id:id,base_amount:246,apply_to_future:false})).status,204)
      assert.equal(Number((await row(id)).base_budget_amount),246)
      assert.equal((await call('generate_monthly_pocket_instance',{template_pocket_id:root,target_month:current},other)).status,403)
      // No-op selected months still proves argument names and integer return shape.
      const planned=await call('plan_budget_months',{source_month:current,target_months:[]})
      assert.equal(planned.status,200)
      assert.equal(await planned.json(),0)
    })
    await t.test('edge handler rejects public callers; trusted execution delegates deduplicated lineages to real SQL', async () => {
      const root=await pocket(null,{type:'carry_over'},null,true)
      const future=await pocket(null,{type:'reset'},null,true)
      await db.query('update budget_pockets set cycle_start_date=($1||\'-01\')::date where id=$2',[next,future])
      await assert.rejects(generate(future,current),/starts in/)
      const prior=await pocket(previous,{type:'carry_over'},root)
      await spend(prior,246)
      let handler: (r: Request) => Promise<Response>
      let calls=0
      const chain = { select: () => chain, eq: () => chain,
        or: async () => ({ data:[{id:root,parent_pocket_id:null},{id:prior,parent_pocket_id:root},{id:future,parent_pocket_id:null,is_template:true,cycle_start_date:`${next}-01`}],error:null }) }
      const client = { from: () => chain, rpc: async (_name: string, args: {template_pocket_id:string;target_month:string}) => {
        calls++
        try { return {data:await rpc('generate_monthly_pocket_instance',[args.template_pocket_id,args.target_month],other,'service_role'),error:null} }
        catch(e) { return {data:null,error:{message:String(e)}} }
      } }
      const source=readFileSync('supabase/functions/monthly-rollover/index.ts','utf8').replace(/^import .*\n/,'')
      const js=transpileModule(source,{compilerOptions:{module:ModuleKind.None,target:ScriptTarget.ES2022}}).outputText
      new Function('Deno','createClient',js)({env:{get:(key:string)=>key==='SUPABASE_SERVICE_ROLE_KEY'?'test-service-key':'http://localhost'},serve:(fn:typeof handler)=>{handler=fn}},()=>client)
      for(const bearer of ['', 'Bearer public-anon','Bearer user-jwt']) {
        assert.equal((await handler!(new Request('http://localhost',{method:'POST',headers:{authorization:bearer}}))).status,401)
      }
      assert.equal(calls,0)
      assert.equal((await handler!(new Request('http://localhost',{headers:{authorization:'Bearer test-service-key'}}))).status,405)
      const response=await handler!(new Request('http://localhost',{method:'POST',headers:{authorization:'Bearer test-service-key'}}))
      assert.equal(response.status,200)
      assert.equal(calls,1)
      const result=(await db.query('select * from budget_pockets where parent_pocket_id=$1 and month_year=$2',[root,current])).rows[0]
      assert.equal(Number(result.carried_over_amount),754)
    })
  } finally {
    await db.query('delete from transactions where user_id=any($1::uuid[])',[fixtureIds])
    await db.query('update budget_pockets set parent_pocket_id=null where user_id=any($1::uuid[])',[fixtureIds])
    for (const id of fixtureIds) {
      const deleted = await admin.auth.admin.deleteUser(id)
      assert.equal(deleted.error, null)
    }
    await db.end()
  }
})
