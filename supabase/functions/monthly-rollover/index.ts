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

    // Get all templates with auto_renew enabled
    const { data: templates, error: templatesError } = await supabase
      .from('budget_pockets')
      .select('*')
      .eq('is_template', true)
      .eq('auto_renew', true)
      .eq('is_active', true)

    if (templatesError) {
      console.error('Error fetching templates:', templatesError)
      throw templatesError
    }

    console.log(`Found ${templates?.length || 0} templates to process`)

    let processedCount = 0
    let skippedCount = 0

    for (const template of templates || []) {
      try {
        // Check if instance already exists for current month
        const { data: existingInstance } = await supabase
          .from('budget_pockets')
          .select('id')
          .eq('parent_pocket_id', template.id)
          .eq('month_year', currentMonth)
          .eq('is_active', true)
          .single()

        if (existingInstance) {
          console.log(`Instance already exists for template ${template.name} in ${currentMonth}`)
          skippedCount++
          continue
        }

        // Get previous month instance for rollover calculations
        const { data: prevInstance } = await supabase
          .from('budget_pockets')
          .select('*')
          .eq('parent_pocket_id', template.id)
          .eq('month_year', prevMonthKey)
          .eq('is_active', true)
          .single()

        // Calculate rollover amount
        let rolloverAmount = 0
        const rolloverRule: RolloverRule = template.recurring_rule as RolloverRule || { type: 'reset' }

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

        // Generate new instance using the existing function
        const { data: newInstanceId, error: generateError } = await supabase
          .rpc('generate_monthly_pocket_instance', {
            template_pocket_id: template.id,
            target_month: currentMonth
          })

        if (generateError) {
          console.error(`Error generating instance for template ${template.id}:`, generateError)
          continue
        }

        // Apply rollover amount if applicable
        if (rolloverAmount > 0) {
          const { error: rolloverError } = await supabase
            .from('budget_pockets')
            .update({ 
              budget_amount: template.budget_amount + rolloverAmount,
              current_amount: rolloverAmount
            })
            .eq('id', newInstanceId)

          if (rolloverError) {
            console.error(`Error applying rollover for instance ${newInstanceId}:`, rolloverError)
          } else {
            console.log(`Applied rollover of ${rolloverAmount} to ${template.name}`)
          }
        }

        console.log(`Successfully created instance for template: ${template.name}`)
        processedCount++

      } catch (error) {
        console.error(`Error processing template ${template.id}:`, error)
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
        error: error.message,
        success: false 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})