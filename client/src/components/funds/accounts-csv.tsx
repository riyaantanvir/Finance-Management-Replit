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
import { Account, PaymentMethod } from "@shared/schema";

interface CSVAccount {
  name: string;
  type: string;
  currency: string;
  openingBalance: string;
  paymentMethodKey: string;
  status: string;
}

interface AccountsCSVProps {
  accounts: Account[];
}

export default function AccountsCSV({ accounts }: AccountsCSVProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<CSVAccount[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch payment methods for validation
  const { data: paymentMethods = [] } = useQuery<PaymentMethod[]>({
    queryKey: ["/api/payment-methods"],
  });

  const importMutation = useMutation({
    mutationFn: (data: CSVAccount[]) => apiRequest("POST", "/api/accounts/bulk", { accounts: data }),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      setFile(null);
      setPreview([]);
      setErrors([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      toast({
        title: "Success",
        description: `${preview.length} accounts imported successfully`,
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

  // Sample CSV data for download
  const generateSampleCSV = () => {
    const sampleData = [
      {
        name: "Cash Wallet",
        type: "cash",
        currency: "BDT",
        openingBalance: "5000.00",
        paymentMethodKey: "",
        status: "active"
      },
      {
        name: "Bkash Account",
        type: "mobile_wallet",
        currency: "BDT",
        openingBalance: "2500.50",
        paymentMethodKey: "bkash",
        status: "active"
      },
      {
        name: "Bank Account",
        type: "bank_account",
        currency: "USD",
        openingBalance: "1200.75",
        paymentMethodKey: "",
        status: "active"
      }
    ];

    const csvContent = [
      "name,type,currency,openingBalance,paymentMethodKey,status",
      ...sampleData.map(row => 
        `"${row.name}","${row.type}","${row.currency}","${row.openingBalance}","${row.paymentMethodKey}","${row.status}"`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_accounts.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export current accounts to CSV
  const exportToCSV = async () => {
    if (accounts.length === 0) {
      toast({
        title: "No Data",
        description: "No accounts available to export",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch('/api/accounts/export');
      if (!response.ok) {
        throw new Error('Failed to export accounts');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `accounts_export_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: `${accounts.length} accounts exported successfully`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export accounts",
        variant: "destructive",
      });
    }
  };

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

  const parseCSV = (text: string): { data: CSVAccount[]; errors: string[] } => {
    const lines = text.trim().split('\n');
    const errors: string[] = [];
    const data: CSVAccount[] = [];

    if (lines.length < 2) {
      errors.push("CSV file must contain at least a header row and one data row");
      return { data, errors };
    }

    // Parse header
    const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/['"]/g, ''));
    const expectedHeaders = ['name', 'type', 'currency', 'openingbalance', 'paymentmethodkey', 'status'];
    
    const missingHeaders = expectedHeaders.filter(header => !headers.includes(header));
    if (missingHeaders.length > 0) {
      errors.push(`Missing required columns: ${missingHeaders.join(', ')}`);
      return { data, errors };
    }

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const cells = parseCSVLine(line).map(cell => cell.replace(/^"|"$/g, ''));
      
      if (cells.length !== expectedHeaders.length) {
        errors.push(`Row ${i + 1}: Expected ${expectedHeaders.length} columns, got ${cells.length}`);
        continue;
      }

      const [name, type, currency, openingBalance, paymentMethodKey, status] = cells;

      // Validation
      const rowErrors: string[] = [];
      
      if (!name.trim()) {
        rowErrors.push(`Row ${i + 1}: Account name is required`);
      }

      const validTypes = ["cash", "mobile_wallet", "bank_account", "card", "crypto", "other"];
      if (!validTypes.includes(type)) {
        rowErrors.push(`Row ${i + 1}: Invalid account type "${type}". Must be one of: ${validTypes.join(', ')}`);
      }

      if (!currency.trim()) {
        rowErrors.push(`Row ${i + 1}: Currency is required`);
      }

      if (!openingBalance.trim() || isNaN(Number(openingBalance))) {
        rowErrors.push(`Row ${i + 1}: Opening balance must be a valid number`);
      }

      const validStatuses = ["active", "archived"];
      if (!validStatuses.includes(status)) {
        rowErrors.push(`Row ${i + 1}: Invalid status "${status}". Must be one of: ${validStatuses.join(', ')}`);
      }

      // Check if payment method exists (if provided)
      if (paymentMethodKey.trim() && !paymentMethods.some(pm => pm.name === paymentMethodKey || pm.id === paymentMethodKey)) {
        rowErrors.push(`Row ${i + 1}: Payment method "${paymentMethodKey}" does not exist`);
      }

      if (rowErrors.length > 0) {
        errors.push(...rowErrors);
        continue;
      }

      data.push({
        name: name.trim(),
        type: type.trim(),
        currency: currency.trim(),
        openingBalance: parseFloat(openingBalance).toFixed(2),
        paymentMethodKey: paymentMethodKey.trim(),
        status: status.trim()
      });
    }

    return { data, errors };
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      toast({
        title: "Invalid File",
        description: "Please upload a CSV file",
        variant: "destructive",
      });
      return;
    }

    setFile(file);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { data, errors } = parseCSV(text);
      setPreview(data);
      setErrors(errors);
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    if (preview.length === 0 || errors.length > 0) return;
    importMutation.mutate(preview);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          CSV Import/Export
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Export Section */}
        <div className="space-y-2">
          <Label>Export Accounts</Label>
          <div className="flex gap-2">
            <Button
              onClick={exportToCSV}
              variant="outline"
              className="flex items-center gap-2"
              data-testid="button-export-csv"
            >
              <Download className="h-4 w-4" />
              Export Current Accounts
            </Button>
            <Button
              onClick={generateSampleCSV}
              variant="outline"
              className="flex items-center gap-2"
              data-testid="button-download-sample"
            >
              <Download className="h-4 w-4" />
              Download Sample CSV
            </Button>
          </div>
        </div>

        {/* Import Section */}
        <div className="space-y-2">
          <Label htmlFor="csv-file">Import Accounts from CSV</Label>
          <Input
            id="csv-file"
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            ref={fileInputRef}
            data-testid="input-csv-file"
          />
          <p className="text-xs text-muted-foreground">
            CSV format: name, type, currency, openingBalance, paymentMethodKey, status
          </p>
        </div>

        {/* Errors */}
        {errors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <div className="font-medium">Import Errors:</div>
                {errors.map((error, index) => (
                  <div key={index} className="text-sm">{error}</div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Preview */}
        {preview.length > 0 && errors.length === 0 && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <div className="font-medium">Preview: {preview.length} accounts ready to import</div>
                <div className="max-h-32 overflow-y-auto">
                  {preview.slice(0, 3).map((account, index) => (
                    <div key={index} className="text-xs">
                      {account.name} ({account.type}) - {account.currency} {account.openingBalance}
                    </div>
                  ))}
                  {preview.length > 3 && (
                    <div className="text-xs text-muted-foreground">
                      ...and {preview.length - 3} more accounts
                    </div>
                  )}
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Import Button */}
        {file && preview.length > 0 && errors.length === 0 && (
          <Button
            onClick={handleImport}
            disabled={importMutation.isPending}
            className="w-full"
            data-testid="button-import-csv"
          >
            {importMutation.isPending ? "Importing..." : `Import ${preview.length} Accounts`}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}