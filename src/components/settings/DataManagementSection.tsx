import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { 
  Download, Upload, FileText, Database, 
  CheckCircle, AlertCircle, Clock
} from "lucide-react";
import { ImportDialog } from "./ImportDialog";
import { ExportDialog } from "./ExportDialog";
import { generateCSVTemplate, exportDataToCSV } from "@/lib/csv-utils";

export function DataManagementSection() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [importOpen, setImportOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [isGeneratingTemplate, setIsGeneratingTemplate] = useState(false);

  // Fetch data counts
  const { data: dataCounts } = useQuery({
    queryKey: ["data-counts", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const [transactions, pockets, categories, payees, accounts] = await Promise.all([
        supabase.from("transactions").select("id", { count: 'exact' }).eq("user_id", user.id),
        supabase.from("budget_pockets").select("id", { count: 'exact' }).eq("user_id", user.id),
        supabase.from("categories").select("id", { count: 'exact' }).eq("user_id", user.id),
        supabase.from("payees").select("id", { count: 'exact' }).eq("user_id", user.id),
        supabase.from("savings_accounts").select("id", { count: 'exact' }).eq("user_id", user.id),
      ]);

      return {
        transactions: transactions.count || 0,
        pockets: pockets.count || 0,
        categories: categories.count || 0,
        payees: payees.count || 0,
        accounts: accounts.count || 0,
      };
    },
    enabled: !!user?.id,
  });

  const handleDownloadTemplate = async (type: 'transactions' | 'pockets' | 'categories' | 'accounts') => {
    try {
      setIsGeneratingTemplate(true);
      const csv = await generateCSVTemplate(type);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${type}_template.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Template Downloaded",
        description: `${type} template CSV file has been downloaded.`,
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to generate template. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingTemplate(false);
    }
  };

  const dataItems = [
    {
      title: "Transactions",
      description: "Income, expenses, and transfers",
      count: dataCounts?.transactions || 0,
      icon: FileText,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Budget Pockets",
      description: "Budget categories and allocations",
      count: dataCounts?.pockets || 0,
      icon: Database,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      title: "Categories",
      description: "Transaction categories",
      count: dataCounts?.categories || 0,
      icon: Database,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      title: "Accounts",
      description: "Bank and investment accounts",
      count: dataCounts?.accounts || 0,
      icon: Database,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold">Data Management</h2>
        <p className="text-muted-foreground">
          Import, export, and manage your financial data
        </p>
      </div>

      {/* Data Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            Data Overview
          </CardTitle>
          <CardDescription>
            Current data in your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {dataItems.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="flex items-center gap-3 p-4 border rounded-lg">
                  <div className={`p-2 rounded-lg ${item.bgColor}`}>
                    <Icon className={`h-5 w-5 ${item.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                    <Badge variant="secondary" className="mt-1 text-xs">
                      {item.count} items
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Import/Export Actions */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Import Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              Import Data
            </CardTitle>
            <CardDescription>
              Import your financial data from CSV files
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-green-500" />
                CSV format supported
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Data validation included
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Preview before import
              </div>
            </div>
            
            <div className="space-y-2">
              <Button
                onClick={() => setImportOpen(true)}
                className="w-full"
                variant="default"
              >
                <Upload className="h-4 w-4 mr-2" />
                Import Data
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Export Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5 text-primary" />
              Export Data
            </CardTitle>
            <CardDescription>
              Export your data for backup or analysis
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-green-500" />
                CSV format for Excel compatibility
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-green-500" />
                All your data included
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Ready for analysis
              </div>
            </div>
            
            <Button
              onClick={() => setExportOpen(true)}
              className="w-full"
              variant="outline"
            >
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* CSV Templates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            CSV Templates
          </CardTitle>
          <CardDescription>
            Download CSV templates to format your data correctly
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Button
              onClick={() => handleDownloadTemplate('transactions')}
              variant="outline"
              size="sm"
              disabled={isGeneratingTemplate}
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              Transactions
            </Button>
            
            <Button
              onClick={() => handleDownloadTemplate('pockets')}
              variant="outline"
              size="sm"
              disabled={isGeneratingTemplate}
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              Budget Pockets
            </Button>
            
            <Button
              onClick={() => handleDownloadTemplate('categories')}
              variant="outline"
              size="sm"
              disabled={isGeneratingTemplate}
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              Categories
            </Button>
            
            <Button
              onClick={() => handleDownloadTemplate('accounts')}
              variant="outline"
              size="sm"
              disabled={isGeneratingTemplate}
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              Accounts
            </Button>
          </div>
          
          {isGeneratingTemplate && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4 animate-spin" />
                Generating template...
              </div>
              <Progress value={50} className="h-1" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <ImportDialog open={importOpen} onOpenChange={setImportOpen} />
      <ExportDialog open={exportOpen} onOpenChange={setExportOpen} />
    </div>
  );
}