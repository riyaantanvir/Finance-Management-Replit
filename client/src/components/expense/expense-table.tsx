import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Edit, Trash2, Download } from "lucide-react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Expense, ExchangeRate, SettingsFinance } from "@shared/schema";
import { Input } from "@/components/ui/input";

interface ExpenseTableProps {
  expenses: Expense[];
  isLoading: boolean;
}

export default function ExpenseTable({ expenses, isLoading }: ExpenseTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Expense>>({});
  const [perPage, setPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const updateExpenseMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Expense> }) =>
      apiRequest("PUT", `/api/expenses/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setEditingId(null);
      setEditData({});
      toast({
        title: "Success",
        description: "Expense updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update expense",
        variant: "destructive",
      });
    },
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/expenses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: "Expense deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete expense",
        variant: "destructive",
      });
    },
  });

  // Fetch exchange rates and finance settings for export
  const { data: exchangeRates = [] } = useQuery<ExchangeRate[]>({
    queryKey: ["/api/exchange-rates"],
  });

  const { data: financeSettings } = useQuery<SettingsFinance>({
    queryKey: ["/api/settings/finance"],
    initialData: { id: '', baseCurrency: 'BDT', allowNegativeBalances: true, updatedAt: null }
  });

  // Currency conversion function
  const convertToBDT = (amount: number, fromCurrency: string): number => {
    const baseCurrency = 'BDT';
    if (fromCurrency === baseCurrency) {
      return amount;
    }

    // Find exchange rate from fromCurrency to BDT
    const rate = exchangeRates.find(r => 
      r.fromCurrency === fromCurrency && r.toCurrency === baseCurrency
    );

    if (rate) {
      return amount * parseFloat(rate.rate);
    }

    // If no direct rate found, try inverse rate
    const inverseRate = exchangeRates.find(r => 
      r.fromCurrency === baseCurrency && r.toCurrency === fromCurrency
    );

    if (inverseRate) {
      return amount / parseFloat(inverseRate.rate);
    }

    // If no rate found, return original amount
    return amount;
  };

  // Export to CSV function
  const exportToCSV = () => {
    try {
      // Create CSV headers matching the template
      const headers = ['Date', 'Type', 'Details', 'Amount (BDT)', 'Tag', 'Payment Method'];
      
      // Process expense data
      const csvData = expenses.map(expense => {
        const convertedAmount = convertToBDT(parseFloat(expense.amount), 'BDT'); // Assuming BDT for now, but this handles conversion
        return [
          expense.date,
          expense.type,
          expense.details,
          convertedAmount.toString(),
          expense.tag,
          expense.paymentMethod
        ];
      });

      // Combine headers and data
      const csvContent = [headers, ...csvData]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `expenses-export-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Success",
        description: "Expenses exported successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export expenses",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (expense: Expense) => {
    setEditingId(expense.id);
    setEditData(expense);
  };

  const handleSaveEdit = () => {
    if (editingId && editData) {
      updateExpenseMutation.mutate({ id: editingId, data: editData });
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const handleDelete = (id: string) => {
    deleteExpenseMutation.mutate(id);
  };

  const formatCurrency = (amount: string) => `৳ ${parseFloat(amount).toLocaleString()}`;

  // Pagination
  const totalPages = Math.ceil(expenses.length / perPage);
  const startIndex = (currentPage - 1) * perPage;
  const paginatedExpenses = expenses.slice(startIndex, startIndex + perPage);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>All Entries</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>All Entries</CardTitle>
          <div className="flex items-center space-x-4">
            <Button
              onClick={exportToCSV}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              data-testid="button-export"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">Show:</span>
              <Select
              value={perPage.toString()}
              onValueChange={(value) => {
                setPerPage(parseInt(value));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-20" data-testid="select-per-page">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {expenses.length === 0 ? (
          <p className="text-center text-muted-foreground py-8" data-testid="text-no-expenses">
            No expenses found
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Tag</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedExpenses.map((expense) => (
                    <TableRow key={expense.id} data-testid={`row-expense-${expense.id}`}>
                      <TableCell>
                        {editingId === expense.id ? (
                          <Input
                            type="date"
                            value={editData.date || ''}
                            onChange={(e) => setEditData({ ...editData, date: e.target.value })}
                            className="w-32"
                            data-testid={`input-edit-date-${expense.id}`}
                          />
                        ) : (
                          <span data-testid={`text-date-${expense.id}`}>
                            {new Date(expense.date).toLocaleDateString()}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === expense.id ? (
                          <Select
                            value={editData.type || ''}
                            onValueChange={(value) => setEditData({ ...editData, type: value })}
                          >
                            <SelectTrigger className="w-24" data-testid={`select-edit-type-${expense.id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="income">Income</SelectItem>
                              <SelectItem value="expense">Expense</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge
                            variant={expense.type === 'income' ? 'default' : 'destructive'}
                            className={
                              expense.type === 'income'
                                ? 'bg-green-100 text-green-800 hover:bg-green-100'
                                : 'bg-red-100 text-red-800 hover:bg-red-100'
                            }
                            data-testid={`badge-type-${expense.id}`}
                          >
                            {expense.type === 'income' ? 'Income' : 'Expense'}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === expense.id ? (
                          <Input
                            value={editData.details || ''}
                            onChange={(e) => setEditData({ ...editData, details: e.target.value })}
                            data-testid={`input-edit-details-${expense.id}`}
                          />
                        ) : (
                          <span data-testid={`text-details-${expense.id}`}>{expense.details}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === expense.id ? (
                          <Input
                            type="number"
                            step="0.01"
                            value={editData.amount || ''}
                            onChange={(e) => setEditData({ ...editData, amount: e.target.value })}
                            className="w-24"
                            data-testid={`input-edit-amount-${expense.id}`}
                          />
                        ) : (
                          <span className="font-medium" data-testid={`text-amount-${expense.id}`}>
                            {formatCurrency(expense.amount)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === expense.id ? (
                          <Select
                            value={editData.tag || ''}
                            onValueChange={(value) => setEditData({ ...editData, tag: value })}
                          >
                            <SelectTrigger className="w-28" data-testid={`select-edit-tag-${expense.id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="home">Home</SelectItem>
                              <SelectItem value="family">Family</SelectItem>
                              <SelectItem value="business">Business</SelectItem>
                              <SelectItem value="transport">Transport</SelectItem>
                              <SelectItem value="food">Food</SelectItem>
                              <SelectItem value="entertainment">Entertainment</SelectItem>
                              <SelectItem value="healthcare">Healthcare</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <span data-testid={`text-tag-${expense.id}`}>{expense.tag}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === expense.id ? (
                          <Select
                            value={editData.paymentMethod || ''}
                            onValueChange={(value) => setEditData({ ...editData, paymentMethod: value })}
                          >
                            <SelectTrigger className="w-28" data-testid={`select-edit-payment-${expense.id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cash">Cash</SelectItem>
                              <SelectItem value="bkash">Bkash</SelectItem>
                              <SelectItem value="binance">Binance</SelectItem>
                              <SelectItem value="card">Card</SelectItem>
                              <SelectItem value="bank">Bank Transfer</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <span data-testid={`text-payment-method-${expense.id}`}>{expense.paymentMethod}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === expense.id ? (
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              onClick={handleSaveEdit}
                              disabled={updateExpenseMutation.isPending}
                              data-testid={`button-save-${expense.id}`}
                            >
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleCancelEdit}
                              data-testid={`button-cancel-${expense.id}`}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(expense)}
                              data-testid={`button-edit-${expense.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-destructive hover:text-destructive"
                                  data-testid={`button-delete-${expense.id}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this expense entry? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel data-testid={`button-cancel-delete-${expense.id}`}>
                                    Cancel
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(expense.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    data-testid={`button-confirm-delete-${expense.id}`}
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground" data-testid="text-pagination-info">
                Showing {startIndex + 1} to {Math.min(startIndex + perPage, expenses.length)} of {expenses.length} entries
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  data-testid="button-previous-page"
                >
                  Previous
                </Button>
                {[...Array(totalPages)].map((_, i) => (
                  <Button
                    key={i + 1}
                    variant={currentPage === i + 1 ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(i + 1)}
                    data-testid={`button-page-${i + 1}`}
                  >
                    {i + 1}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  data-testid="button-next-page"
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
