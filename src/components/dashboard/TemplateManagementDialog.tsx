import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Play, Trash2, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/useAuth";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";

interface TemplateManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface BudgetTemplate {
  id: string;
  name: string;
  description: string | null;
  budget_amount: number;
  budget_type: string;
  color: string;
  auto_renew: boolean;
  recurring_rule: any;
}

export function TemplateManagementDialog({ open, onOpenChange }: TemplateManagementDialogProps) {
  const [templates, setTemplates] = useState<BudgetTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (open && user) {
      fetchTemplates();
    }
  }, [open, user]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('budget_pockets')
        .select('*')
        .eq('user_id', user?.id)
        .eq('is_template', true)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading templates",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateInstance = async (templateId: string) => {
    try {
      setActionLoading(templateId);
      const currentMonth = format(new Date(), "yyyy-MM");
      
      // Call the database function to generate instance
      const { data, error } = await supabase.rpc('generate_monthly_pocket_instance', {
        template_pocket_id: templateId,
        target_month: currentMonth
      });

      if (error) throw error;

      toast({
        title: "Pocket instance created",
        description: "Monthly pocket has been generated from template",
      });
      
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error creating instance",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const deleteTemplate = async (templateId: string) => {
    try {
      setActionLoading(templateId);
      
      const { error } = await supabase
        .from('budget_pockets')
        .update({ is_active: false })
        .eq('id', templateId)
        .eq('user_id', user?.id);

      if (error) throw error;

      setTemplates(templates.filter(t => t.id !== templateId));
      
      toast({
        title: "Template deleted",
        description: "Template has been removed successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error deleting template",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-gradient-card border-0 shadow-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Manage Pocket Templates
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : templates.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Templates Yet</h3>
                <p className="text-muted-foreground text-center">
                  Create pocket templates to automatically generate monthly budget pockets.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {templates.map((template) => (
                <Card key={template.id} className="bg-gradient-card border-0">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div
                            className="w-4 h-4 rounded-full border-2 border-white/20"
                            style={{ backgroundColor: template.color }}
                          />
                          <h4 className="font-semibold">{template.name}</h4>
                          <Badge variant="secondary" className="text-xs">
                            {template.budget_type.replace('_', ' ')}
                          </Badge>
                          {template.auto_renew && (
                            <Badge variant="outline" className="text-xs">
                              Auto-renew
                            </Badge>
                          )}
                        </div>
                        
                        <div className="text-sm text-muted-foreground">
                          Monthly Budget: {formatCurrency(template.budget_amount, 'USD')}
                        </div>
                        
                        {template.description && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {template.description}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => generateInstance(template.id)}
                          disabled={actionLoading === template.id}
                        >
                          <Play className="h-3 w-3 mr-1" />
                          {actionLoading === template.id ? "Creating..." : "Generate"}
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteTemplate(template.id)}
                          disabled={actionLoading === template.id}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}