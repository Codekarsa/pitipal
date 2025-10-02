import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RolloverRule {
  type: 'reset' | 'carry_over' | 'percentage'
  percentage?: number
  max_carry_over?: number
}

interface BudgetTemplate {
  id: string
  user_id: string
  name: string
  budget_amount: number
  current_amount: number
  auto_renew: boolean
  recurring_rule: RolloverRule | null
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Starting monthly rollover process...')

    // Get current month-year
    const now = new Date()
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1)
    const prevMonthKey = `${previousMonth.getFullYear()}-${String(previousMonth.getMonth() + 1).padStart(2, '0')}`

    console.log(`Processing rollover for month: ${currentMonth}`)

    // Get all pockets with auto_renew enabled (both templates and regular pockets from previous month)
    const { data: templates, error: templatesError } = await supabase
      .from('budget_pockets')
      .select('*')
      .eq('auto_renew', true)
      .eq('is_active', true)
      .or(`is_template.eq.true,month_year.eq.${prevMonthKey}`)

    if (templatesError) {
      console.error('Error fetching templates:', templatesError)
      throw templatesError
    }

    console.log(`Found ${templates?.length || 0} templates to process`)

    let processedCount = 0
    let skippedCount = 0

    for (const pocket of templates || []) {
      try {
        // For templates, check if instance already exists
        // For regular pockets, check if they already rolled over to current month
        let skipPocket = false
        
        if (pocket.is_template) {
          const { data: existingInstance } = await supabase
            .from('budget_pockets')
            .select('id')
            .eq('parent_pocket_id', pocket.id)
            .eq('month_year', currentMonth)
            .eq('is_active', true)
            .single()

          if (existingInstance) {
            console.log(`Instance already exists for template ${pocket.name} in ${currentMonth}`)
            skipPocket = true
          }
        } else {
          // For regular pockets, check if a pocket with same name already exists for current month
          const { data: existingPocket } = await supabase
            .from('budget_pockets')
            .select('id')
            .eq('user_id', pocket.user_id)
            .eq('name', pocket.name)
            .eq('month_year', currentMonth)
            .eq('is_active', true)
            .single()

          if (existingPocket) {
            console.log(`Pocket already exists for ${pocket.name} in ${currentMonth}`)
            skipPocket = true
          }
        }

        if (skipPocket) {
          skippedCount++
          continue
        }

        // Get previous month data for rollover calculations
        const prevInstance = pocket.is_template ? null : pocket

        // Calculate rollover amount
        let rolloverAmount = 0
        const rolloverRule: RolloverRule = pocket.recurring_rule as RolloverRule || { type: 'reset' }

        if (prevInstance && rolloverRule.type !== 'reset') {
          const unusedAmount = prevInstance.budget_amount - prevInstance.current_amount

          if (unusedAmount > 0) {
            switch (rolloverRule.type) {
              case 'carry_over':
                rolloverAmount = rolloverRule.max_carry_over 
                  ? Math.min(unusedAmount, rolloverRule.max_carry_over)
                  : unusedAmount
                break
              case 'percentage':
                rolloverAmount = unusedAmount * ((rolloverRule.percentage || 0) / 100)
                break
            }
          }
        }

        let newInstanceId: string

        if (pocket.is_template) {
          // Use RPC function for template-based pockets
          const { data: rpcResult, error: generateError } = await supabase
            .rpc('generate_monthly_pocket_instance', {
              template_pocket_id: pocket.id,
              target_month: currentMonth
            })

          if (generateError) {
            console.error(`Error generating instance for template ${pocket.id}:`, generateError)
            continue
          }
          newInstanceId = rpcResult
        } else {
          // Create new pocket directly for non-template pockets
          const { data: newPocket, error: insertError } = await supabase
            .from('budget_pockets')
            .insert({
              user_id: pocket.user_id,
              name: pocket.name,
              description: pocket.description,
              budget_amount: pocket.budget_amount + rolloverAmount,
              current_amount: rolloverAmount,
              budget_type: pocket.budget_type,
              cycle_type: pocket.cycle_type,
              color: pocket.color,
              icon: pocket.icon,
              pocket_type: pocket.pocket_type,
              month_year: currentMonth,
              auto_renew: pocket.auto_renew,
              recurring_rule: pocket.recurring_rule,
              cycle_start_date: `${currentMonth}-01`,
              cycle_end_date: new Date(new Date(currentMonth + '-01').getFullYear(), new Date(currentMonth + '-01').getMonth() + 1, 0).toISOString().split('T')[0],
              is_template: false,
              is_active: true
            })
            .select('id')
            .single()

          if (insertError) {
            console.error(`Error creating new pocket for ${pocket.name}:`, insertError)
            continue
          }
          newInstanceId = newPocket.id
        }

        if (rolloverAmount > 0 && pocket.is_template) {
          // Only update if it's a template and we haven't already set the amounts
          const { error: rolloverError } = await supabase
            .from('budget_pockets')
            .update({ 
              budget_amount: pocket.budget_amount + rolloverAmount,
              current_amount: rolloverAmount
            })
            .eq('id', newInstanceId)

          if (rolloverError) {
            console.error(`Error applying rollover for instance ${newInstanceId}:`, rolloverError)
          } else {
            console.log(`Applied rollover of ${rolloverAmount} to ${pocket.name}`)
          }
        }

        console.log(`Successfully created instance for: ${pocket.name}`)
        processedCount++

      } catch (error) {
        console.error(`Error processing pocket ${pocket.id}:`, error)
      }
    }

    const result = {
      success: true,
      month: currentMonth,
      processed: processedCount,
      skipped: skippedCount,
      total: templates?.length || 0
    }

    console.log('Rollover process completed:', result)

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Monthly rollover error:', error)
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        success: false 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})