import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Filter, ArrowUpRight, ArrowDownLeft, Edit, Trash2, Download, Upload } from "lucide-react";
import { InvTx, InvProject, InvCategory, Account, SettingsFinance } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertInvTxSchema, type InsertInvTx } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function InvestmentTransactions() {
  const [searchTerm, setSearchTerm] = useState("");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [directionFilter, setDirectionFilter] = useState<string>("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<InvTx | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<InvTx | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: transactions = [], isLoading } = useQuery<InvTx[]>({
    queryKey: ["/api/inv-tx"],
  });

  const { data: projects = [] } = useQuery<InvProject[]>({
    queryKey: ["/api/inv-projects"],
  });

  const { data: categories = [] } = useQuery<InvCategory[]>({
    queryKey: ["/api/inv-categories"],
  });

  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ["/api/accounts"],
  });

  const { data: financeSettings } = useQuery<SettingsFinance>({
    queryKey: ["/api/settings/finance"],
    initialData: { id: '', baseCurrency: 'BDT', allowNegativeBalances: true, updatedAt: null }
  });

  const createForm = useForm<InsertInvTx>({
    resolver: zodResolver(insertInvTxSchema),
    defaultValues: {
      projectId: "",
      categoryId: "", 
      date: new Date().toISOString().split('T')[0],
      direction: "cost",
      currency: financeSettings?.baseCurrency || "BDT",
      fxRate: "1",
      accountId: "",
      amount: "",
      amountBase: "",
      note: "",
    },
  });

  const editForm = useForm<InsertInvTx>({
    resolver: zodResolver(insertInvTxSchema),
    defaultValues: {
      projectId: "",
      categoryId: "", 
      date: new Date().toISOString().split('T')[0],
      direction: "cost",
      currency: financeSettings?.baseCurrency || "BDT",
      fxRate: "1",
      accountId: "",
      amount: "",
      amountBase: "",
      note: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: InsertInvTx) => apiRequest('POST', '/api/inv-tx', data),
    onSuccess: () => {
      toast({ title: "Success", description: "Transaction created successfully" });
      setIsCreateModalOpen(false);
      createForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/inv-tx"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create transaction", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: InsertInvTx }) => 
      apiRequest('PATCH', `/api/inv-tx/${id}`, data),
    onSuccess: () => {
      toast({ title: "Success", description: "Transaction updated successfully" });
      setIsEditModalOpen(false);
      setEditingTransaction(null);
      editForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/inv-tx"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update transaction", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/inv-tx/${id}`),
    onSuccess: () => {
      toast({ title: "Success", description: "Transaction deleted successfully" });
      setDeleteDialogOpen(false);
      setTransactionToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["/api/inv-tx"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete transaction", variant: "destructive" });
    },
  });

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const project = projects.find(p => p.id === tx.projectId);
      const matchesSearch = project?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (tx.note && tx.note.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesProject = projectFilter === "all" || tx.projectId === projectFilter;
      const matchesDirection = directionFilter === "all" || tx.direction === directionFilter;
      
      return matchesSearch && matchesProject && matchesDirection;
    });
  }, [transactions, projects, searchTerm, projectFilter, directionFilter]);

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency === 'BDT' ? 'USD' : currency,
      minimumFractionDigits: 2,
    }).format(amount).replace('$', currency === 'BDT' ? '৳' : '$');
  };

  const onCreateTransaction = (data: InsertInvTx) => {
    const amount = parseFloat(data.amount);
    const fxRate = parseFloat(data.fxRate);
    const amountBase = (amount * fxRate).toString();
    
    const submissionData = {
      ...data,
      amountBase
    };
    
    createMutation.mutate(submissionData);
  };

  const onEditTransaction = (data: InsertInvTx) => {
    if (!editingTransaction) return;
    
    const amount = parseFloat(data.amount);
    const fxRate = parseFloat(data.fxRate);
    const amountBase = (amount * fxRate).toString();
    
    const submissionData = {
      ...data,
      amountBase
    };
    
    updateMutation.mutate({ id: editingTransaction.id, data: submissionData });
  };

  const handleEdit = (transaction: InvTx) => {
    setEditingTransaction(transaction);
    editForm.reset({
      projectId: transaction.projectId,
      categoryId: transaction.categoryId,
      date: transaction.date,
      direction: transaction.direction,
      currency: transaction.currency,
      fxRate: transaction.fxRate,
      accountId: transaction.accountId,
      amount: transaction.amount,
      amountBase: transaction.amountBase,
      note: transaction.note || "",
    });
    setIsEditModalOpen(true);
  };

  const handleDelete = (transaction: InvTx) => {
    setTransactionToDelete(transaction);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (transactionToDelete) {
      deleteMutation.mutate(transactionToDelete.id);
    }
  };

  const handleExportCSV = () => {
    const csvHeaders = ["Date", "Project", "Category", "Type", "Amount", "Currency", "Account", "Note"];
    const csvRows = filteredTransactions.map(tx => {
      const project = projects.find(p => p.id === tx.projectId);
      const category = categories.find(c => c.id === tx.categoryId);
      const account = accounts.find(a => a.id === tx.accountId);
      
      return [
        tx.date,
        project?.name || "",
        category?.name || "",
        tx.direction === "income" ? "Income" : "Cost",
        tx.amount,
        tx.currency,
        account?.name || "",
        tx.note || ""
      ].map(field => `"${field}"`).join(",");
    });

    const csvContent = [csvHeaders.join(","), ...csvRows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `investment-transactions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast({ title: "Success", description: "Transactions exported successfully" });
  };

  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      const lines = text.split("\n");
      const headers = lines[0].split(",");
      
      const importData: InsertInvTx[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        const values = lines[i].match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g) || [];
        const cleanValues = values.map(v => v.replace(/^"|"$/g, "").trim());
        
        const [date, projectName, categoryName, type, amount, currency, accountName, note] = cleanValues;
        
        const project = projects.find(p => p.name === projectName);
        const category = categories.find(c => c.name === categoryName);
        const account = accounts.find(a => a.name === accountName);
        
        if (project && category && account) {
          importData.push({
            date,
            projectId: project.id,
            categoryId: category.id,
            direction: type === "Income" ? "income" : "cost",
            amount,
            currency: currency || "BDT",
            fxRate: "1",
            accountId: account.id,
            amountBase: amount,
            note: note || "",
          });
        }
      }

      for (const data of importData) {
        try {
          await apiRequest('POST', '/api/inv-tx', data);
        } catch (error) {
          console.error("Failed to import transaction:", error);
        }
      }

      queryClient.invalidateQueries({ queryKey: ["/api/inv-tx"] });
      toast({ title: "Success", description: `Imported ${importData.length} transactions` });
    };
    
    reader.readAsText(file);
    event.target.value = "";
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Investment Transactions</h1>
          <p className="text-sm text-gray-600 mt-1">Manage investment costs and income</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExportCSV} data-testid="button-export-csv">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <label htmlFor="csv-import" className="cursor-pointer">
            <Button variant="outline" asChild data-testid="button-import-csv">
              <span>
                <Upload className="h-4 w-4 mr-2" />
                Import CSV
              </span>
            </Button>
          </label>
          <input
            id="csv-import"
            type="file"
            accept=".csv"
            onChange={handleImportCSV}
            className="hidden"
            data-testid="input-csv-file"
          />
          <Button onClick={() => setIsCreateModalOpen(true)} data-testid="button-new-transaction">
            <Plus className="h-4 w-4 mr-2" />
            New Transaction
          </Button>
        </div>
      </div>

      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Transaction</DialogTitle>
            </DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(onCreateTransaction)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={createForm.control}
                    name="projectId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select project" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {projects.map(project => (
                              <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={createForm.control}
                    name="direction"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="cost">Investment Cost</SelectItem>
                            <SelectItem value="income">Investment Income</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={createForm.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map(category => (
                            <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={createForm.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="0.00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={createForm.control}
                    name="currency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Currency</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select currency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="BDT">BDT</SelectItem>
                            <SelectItem value="USD">USD</SelectItem>
                            <SelectItem value="USDT">USDT</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={createForm.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={createForm.control}
                    name="accountId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select account" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {accounts.map(account => (
                              <SelectItem key={account.id} value={account.id}>
                                {account.name} ({account.currency})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={createForm.control}
                  name="note"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Note</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Transaction details" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Creating..." : "Create Transaction"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search transactions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by project" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map(project => (
              <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={directionFilter} onValueChange={setDirectionFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="cost">Investment Cost</SelectItem>
            <SelectItem value="income">Investment Income</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4 flex-1">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))
        ) : filteredTransactions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No transactions found</p>
          </div>
        ) : (
          filteredTransactions.map((transaction) => {
            const project = projects.find(p => p.id === transaction.projectId);
            const account = accounts.find(a => a.id === transaction.accountId);
            return (
              <Card key={transaction.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1">
                      <div className={`p-2 rounded-full ${
                        transaction.direction === 'income' ? 'bg-green-100' : 'bg-blue-100'
                      }`}>
                        {transaction.direction === 'income' ? 
                          <ArrowUpRight className="h-4 w-4 text-green-600" /> :
                          <ArrowDownLeft className="h-4 w-4 text-blue-600" />
                        }
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{project?.name}</p>
                        <p className="text-sm text-gray-500">{transaction.note || 'No description'}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {transaction.direction === 'income' ? 'Income' : 'Cost'}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {account?.name} • {new Date(transaction.date).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className={`text-lg font-bold ${
                          transaction.direction === 'income' ? 'text-green-600' : 'text-blue-600'
                        }`}>
                          {transaction.direction === 'income' ? '+' : '-'}{formatCurrency(parseFloat(transaction.amount), transaction.currency)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {transaction.currency !== financeSettings?.baseCurrency && (
                            <>Base: {formatCurrency(parseFloat(transaction.amountBase), financeSettings?.baseCurrency)}</>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(transaction)}
                          data-testid={`button-edit-${transaction.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(transaction)}
                          data-testid={`button-delete-${transaction.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Edit Transaction Dialog */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Transaction</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditTransaction)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="projectId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-project">
                            <SelectValue placeholder="Select project" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {projects.map(project => (
                            <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="direction"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-direction">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="cost">Investment Cost</SelectItem>
                          <SelectItem value="income">Investment Income</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={editForm.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-category">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map(category => (
                          <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0.00" {...field} data-testid="input-edit-amount" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-currency">
                            <SelectValue placeholder="Select currency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="BDT">BDT</SelectItem>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="USDT">USDT</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-edit-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="accountId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-account">
                            <SelectValue placeholder="Select account" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {accounts.map(account => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.name} ({account.currency})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={editForm.control}
                name="note"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Note</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Transaction details" {...field} value={field.value || ""} data-testid="textarea-edit-note" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)} data-testid="button-cancel-edit">
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMutation.isPending} data-testid="button-save-edit">
                  {updateMutation.isPending ? "Updating..." : "Update Transaction"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this transaction? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}