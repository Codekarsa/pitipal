import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, PlayCircle } from "lucide-react";

export function MonthlyRolloverTrigger() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const handleTrigger = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      console.log("Triggering monthly rollover...");
      
      const { data, error } = await supabase.functions.invoke('monthly-rollover', {
        body: { manual: true }
      });

      if (error) throw error;

      console.log("Rollover result:", data);
      setResult(data);

      toast({
        title: "Rollover completed",
        description: `Processed ${data.processed} pockets, skipped ${data.skipped}`,
      });
    } catch (error: any) {
      console.error("Rollover error:", error);
      toast({
        title: "Rollover failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Rollover Trigger</CardTitle>
        <CardDescription>
          Manually trigger the monthly rollover process to create new pocket instances
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={handleTrigger} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <PlayCircle className="mr-2 h-4 w-4" />
              Trigger Rollover
            </>
          )}
        </Button>

        {result && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <h4 className="font-semibold mb-2">Result:</h4>
            <pre className="text-sm overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
