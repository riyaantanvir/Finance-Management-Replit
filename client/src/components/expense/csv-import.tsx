import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Download, AlertCircle, CheckCircle } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CSVExpense {
  date: string;
  type: string;
  details: string;
  amount: string;
  tag: string;
  paymentMethod: string;
}

export default function CSVImport() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<CSVExpense[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const importMutation = useMutation({
    mutationFn: (data: CSVExpense[]) => apiRequest("POST", "/api/expenses/bulk", { expenses: data }),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setFile(null);
      setPreview([]);
      setErrors([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      toast({
        title: "Success",
        description: `${preview.length} expenses imported successfully`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import CSV data",
        variant: "destructive",
      });
    },
  });

  const parseCSV = (text: string): { data: CSVExpense[]; errors: string[] } => {
    const lines = text.trim().split('\n');
    const errors: string[] = [];
    const data: CSVExpense[] = [];

    if (lines.length < 2) {
      errors.push("CSV file must contain a header row and at least one data row");
      return { data, errors };
    }

    // Expected headers
    const expectedHeaders = ['Date', 'Type', 'Details', 'Amount (BDT)', 'Tag', 'Payment Method'];
    const headers = lines[0].split(',').map(h => h.trim());

    // Validate headers
    const headerMapping: { [key: string]: number } = {};
    expectedHeaders.forEach((expected, index) => {
      const actualIndex = headers.findIndex(h => 
        h.toLowerCase().includes(expected.toLowerCase().replace(' (BDT)', ''))
      );
      if (actualIndex === -1) {
        errors.push(`Missing required column: ${expected}`);
      } else {
        headerMapping[expected] = actualIndex;
      }
    });

    if (errors.length > 0) {
      return { data, errors };
    }

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const cells = lines[i].split(',').map(cell => cell.trim().replace(/^"|"$/g, ''));
      
      if (cells.length < expectedHeaders.length) {
        errors.push(`Row ${i + 1}: Insufficient columns`);
        continue;
      }

      const expense: CSVExpense = {
        date: cells[headerMapping['Date']] || '',
        type: cells[headerMapping['Type']]?.toLowerCase() || '',
        details: cells[headerMapping['Details']] || '',
        amount: cells[headerMapping['Amount (BDT)']] || '',
        tag: cells[headerMapping['Tag']]?.toLowerCase() || '',
        paymentMethod: cells[headerMapping['Payment Method']]?.toLowerCase().replace(/\s+/g, '') || '',
      };

      // Validate data
      if (!expense.date) {
        errors.push(`Row ${i + 1}: Date is required`);
        continue;
      }

      if (!['income', 'expense'].includes(expense.type)) {
        errors.push(`Row ${i + 1}: Type must be 'income' or 'expense'`);
        continue;
      }

      if (!expense.details) {
        errors.push(`Row ${i + 1}: Details is required`);
        continue;
      }

      if (!expense.amount || isNaN(parseFloat(expense.amount))) {
        errors.push(`Row ${i + 1}: Amount must be a valid number`);
        continue;
      }

      const validTags = ['home', 'family', 'business', 'transport', 'food', 'entertainment', 'healthcare'];
      if (!validTags.includes(expense.tag)) {
        errors.push(`Row ${i + 1}: Tag must be one of: ${validTags.join(', ')}`);
        continue;
      }

      const validPaymentMethods = ['cash', 'bkash', 'binance', 'card', 'bank', 'banktransfer'];
      if (!validPaymentMethods.includes(expense.paymentMethod)) {
        errors.push(`Row ${i + 1}: Payment Method must be one of: cash, bkash, binance, card, bank transfer`);
        continue;
      }

      data.push(expense);
    }

    return { data, errors };
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      toast({
        title: "Invalid File",
        description: "Please select a CSV file",
        variant: "destructive",
      });
      return;
    }

    setFile(selectedFile);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const { data, errors } = parseCSV(text);
      setPreview(data);
      setErrors(errors);
    };
    reader.readAsText(selectedFile);
  };

  const handleImport = () => {
    if (preview.length > 0 && errors.length === 0) {
      importMutation.mutate(preview);
    }
  };

  const downloadTemplate = () => {
    const headers = "Date,Type,Details,Amount (BDT),Tag,Payment Method\n";
    const sample = "2024-01-15,expense,Lunch at restaurant,1200,food,cash\n2024-01-15,income,Freelance payment,50000,business,bank";
    const csvContent = headers + sample;
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'expense_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <Card className="mb-4 md:mb-6">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg md:text-xl flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Import CSV
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Template Download */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between p-4 bg-muted rounded-lg">
          <div>
            <p className="text-sm font-medium">Need a template?</p>
            <p className="text-xs text-muted-foreground">Download our CSV template with sample data</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={downloadTemplate}
            className="w-full sm:w-auto h-9"
            data-testid="button-download-template"
          >
            <Download className="h-4 w-4 mr-2" />
            Download Template
          </Button>
        </div>

        {/* File Upload */}
        <div>
          <Label htmlFor="csv-file" className="text-sm font-medium">Upload CSV File</Label>
          <Input
            ref={fileInputRef}
            id="csv-file"
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="mt-1 h-11"
            data-testid="input-csv-file"
          />
        </div>

        {/* Errors */}
        {errors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="font-medium mb-2">Found {errors.length} error(s):</div>
              <ul className="text-xs space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Preview */}
        {preview.length > 0 && errors.length === 0 && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="font-medium mb-2">Ready to import {preview.length} expense(s)</div>
              <div className="text-xs text-muted-foreground">
                Preview: {preview.slice(0, 3).map(e => e.details).join(', ')}
                {preview.length > 3 && ` +${preview.length - 3} more`}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Import Button */}
        {file && (
          <div className="flex justify-end pt-2">
            <Button
              onClick={handleImport}
              disabled={preview.length === 0 || errors.length > 0 || importMutation.isPending}
              className="w-full sm:w-auto h-11 min-h-[44px]"
              data-testid="button-import-csv"
            >
              {importMutation.isPending ? "Importing..." : `Import ${preview.length} Expenses`}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}