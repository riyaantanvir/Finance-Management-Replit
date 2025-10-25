import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash2, Plus, DollarSign, Calendar, Tag as TagIcon, Download, Upload, FileText, AlertCircle, CheckCircle2, Target, TrendingUp } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Papa from "papaparse";
import type { PlannedPayment, Tag, InsertPlannedPayment, Expense } from "@shared/schema";

type CSVRow = {
  tag: string;
  amount: string;
  frequency: string;
  startDate: string;
  endDate: string;
  description: string;
  errors: string[];
  isValid: boolean;
};

export default function PlannedPayments() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<PlannedPayment | null>(null);
  const [selectedTag, setSelectedTag] = useState<string>("");
  const [selectedFrequency, setSelectedFrequency] = useState<"monthly" | "weekly" | "daily" | "custom">("monthly");
  
  // CSV Import/Export state
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [csvData, setCsvData] = useState<CSVRow[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  const { data: plannedPayments, isLoading: isLoadingPayments } = useQuery<PlannedPayment[]>({
    queryKey: ["/api/planned-payments"],
  });

  const { data: tags } = useQuery<Tag[]>({
    queryKey: ["/api/tags"],
  });

  // Fetch expenses for this month
  const { data: expenses } = useQuery<Expense[]>({
    queryKey: ["/api/expenses/filtered", "this_month"],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('dateRange', 'this_month');
      const response = await fetch(`/api/expenses/filtered?${params}`);
      if (!response.ok) throw new Error('Failed to fetch expenses');
      return response.json();
    },
  });

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    const totalPlanned = (plannedPayments || []).reduce((sum, payment) => {
      const amount = parseFloat(payment.amount);
      
      // Convert all frequencies to monthly equivalent
      switch (payment.frequency) {
        case 'monthly':
          return sum + amount;
        case 'weekly':
          return sum + (amount * 4.33); // 52 weeks / 12 months
        case 'daily':
          return sum + (amount * 30); // Average 30 days per month
        case 'custom':
          // For custom, just add the amount as-is (user defines the period)
          return sum + amount;
        default:
          return sum;
      }
    }, 0);

    const totalExpense = (expenses || [])
      .filter(exp => exp.type === 'expense')
      .reduce((sum, exp) => sum + parseFloat(exp.amount), 0);

    return { totalPlanned, totalExpense };
  }, [plannedPayments, expenses]);

  // Sync select state when editing payment changes
  useEffect(() => {
    if (editingPayment) {
      setSelectedTag(editingPayment.tag);
      setSelectedFrequency(editingPayment.frequency);
    } else {
      setSelectedTag("");
      setSelectedFrequency("monthly");
    }
  }, [editingPayment]);

  const createMutation = useMutation({
    mutationFn: async (data: InsertPlannedPayment) => {
      return await apiRequest("POST", "/api/planned-payments", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/planned-payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/planned-breakdown"] });
      setIsAddDialogOpen(false);
      toast({
        title: "Success",
        description: "Planned payment created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create planned payment",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertPlannedPayment> }) => {
      return await apiRequest("PUT", `/api/planned-payments/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/planned-payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/planned-breakdown"] });
      setEditingPayment(null);
      toast({
        title: "Success",
        description: "Planned payment updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update planned payment",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/planned-payments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/planned-payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/planned-breakdown"] });
      toast({
        title: "Success",
        description: "Planned payment deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete planned payment",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const data: InsertPlannedPayment = {
      tag: selectedTag,
      amount: formData.get("amount") as string,
      frequency: selectedFrequency,
      startDate: formData.get("startDate") as string,
      endDate: (formData.get("endDate") as string) || null,
      isActive: true,
    };

    if (editingPayment) {
      updateMutation.mutate({ id: editingPayment.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  // CSV Export function
  const handleExport = () => {
    if (!plannedPayments || plannedPayments.length === 0) {
      toast({
        title: "No data to export",
        description: "Add some planned payments first",
        variant: "destructive",
      });
      return;
    }

    const data = plannedPayments.map(p => ({
      tag: p.tag,
      amount: p.amount,
      frequency: p.frequency,
      startDate: p.startDate,
      endDate: p.endDate || "",
      description: p.description || ""
    }));

    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `planned-payments-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export successful",
      description: "CSV file has been downloaded",
    });
  };

  // Sample CSV download
  const handleDownloadSample = () => {
    const sampleData = [
      { tag: "groceries", amount: "500.00", frequency: "monthly", startDate: "2025-01-01", endDate: "", description: "Monthly grocery budget" },
      { tag: "utilities", amount: "200.00", frequency: "monthly", startDate: "2025-01-01", endDate: "2025-12-31", description: "Utility bills, water & electricity" },
      { tag: "transportation", amount: "50.00", frequency: "weekly", startDate: "2025-01-01", endDate: "", description: "Weekly transport costs, including gas" },
      { tag: "entertainment", amount: "20.00", frequency: "daily", startDate: "2025-01-01", endDate: "", description: "Daily entertainment budget" }
    ];

    const csv = Papa.unparse(sampleData);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "planned-payments-sample.csv";
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Sample downloaded",
      description: "Use this template to prepare your data",
    });
  };

  // Validate CSV row
  const validateRow = (row: Omit<CSVRow, 'errors' | 'isValid'>, index: number): CSVRow => {
    const errors: string[] = [];
    
    if (!row.tag || row.tag.trim() === "") {
      errors.push("Tag is required");
    }
    
    if (!row.amount || isNaN(parseFloat(row.amount)) || parseFloat(row.amount) <= 0) {
      errors.push("Amount must be a positive number");
    }
    
    const validFrequencies = ["monthly", "weekly", "daily", "custom"];
    if (!row.frequency || !validFrequencies.includes(row.frequency.toLowerCase())) {
      errors.push("Frequency must be: monthly, weekly, daily, or custom");
    }
    
    if (!row.startDate || isNaN(Date.parse(row.startDate))) {
      errors.push("Start date is required and must be valid (YYYY-MM-DD)");
    }
    
    if (row.endDate && row.endDate.trim() !== "" && isNaN(Date.parse(row.endDate))) {
      errors.push("End date must be valid (YYYY-MM-DD) or empty");
    }

    const availableTags = tags?.map(t => t.name) || [];
    if (row.tag && !availableTags.includes(row.tag)) {
      errors.push(`Tag "${row.tag}" doesn't exist. Available tags: ${availableTags.join(", ")}`);
    }
    
    return {
      ...row,
      errors,
      isValid: errors.length === 0
    };
  };

  // Parse CSV file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => header.trim().toLowerCase(),
      complete: (results) => {
        try {
          // Check for Papa Parse errors
          if (results.errors && results.errors.length > 0) {
            const criticalErrors = results.errors.filter(
              e => e.type === 'Quotes' || e.type === 'FieldMismatch'
            );
            
            if (criticalErrors.length > 0) {
              toast({
                title: "CSV parsing error",
                description: `Found ${criticalErrors.length} critical error(s): ${criticalErrors[0].message}`,
                variant: "destructive",
              });
              return;
            }

            // Show warning for non-critical errors but continue
            if (results.errors.length > 0) {
              console.warn("CSV parsing warnings:", results.errors);
            }
          }

          if (!results.data || results.data.length === 0) {
            toast({
              title: "Invalid CSV",
              description: "CSV file must have at least one data row",
              variant: "destructive",
            });
            return;
          }

          const requiredHeaders = ["tag", "amount", "frequency", "startdate"];
          const headers = results.meta.fields || [];
          const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
          
          if (missingHeaders.length > 0) {
            toast({
              title: "Invalid CSV format",
              description: `Missing required columns: ${missingHeaders.join(", ")}`,
              variant: "destructive",
            });
            return;
          }

          const data = (results.data as any[]).map((row, index) => {
            const csvRow: Omit<CSVRow, 'errors' | 'isValid'> = {
              tag: (row.tag || "").toString().trim(),
              amount: (row.amount || "").toString().trim(),
              frequency: (row.frequency || "").toString().trim(),
              startDate: (row.startdate || "").toString().trim(),
              endDate: (row.enddate || "").toString().trim(),
              description: (row.description || "").toString().trim()
            };
            
            return validateRow(csvRow, index);
          });

          setCsvData(data);
          setIsImportDialogOpen(true);

          const validCount = data.filter(row => row.isValid).length;
          const invalidCount = data.length - validCount;

          toast({
            title: "CSV parsed successfully",
            description: `${validCount} valid rows, ${invalidCount} rows with errors`,
          });

        } catch (error) {
          toast({
            title: "Error parsing CSV",
            description: "Please check your CSV format",
            variant: "destructive",
          });
        }
      },
      error: (error: Error) => {
        toast({
          title: "Error parsing CSV",
          description: error.message || "Please check your CSV format",
          variant: "destructive",
        });
      }
    });

    e.target.value = ""; // Reset input
  };

  // Update CSV row (for inline editing)
  const updateCsvRow = (index: number, field: keyof Omit<CSVRow, 'errors' | 'isValid'>, value: string) => {
    const newData = [...csvData];
    newData[index] = {
      ...newData[index],
      [field]: value
    };
    
    // Re-validate the updated row
    newData[index] = validateRow(newData[index], index);
    setCsvData(newData);
  };

  // Submit imported data
  const handleImportSubmit = async () => {
    const validRows = csvData.filter(row => row.isValid);
    
    if (validRows.length === 0) {
      toast({
        title: "No valid rows",
        description: "Please fix all errors before importing",
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);

    try {
      const importPromises = validRows.map(row => {
        const data: InsertPlannedPayment = {
          tag: row.tag,
          amount: row.amount,
          frequency: row.frequency.toLowerCase() as "monthly" | "weekly" | "daily" | "custom",
          startDate: row.startDate,
          endDate: row.endDate || null,
          description: row.description || null,
          isActive: true
        };
        return apiRequest("POST", "/api/planned-payments", data);
      });

      await Promise.all(importPromises);

      queryClient.invalidateQueries({ queryKey: ["/api/planned-payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/planned-breakdown"] });

      toast({
        title: "Import successful",
        description: `${validRows.length} planned payments imported`,
      });

      setIsImportDialogOpen(false);
      setCsvData([]);

    } catch (error) {
      toast({
        title: "Import failed",
        description: "Some records could not be imported",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  if (isLoadingPayments) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Planned Payment Manager</h1>
          <p className="text-muted-foreground">Loading planned payments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Planned Payment Manager</h1>
          <p className="text-muted-foreground">Set budget plans and track spending per tag</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleDownloadSample}
            data-testid="button-download-sample"
          >
            <FileText className="h-4 w-4 mr-2" />
            Sample CSV
          </Button>
          <Button 
            variant="outline" 
            onClick={handleExport}
            data-testid="button-export"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <div>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
              id="csv-upload"
              data-testid="input-csv-upload"
            />
            <Button 
              variant="outline" 
              onClick={() => document.getElementById('csv-upload')?.click()}
              data-testid="button-import"
            >
              <Upload className="h-4 w-4 mr-2" />
              Import CSV
            </Button>
          </div>
          <Dialog open={isAddDialogOpen || !!editingPayment} onOpenChange={(open) => {
            if (open) {
              setIsAddDialogOpen(open);
            } else {
              setIsAddDialogOpen(false);
              setEditingPayment(null);
            }
          }}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-planned-payment">
                <Plus className="h-4 w-4 mr-2" />
                Add Planned Payment
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingPayment ? "Edit" : "Add"} Planned Payment</DialogTitle>
              <DialogDescription>
                Set up a budget plan for a specific tag with recurring frequency
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tag">Tag</Label>
                <Select value={selectedTag} onValueChange={setSelectedTag} required>
                  <SelectTrigger data-testid="select-tag">
                    <SelectValue placeholder="Select a tag" />
                  </SelectTrigger>
                  <SelectContent>
                    {tags?.map((tag) => (
                      <SelectItem key={tag.id} value={tag.name}>
                        {tag.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  defaultValue={editingPayment?.amount}
                  placeholder="0.00"
                  required
                  data-testid="input-amount"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="frequency">Frequency</Label>
                <Select value={selectedFrequency} onValueChange={(value) => setSelectedFrequency(value as "monthly" | "weekly" | "daily" | "custom")} required>
                  <SelectTrigger data-testid="select-frequency">
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  name="startDate"
                  type="date"
                  defaultValue={editingPayment?.startDate || new Date().toISOString().split('T')[0]}
                  required
                  data-testid="input-start-date"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">End Date (Optional)</Label>
                <Input
                  id="endDate"
                  name="endDate"
                  type="date"
                  defaultValue={editingPayment?.endDate || ""}
                  data-testid="input-end-date"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsAddDialogOpen(false);
                    setEditingPayment(null);
                  }}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-planned-payment"
                >
                  {editingPayment ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>

      {/* Summary Cards */}
      <div className="grid gap-3 md:grid-cols-2 mb-6">
        <Card className="border-blue-200" data-testid="card-total-planned">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Planned (This Month)</p>
                <p className="text-2xl font-bold text-blue-600" data-testid="text-total-planned">
                  ৳{summaryStats.totalPlanned.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <Target className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200" data-testid="card-total-expense">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Expense (This Month)</p>
                <p className="text-2xl font-bold text-purple-600" data-testid="text-total-expense">
                  ৳{summaryStats.totalExpense.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {plannedPayments && plannedPayments.length > 0 ? (
          plannedPayments.map((payment) => (
            <Card key={payment.id} className="hover:shadow-md transition-shadow" data-testid={`card-planned-payment-${payment.id}`}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2 flex-1">
                    <TagIcon className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-sm truncate">{payment.tag}</span>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setEditingPayment(payment)}
                      data-testid={`button-edit-${payment.id}`}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => {
                        if (confirm(`Delete planned payment for ${payment.tag}?`)) {
                          deleteMutation.mutate(payment.id);
                        }
                      }}
                      data-testid={`button-delete-${payment.id}`}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-bold">৳{parseFloat(payment.amount).toFixed(2)}</span>
                    <span className="text-xs text-muted-foreground">/ {payment.frequency}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {new Date(payment.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      {payment.endDate && ` - ${new Date(payment.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="py-10">
              <div className="text-center text-muted-foreground">
                <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No planned payments yet</p>
                <p className="text-sm">Click "Add Planned Payment" to create your first budget plan</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* CSV Import Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Import Planned Payments from CSV</DialogTitle>
            <DialogDescription>
              Review and edit the data before importing. Fix any errors shown below.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            {csvData.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      Total Rows: {csvData.length}
                    </p>
                    <div className="flex gap-4 text-xs">
                      <span className="flex items-center gap-1 text-green-600">
                        <CheckCircle2 className="h-3 w-3" />
                        Valid: {csvData.filter(r => r.isValid).length}
                      </span>
                      <span className="flex items-center gap-1 text-destructive">
                        <AlertCircle className="h-3 w-3" />
                        Errors: {csvData.filter(r => !r.isValid).length}
                      </span>
                    </div>
                  </div>
                  {csvData.some(r => !r.isValid) && (
                    <Alert className="flex-1 ml-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Please fix all errors before importing. Click on any cell to edit.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Tag</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Frequency</TableHead>
                        <TableHead>Start Date</TableHead>
                        <TableHead>End Date</TableHead>
                        <TableHead>Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {csvData.map((row, index) => (
                        <TableRow 
                          key={index} 
                          className={!row.isValid ? "bg-destructive/10" : ""}
                          data-testid={`csv-row-${index}`}
                        >
                          <TableCell className="font-medium">{index + 1}</TableCell>
                          <TableCell>
                            {row.isValid ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            ) : (
                              <div className="flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 text-destructive" />
                                <div className="text-xs text-destructive space-y-1">
                                  {row.errors.map((err, i) => (
                                    <div key={i}>{err}</div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Input
                              value={row.tag}
                              onChange={(e) => updateCsvRow(index, 'tag', e.target.value)}
                              className={`h-8 ${!row.isValid && row.errors.some(e => e.includes('Tag')) ? 'border-destructive' : ''}`}
                              data-testid={`input-tag-${index}`}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={row.amount}
                              onChange={(e) => updateCsvRow(index, 'amount', e.target.value)}
                              className={`h-8 ${!row.isValid && row.errors.some(e => e.includes('Amount')) ? 'border-destructive' : ''}`}
                              data-testid={`input-amount-${index}`}
                            />
                          </TableCell>
                          <TableCell>
                            <Select
                              value={row.frequency}
                              onValueChange={(value) => updateCsvRow(index, 'frequency', value)}
                            >
                              <SelectTrigger className={`h-8 ${!row.isValid && row.errors.some(e => e.includes('Frequency')) ? 'border-destructive' : ''}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="monthly">Monthly</SelectItem>
                                <SelectItem value="weekly">Weekly</SelectItem>
                                <SelectItem value="daily">Daily</SelectItem>
                                <SelectItem value="custom">Custom</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="date"
                              value={row.startDate}
                              onChange={(e) => updateCsvRow(index, 'startDate', e.target.value)}
                              className={`h-8 ${!row.isValid && row.errors.some(e => e.includes('Start date')) ? 'border-destructive' : ''}`}
                              data-testid={`input-start-date-${index}`}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="date"
                              value={row.endDate}
                              onChange={(e) => updateCsvRow(index, 'endDate', e.target.value)}
                              className="h-8"
                              data-testid={`input-end-date-${index}`}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={row.description}
                              onChange={(e) => updateCsvRow(index, 'description', e.target.value)}
                              className="h-8"
                              placeholder="Optional"
                              data-testid={`input-description-${index}`}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setIsImportDialogOpen(false);
                setCsvData([]);
              }}
              data-testid="button-cancel-import"
            >
              Cancel
            </Button>
            <Button
              onClick={handleImportSubmit}
              disabled={isImporting || csvData.filter(r => r.isValid).length === 0}
              data-testid="button-submit-import"
            >
              {isImporting ? "Importing..." : `Import ${csvData.filter(r => r.isValid).length} Rows`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
