import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Download, AlertCircle, CheckCircle } from "lucide-react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { MainTag, SubTag } from "@shared/schema";

interface CSVExpense {
  date: string;
  type: string;
  details: string;
  amount: string;
  mainCategory: string;
  subCategory: string;
  paymentMethod: string;
}

export default function CSVImport() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<CSVExpense[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch main tags and sub-tags for mapping
  const { data: mainTags = [] } = useQuery<MainTag[]>({
    queryKey: ["/api/main-tags"],
  });

  const { data: subTags = [] } = useQuery<SubTag[]>({
    queryKey: ["/api/sub-tags"],
  });

  const importMutation = useMutation({
    mutationFn: async (data: CSVExpense[]) => {
      // Auto-create categories and map to subTagId
      const sessionId = localStorage.getItem('sessionId');
      const expensesWithSubTagId = [];
      
      // Track created categories to avoid duplicates within this import
      const createdMainTags = new Map<string, string>(); // name -> id
      const createdSubTags = new Map<string, string>(); // "mainTagId|subTagName" -> id
      
      // Initialize with existing tags
      mainTags.forEach(mt => {
        createdMainTags.set(mt.name.toLowerCase(), mt.id);
      });
      subTags.forEach(st => {
        createdSubTags.set(`${st.mainTagId}|${st.name.toLowerCase()}`, st.id);
      });
      
      for (const expense of data) {
        const mainCategoryName = expense.mainCategory.trim();
        const subCategoryName = expense.subCategory.trim();
        
        // Get or create main tag
        let mainTagId = createdMainTags.get(mainCategoryName.toLowerCase());
        if (!mainTagId) {
          const newMainTag: any = await apiRequest("POST", "/api/main-tags", {
            sessionId,
            name: mainCategoryName,
            description: `Auto-created from CSV import`
          });
          mainTagId = newMainTag.id;
          createdMainTags.set(mainCategoryName.toLowerCase(), mainTagId);
        }
        
        // Get or create sub-tag
        const subTagKey = `${mainTagId}|${subCategoryName.toLowerCase()}`;
        let subTagId = createdSubTags.get(subTagKey);
        if (!subTagId) {
          const newSubTag: any = await apiRequest("POST", "/api/sub-tags", {
            sessionId,
            name: subCategoryName,
            mainTagId: mainTagId,
            description: `Auto-created from CSV import`
          });
          subTagId = newSubTag.id;
          createdSubTags.set(subTagKey, subTagId);
        }
        
        // Add expense with subTagId
        const { mainCategory, subCategory, ...rest } = expense;
        expensesWithSubTagId.push({
          ...rest,
          subTagId: subTagId,
        });
      }

      return apiRequest("POST", "/api/expenses/bulk", { expenses: expensesWithSubTagId });
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/main-tags"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sub-tags"] });
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

  // Proper CSV parsing function that handles quoted values
  const parseCSVLine = (line: string): string[] => {
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        cells.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    cells.push(current.trim());
    return cells;
  };

  const parseCSV = (text: string): { data: CSVExpense[]; errors: string[] } => {
    const lines = text.trim().split('\n');
    const errors: string[] = [];
    const data: CSVExpense[] = [];

    if (lines.length < 2) {
      errors.push("CSV file must contain a header row and at least one data row");
      return { data, errors };
    }

    // Expected headers for hierarchical tags
    const expectedHeaders = ['Date', 'Type', 'Details', 'Amount (BDT)', 'Main Category', 'Sub-Category', 'Payment Method'];
    const headers = parseCSVLine(lines[0]);

    // Validate headers
    const headerMapping: { [key: string]: number } = {};
    expectedHeaders.forEach((expected) => {
      const normalizedExpected = expected.toLowerCase().replace(' (bdt)', '').replace(/-/g, '').replace(/\s+/g, '');
      const actualIndex = headers.findIndex(h => {
        const normalizedActual = h.toLowerCase().replace(' (bdt)', '').replace(/-/g, '').replace(/\s+/g, '');
        return normalizedActual === normalizedExpected || normalizedActual.includes(normalizedExpected);
      });
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
      const cells = parseCSVLine(lines[i]);
      
      if (cells.length < expectedHeaders.length) {
        errors.push(`Row ${i + 1}: Insufficient columns`);
        continue;
      }

      const expense: CSVExpense = {
        date: cells[headerMapping['Date']] || '',
        type: cells[headerMapping['Type']]?.toLowerCase() || '',
        details: cells[headerMapping['Details']] || '',
        amount: cells[headerMapping['Amount (BDT)']] || '',
        mainCategory: cells[headerMapping['Main Category']]?.trim() || '',
        subCategory: cells[headerMapping['Sub-Category']]?.trim() || '',
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

      // Validate main category
      if (!expense.mainCategory || expense.mainCategory.trim() === '') {
        errors.push(`Row ${i + 1}: Main Category is required`);
        continue;
      }

      // Validate sub-category
      if (!expense.subCategory || expense.subCategory.trim() === '') {
        errors.push(`Row ${i + 1}: Sub-Category is required`);
        continue;
      }

      // Validate payment method
      if (!expense.paymentMethod || expense.paymentMethod.trim() === '') {
        errors.push(`Row ${i + 1}: Payment Method is required`);
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
    const headers = "Date,Type,Details,Amount (BDT),Main Category,Sub-Category,Payment Method\n";
    const sample = "2024-01-15,expense,Kacha Bazer,1200,Family bazer,kacha bazer,cash\n2024-01-15,expense,Fish purchase,800,Family bazer,fish bazer,cash\n2024-01-16,expense,Uber ride,350,Transportation,taxi,bkash\n2024-01-17,income,Salary,50000,Income,salary,bank transfer";
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