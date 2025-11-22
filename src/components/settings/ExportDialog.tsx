import { useState } from "react";
import { useAuth } from "@/components/auth/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Download, FileText, CheckCircle,
  Database, Clock, Package
} from "lucide-react";
import { exportDataToCSV } from "@/lib/csv-utils";
import { analytics } from "@/lib/analytics";

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ExportOption {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  selected: boolean;
}

export function ExportDialog({ open, onOpenChange }: ExportDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportOptions, setExportOptions] = useState<ExportOption[]>([
    {
      id: "transactions",
      label: "Transactions",
      description: "All your income, expense, and transfer records",
      icon: FileText,
      selected: true,
    },
    {
      id: "pockets",
      label: "Budget Pockets",
      description: "Budget categories and allocations",
      icon: Database,
      selected: true,
    },
    {
      id: "categories",
      label: "Categories",
      description: "Transaction categories and groups",
      icon: Database,
      selected: false,
    },
    {
      id: "accounts",
      label: "Accounts",
      description: "Bank accounts, credit cards, and investments",
      icon: Database,
      selected: false,
    },
  ]);

  const toggleOption = (id: string) => {
    setExportOptions(prev =>
      prev.map(option =>
        option.id === id ? { ...option, selected: !option.selected } : option
      )
    );
  };

  const handleExport = async () => {
    if (!user) return;

    const selectedOptions = exportOptions.filter(option => option.selected);
    if (selectedOptions.length === 0) {
      toast({
        title: "No Data Selected",
        description: "Please select at least one data type to export.",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);
    setExportProgress(0);

    try {
      const progressIncrement = 100 / selectedOptions.length;

      for (const option of selectedOptions) {
        // Update progress
        setExportProgress(prev => Math.min(prev + progressIncrement * 0.8, 95));
        
        // Export data
        const csvData = await exportDataToCSV(user.id, option.id);
        
        // Create and download file
        const blob = new Blob([csvData], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${option.id}_export_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        // Small delay between downloads
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      setExportProgress(100);

      toast({
        title: "Export Successful",
        description: `Exported ${selectedOptions.length} file(s) successfully.`,
      });

      selectedOptions.forEach(option => {
        analytics.trackExportCompleted(option.id);
      });

      // Close dialog after short delay
      setTimeout(() => {
        onOpenChange(false);
      }, 1000);

    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description: "Failed to export data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setTimeout(() => {
        setIsExporting(false);
        setExportProgress(0);
      }, 1500);
    }
  };

  const selectedCount = exportOptions.filter(option => option.selected).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Data
          </DialogTitle>
          <DialogDescription>
            Select the data you want to export. Each selection will be downloaded as a separate CSV file.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Export Options */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Select Data to Export</CardTitle>
              <CardDescription>
                Choose which types of data you want to include in your export
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {exportOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <div
                    key={option.id}
                    className={`flex items-start gap-2 sm:gap-3 p-3 sm:p-4 border rounded-lg cursor-pointer transition-colors ${
                      option.selected ? "bg-primary/5 border-primary/20" : "hover:bg-muted/50"
                    }`}
                    onClick={() => toggleOption(option.id)}
                  >
                    <Checkbox
                      checked={option.selected}
                      onChange={() => toggleOption(option.id)}
                      className="mt-0.5"
                    />
                    <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0">
                      <div className={`p-1.5 sm:p-2 rounded-lg ${
                        option.selected ? "bg-primary/10" : "bg-muted"
                      }`}>
                        <Icon className={`h-3 w-3 sm:h-4 sm:w-4 ${
                          option.selected ? "text-primary" : "text-muted-foreground"
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-sm sm:text-base">{option.label}</h4>
                          {option.selected && (
                            <Badge variant="secondary" className="text-xs">
                              Selected
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                          {option.description}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Export Settings */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Export Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>CSV format (Excel compatible)</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>UTF-8 encoding</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>All historical data included</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Package className="h-4 w-4 text-blue-500" />
                <span>Separate file for each data type</span>
              </div>
            </CardContent>
          </Card>

          {/* Export Progress */}
          {isExporting && (
            <Card>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 animate-pulse text-primary" />
                    <span className="font-medium">Exporting your data...</span>
                  </div>
                  <Progress value={exportProgress} className="h-2" />
                  <div className="text-sm text-muted-foreground">
                    {exportProgress < 100 ? "Preparing download files..." : "Export complete!"}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {selectedCount > 0 ? (
              `${selectedCount} file${selectedCount > 1 ? 's' : ''} will be downloaded`
            ) : (
              "No data selected"
            )}
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isExporting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleExport}
              disabled={selectedCount === 0 || isExporting}
              className="min-w-[120px]"
            >
              {isExporting ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin border-2 border-current border-t-transparent rounded-full" />
                  Exporting...
                </div>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export ({selectedCount})
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}