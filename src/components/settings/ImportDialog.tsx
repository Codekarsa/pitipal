import { useState, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/utils";
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
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Upload, FileText, CheckCircle, AlertCircle,
  X, Eye, Database, Download
} from "lucide-react";
import { parseCSV, validateCSVData, generateCSVTemplate, importTransactions, importBudgetPockets, reviewTransactionImport, type TransactionImportReview } from "@/lib/csv-utils";
import { analytics } from "@/lib/analytics";

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ParsedData {
  headers: string[];
  rows: string[][];
  type: string;
  isValid: boolean;
  errors: string[];
}

export function ImportDialog({ open, onOpenChange }: ImportDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileVersion = useRef(0);
  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    enabled: open && !!user,
    queryFn: async () => {
      const result = await supabase.from('profiles').select('*').eq('user_id', user!.id).single();
      if (result.error) throw result.error;
      return result.data;
    },
  });
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [importType, setImportType] = useState<string>("transactions");
  const [review, setReview] = useState<TransactionImportReview | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [outcome, setOutcome] = useState<{ success: number; failed: number; skipped?: number; errors: string[] } | null>(null);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast({
        title: "Invalid File Type",
        description: "Please select a CSV file.",
        variant: "destructive",
      });
      return;
    }

    const version = ++fileVersion.current;
    setSelectedFile(file);
    setParsedData(null);
    setReview(null);
    setOutcome(null);
    setIsReviewing(true);
    
    // Parse CSV file
    const reader = new FileReader();
    reader.onload = async (e) => {
      const csvText = e.target?.result as string;
      try {
        const data = parseCSV(csvText);
        const validation = validateCSVData(data, importType);
        const transactionReview = validation.isValid && importType === 'transactions' && user
          ? await reviewTransactionImport(data, user.id) : null;
        if (version !== fileVersion.current) return;
        setReview(transactionReview);
        
        setParsedData({
          headers: data[0] || [],
          rows: data.slice(1),
          type: importType,
          isValid: validation.isValid,
          errors: validation.errors,
        });
      } catch (error) {
        if (version !== fileVersion.current) return;
        setParsedData({ headers: [], rows: [], type: importType, isValid: false, errors: [error instanceof Error ? error.message : 'Unable to review CSV'] });
        toast({
          title: "Parse Error",
          description: "Failed to parse CSV file. Please check the format.",
          variant: "destructive",
        });
      } finally {
        if (version === fileVersion.current) setIsReviewing(false);
      }
    };
    reader.onerror = () => {
      if (version !== fileVersion.current) return;
      setIsReviewing(false);
      setParsedData({ headers: [], rows: [], type: importType, isValid: false, errors: ['Unable to read file; choose it again'] });
    };
    reader.readAsText(file);
  }, [importType, toast, user]);

  const handleImport = async () => {
    if (!parsedData || !selectedFile || !user || isUploading || isReviewing || outcome) return;

    setIsUploading(true);
    setUploadProgress(10);

    try {
      let result: { success: number; failed: number; skipped?: number; errors: string[] };

      const csvData = [parsedData.headers, ...parsedData.rows];

      if (parsedData.type === "transactions") {
        result = await importTransactions(csvData, user.id);
      } else if (parsedData.type === "pockets") {
        result = await importBudgetPockets(csvData, user.id);
      } else {
        result = { success: 0, failed: 0, errors: ['Unknown import type'] };
      }

      setUploadProgress(100);
      setOutcome(result);
      if (result.success > 0) await queryClient.invalidateQueries();

      if (result.failed > 0) {
        toast({
          title: "Import Completed with Errors",
          description: `Imported ${result.success} ${importType}. ${result.failed} failed.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Import Successful",
          description: `Imported ${result.success} ${importType} successfully.`,
        });
        analytics.trackImportCompleted(importType, result.success);
      }

    } catch (error) {
      setOutcome({ success: 0, failed: parsedData.rows.length, errors: [error instanceof Error ? error.message : 'Import failed; re-upload to review before retrying'] });
      toast({
        title: "Import Failed",
        description: "Failed to import data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const resetUpload = () => {
    fileVersion.current++;
    setSelectedFile(null);
    setParsedData(null);
    setUploadProgress(0);
    setReview(null);
    setOutcome(null);
    setIsReviewing(false);
  };

  const handleDownloadSample = async () => {
    try {
      const templateType = importType === "pockets" ? "pockets" : "transactions";
      const csvContent = await generateCSVTemplate(templateType);
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${templateType}_sample.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to generate sample CSV.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={value => { if (!isUploading) onOpenChange(value); }}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl lg:max-w-4xl max-h-[85vh] sm:max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Data
          </DialogTitle>
          <DialogDescription>
            Import your financial data from CSV files. Select the data type and upload your file.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs value={importType} onValueChange={value => { if (!isUploading) { resetUpload(); setImportType(value); } }} className="space-y-4">
            {/* Import Type Selection */}
            <TabsList className="grid w-full grid-cols-2 gap-1">
              <TabsTrigger value="transactions" className="text-xs sm:text-sm px-2">
                Transactions
              </TabsTrigger>
              <TabsTrigger value="pockets" className="text-xs sm:text-sm px-2">
                Budget Pockets
              </TabsTrigger>
            </TabsList>

            {/* Content for each import type */}
            <TabsContent value={importType} className="space-y-4 overflow-auto max-h-[50vh]">
              {!selectedFile ? (
                <Card>
                  <CardHeader className="text-center pb-2">
                    <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                      <Upload className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle>Upload {importType} CSV File</CardTitle>
                    <CardDescription>
                      Select a CSV file containing your {importType} data
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                      <input
                        type="file"
                        accept=".csv"
                        onChange={handleFileSelect}
                        className="hidden"
                        id="csv-upload"
                      />
                      <label
                        htmlFor="csv-upload"
                        className="cursor-pointer inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2 rounded-md text-sm font-medium transition-colors"
                      >
                        <FileText className="h-4 w-4" />
                        Choose CSV File
                      </label>
                      <p className="text-sm text-muted-foreground mt-2">
                        Select a UTF-8 CSV file to review before saving
                      </p>
                    </div>

                    <div className="mt-4 space-y-2">
                      <h4 className="font-medium text-sm">Requirements:</h4>
                      <div className="text-sm text-muted-foreground space-y-1">
                        {importType === "transactions" && (
                          <>
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-3 w-3 text-green-500" />
                              Required columns: date, amount, type, category
                            </div>
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-3 w-3 text-green-500" />
                              Date format: YYYY-MM-DD
                            </div>
                            <p>Amounts are positive magnitudes (negative CSV amounts are normalized). Optional payee, pocket, account_type and account_name must match your records. Pockets must belong to the transaction month, not templates.</p>
                          </>
                        )}
                        {importType === "pockets" && (
                          <>
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-3 w-3 text-green-500" />
                              Required columns: name, budget_amount, pocket_type
                            </div>
                          </>
                        )}
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-3 w-3 text-green-500" />
                          UTF-8 encoding recommended
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDownloadSample}
                        className="w-full"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download Sample CSV
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {/* File Info */}
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">File Preview</CardTitle>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={resetUpload}
                          disabled={isUploading}
                          aria-label="Choose another CSV file"
                          className="h-8 w-8 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      {isReviewing && <p role="status">Reviewing rows, links and duplicates...</p>}
                      {review && !outcome && (
                        <div className="space-y-2 text-sm" aria-label="Import review">
                          <p>{review.ready} ready • {review.failed} invalid • {review.skipped} duplicates skipped</p>
                          <p>Ready totals: Income {formatCurrency(review.income, profile?.currency || 'USD')} • Expenses {formatCurrency(review.expense, profile?.currency || 'USD')} • Net {formatCurrency(review.income - review.expense, profile?.currency || 'USD')}</p>
                          <p>Only ready rows will be saved. Identical date, amount, type, category, description, notes and links are treated as duplicates, including existing transactions.</p>
                          <ul className="max-h-40 overflow-auto space-y-1">
                            {review.rows.map(row => <li key={row.row} className={row.status === 'invalid' ? 'text-destructive' : ''}>Row {row.row}: {row.status} — {row.message}</li>)}
                          </ul>
                        </div>
                      )}
                      {outcome && (
                        <div role="status" className="text-sm space-y-2">
                          <p>Import outcomes: {outcome.success} saved • {outcome.failed} failed • {outcome.skipped || 0} duplicates skipped</p>
                          <ul className="max-h-40 overflow-auto">{outcome.errors.map((error, index) => <li key={index} className="text-destructive">{error}</li>)}</ul>
                          <p>Use the X above to choose a corrected file and review again. Already saved rows will be skipped on retry.</p>
                        </div>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-500" />
                        <span className="font-medium">{selectedFile.name}</span>
                        <Badge variant={parsedData?.isValid && !review?.failed ? "default" : "destructive"}>
                          {isReviewing ? 'Reviewing' : review?.failed ? 'Needs attention' : parsedData?.isValid ? 'Reviewed' : 'Invalid'}
                        </Badge>
                      </div>

                      {parsedData && (
                        <>
                          <div className="text-sm text-muted-foreground">
                            {parsedData.rows.length} rows • {parsedData.headers.length} columns
                          </div>

                          {/* Validation Errors */}
                          {!parsedData.isValid && (
                            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                              <div className="flex items-center gap-2 mb-2">
                                <AlertCircle className="h-4 w-4 text-destructive" />
                                <span className="font-medium text-destructive">Validation Errors</span>
                              </div>
                              <ul className="text-sm space-y-1">
                                {parsedData.errors.map((error, index) => (
                                  <li key={index} className="text-destructive">• {error}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Data Preview */}
                          <div className="border rounded-lg overflow-hidden">
                            <div className="bg-muted p-2 border-b">
                              <div className="flex items-center gap-2">
                                <Eye className="h-4 w-4" />
                                <span className="font-medium text-sm">Data Preview</span>
                              </div>
                            </div>
                            <div className="overflow-auto max-h-40">
                              <table className="w-full text-xs sm:text-sm min-w-[500px]">
                                <thead className="bg-muted/50">
                                  <tr>
                                    {parsedData.headers.map((header, index) => (
                                      <th key={index} className="p-1 sm:p-2 text-left border-r text-xs">
                                        <span className="truncate block max-w-[100px]" title={header}>
                                          {header}
                                        </span>
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {parsedData.rows.slice(0, 5).map((row, rowIndex) => (
                                    <tr key={rowIndex} className="border-b">
                                      {row.map((cell, cellIndex) => (
                                        <td key={cellIndex} className="p-1 sm:p-2 border-r">
                                          <span className="truncate block max-w-[100px]" title={cell}>
                                            {cell}
                                          </span>
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            {parsedData.rows.length > 5 && (
                              <div className="p-2 bg-muted/30 text-center text-sm text-muted-foreground">
                                ... and {parsedData.rows.length - 5} more rows
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>

                  {/* Upload Progress */}
                  {isUploading && (
                    <Card>
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span>Importing data...</span>
                            <span>{uploadProgress}%</span>
                          </div>
                          <Progress value={uploadProgress} className="h-2" />
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" disabled={isUploading} onClick={() => onOpenChange(false)}>
            {outcome ? 'Done' : 'Cancel'}
          </Button>
          <Button
            onClick={handleImport}
            disabled={!parsedData?.isValid || isUploading || isReviewing || !!outcome || (importType === 'transactions' && !review?.ready)}
            className="min-w-[100px]"
          >
            {isUploading ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin border-2 border-current border-t-transparent rounded-full" />
                Importing...
              </div>
            ) : (
              <>
                <Database className="h-4 w-4 mr-2" />
                Import Data
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
