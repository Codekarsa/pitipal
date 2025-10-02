import { useState } from "react";
import { useAuth } from "@/components/auth/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Database,
  CheckCircle,
  AlertCircle,
  RefreshCw
} from "lucide-react";

interface MigrationResult {
  templatesCreated: number;
  instancesUpdated: number;
  errors: string[];
}

export function PocketMigrationSection() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);

  const runMigration = async () => {
    if (!user?.id) {
      toast({
        title: "Authentication Required",
        description: "Please log in to run the migration.",
        variant: "destructive",
      });
      return;
    }

    setIsMigrating(true);
    setMigrationResult(null);

    try {
      // Step 1: Fetch all active pockets without templates
      const { data: pockets, error: fetchError } = await supabase
        .from('budget_pockets')
        .select('id, name, budget_amount, color, is_featured, pocket_type, budget_type, cycle_type, month_year, parent_pocket_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .eq('is_template', false)
        .is('parent_pocket_id', null);

      if (fetchError) throw fetchError;

      if (!pockets || pockets.length === 0) {
        toast({
          title: "No Pockets to Migrate",
          description: "All pockets are already using the template system.",
        });
        setIsMigrating(false);
        return;
      }

      // Step 2: Group by pocket name to find unique pockets
      const pocketsByName = new Map<string, typeof pockets>();
      pockets.forEach(pocket => {
        if (!pocketsByName.has(pocket.name)) {
          pocketsByName.set(pocket.name, []);
        }
        pocketsByName.get(pocket.name)!.push(pocket);
      });

      const result: MigrationResult = {
        templatesCreated: 0,
        instancesUpdated: 0,
        errors: [],
      };

      // Step 3: Create templates and update instances
      for (const [pocketName, pocketInstances] of pocketsByName.entries()) {
        try {
          // Use the first instance as the template base
          const base = pocketInstances[0];

          // Create template
          const { data: template, error: templateError } = await supabase
            .from('budget_pockets')
            .insert({
              user_id: user.id,
              name: base.name,
              budget_amount: base.budget_amount,
              color: base.color,
              is_featured: base.is_featured,
              pocket_type: base.pocket_type,
              budget_type: base.budget_type,
              cycle_type: base.cycle_type,
              is_template: true,
              is_active: true,
              month_year: null,
              parent_pocket_id: null,
            })
            .select()
            .single();

          if (templateError) {
            result.errors.push(`Failed to create template for ${pocketName}: ${templateError.message}`);
            continue;
          }

          result.templatesCreated++;

          // Update all instances to link to this template
          for (const instance of pocketInstances) {
            const { error: updateError } = await supabase
              .from('budget_pockets')
              .update({ parent_pocket_id: template.id })
              .eq('id', instance.id);

            if (updateError) {
              result.errors.push(`Failed to link ${pocketName} (${instance.month_year}): ${updateError.message}`);
            } else {
              result.instancesUpdated++;
            }
          }
        } catch (error) {
          result.errors.push(`Error processing ${pocketName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      setMigrationResult(result);

      if (result.errors.length === 0) {
        toast({
          title: "Migration Successful",
          description: `Created ${result.templatesCreated} templates and updated ${result.instancesUpdated} pocket instances.`,
        });
      } else {
        toast({
          title: "Migration Completed with Errors",
          description: `${result.templatesCreated} templates created, ${result.instancesUpdated} instances updated, but ${result.errors.length} errors occurred.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Migration Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          Pocket Template Migration
        </CardTitle>
        <CardDescription>
          One-time migration to convert existing pockets to the template system
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            This migration will create template pockets for each unique pocket name and link existing monthly pockets to their templates.
            This is a one-time operation and only needs to be run once.
          </AlertDescription>
        </Alert>

        {migrationResult && (
          <Alert variant={migrationResult.errors.length > 0 ? "destructive" : "default"}>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-semibold">Migration Results:</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Templates created: {migrationResult.templatesCreated}</li>
                  <li>Instances updated: {migrationResult.instancesUpdated}</li>
                  {migrationResult.errors.length > 0 && (
                    <li className="text-destructive">
                      Errors: {migrationResult.errors.length}
                      <ul className="list-circle list-inside ml-4 mt-1">
                        {migrationResult.errors.map((error, idx) => (
                          <li key={idx}>{error}</li>
                        ))}
                      </ul>
                    </li>
                  )}
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <Button
          onClick={runMigration}
          disabled={isMigrating}
          className="w-full"
        >
          {isMigrating ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Running Migration...
            </>
          ) : (
            <>
              <Database className="h-4 w-4 mr-2" />
              Run Migration
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
