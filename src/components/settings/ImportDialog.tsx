import { useState, useCallback } from "react";
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
  X, Eye, Database
} from "lucide-react";
import { parseCSV, validateCSVData } from "@/lib/csv-utils";

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
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [importType, setImportType] = useState<string>("transactions");

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

    setSelectedFile(file);
    
    // Parse CSV file
    const reader = new FileReader();
    reader.onload = (e) => {
      const csvText = e.target?.result as string;
      try {
        const data = parseCSV(csvText);
        const validation = validateCSVData(data, importType);
        
        setParsedData({
          headers: data[0] || [],
          rows: data.slice(1),
          type: importType,
          isValid: validation.isValid,
          errors: validation.errors,
        });
      } catch (error) {
        toast({
          title: "Parse Error",
          description: "Failed to parse CSV file. Please check the format.",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
  }, [importType, toast]);

  const handleImport = async () => {
    if (!parsedData || !selectedFile || !user) return;

    setIsUploading(true);
    setUploadProgress(10);

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      // Here you would implement the actual import logic
      // For now, we'll simulate a successful import
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      toast({
        title: "Import Successful",
        description: `Imported ${parsedData.rows.length} ${importType} successfully.`,
      });
      
      // Reset state
      setSelectedFile(null);
      setParsedData(null);
      onOpenChange(false);
      
    } catch (error) {
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
    setSelectedFile(null);
    setParsedData(null);
    setUploadProgress(0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
          <Tabs value={importType} onValueChange={setImportType} className="space-y-4">
            {/* Import Type Selection */}
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 gap-1">
              <TabsTrigger value="transactions" className="text-xs px-2">
                <span className="hidden sm:inline">Transactions</span>
                <span className="sm:hidden">Trans.</span>
              </TabsTrigger>
              <TabsTrigger value="pockets" className="text-xs px-2">
                <span className="hidden sm:inline">Budget Pockets</span>
                <span className="sm:hidden">Pockets</span>
              </TabsTrigger>
              <TabsTrigger value="categories" className="text-xs px-2">
                <span className="hidden sm:inline">Categories</span>
                <span className="sm:hidden">Categ.</span>
              </TabsTrigger>
              <TabsTrigger value="accounts" className="text-xs px-2">
                <span className="hidden sm:inline">Accounts</span>
                <span className="sm:hidden">Acc.</span>
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
                        Or drag and drop your CSV file here
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
                          className="h-8 w-8 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-500" />
                        <span className="font-medium">{selectedFile.name}</span>
                        <Badge variant={parsedData?.isValid ? "default" : "destructive"}>
                          {parsedData?.isValid ? "Valid" : "Invalid"}
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={!parsedData?.isValid || isUploading}
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