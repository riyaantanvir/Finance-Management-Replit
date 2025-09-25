import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Edit, Trash2, Plus } from "lucide-react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Account, UpdateAccount, PaymentMethod } from "@shared/schema";
import { Input } from "@/components/ui/input";

interface AccountsTableProps {
  accounts: Account[];
  isLoading: boolean;
}

export default function AccountsTable({ accounts, isLoading }: AccountsTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<UpdateAccount>({});
  const [perPage, setPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [showBalances, setShowBalances] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAccountData, setNewAccountData] = useState({
    name: '',
    type: '',
    currency: 'BDT',
    openingBalance: '0',
    paymentAccount: 'none',
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch payment methods for dropdown
  const { data: paymentMethods = [] } = useQuery<PaymentMethod[]>({
    queryKey: ["/api/payment-methods"],
  });

  const updateAccountMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Account> }) =>
      apiRequest("PUT", `/api/accounts/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      setEditingId(null);
      setEditData({});
      toast({
        title: "Success",
        description: "Account updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update account",
        variant: "destructive",
      });
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/accounts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      toast({
        title: "Success",
        description: "Account deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete account",
        variant: "destructive",
      });
    },
  });

  const createAccountMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/accounts", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      setShowAddForm(false);
      setNewAccountData({
        name: '',
        type: '',
        currency: 'BDT',
        openingBalance: '0',
        paymentAccount: 'none',
      });
      toast({
        title: "Success",
        description: "Account created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create account",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (account: Account) => {
    setEditingId(account.id);
    // Only copy editable fields to prevent contamination with readonly fields
    setEditData({
      name: account.name,
      type: account.type,
      status: account.status,
      currentBalance: account.currentBalance,
      currency: account.currency,
      paymentMethodKey: account.paymentMethodKey,
    });
  };

  const handleSaveEdit = () => {
    if (editingId && editData) {
      // Validate required fields
      if (!editData.name || !editData.type || !editData.status || !editData.currency) {
        toast({
          title: "Error",
          description: "Please fill in all required fields",
          variant: "destructive",
        });
        return;
      }

      // Ensure currentBalance is a valid number
      const balanceNum = parseFloat(editData.currentBalance || '0');
      if (isNaN(balanceNum)) {
        toast({
          title: "Error", 
          description: "Please enter a valid balance amount",
          variant: "destructive",
        });
        return;
      }

      // Create clean update payload
      const updateData: UpdateAccount = {
        name: editData.name,
        type: editData.type,
        status: editData.status,
        currentBalance: balanceNum.toString(),
        currency: editData.currency,
        ...(editData.paymentMethodKey !== undefined && { paymentMethodKey: editData.paymentMethodKey }),
      };
      updateAccountMutation.mutate({ id: editingId, data: updateData });
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const handleDelete = (id: string) => {
    deleteAccountMutation.mutate(id);
  };

  const handleCreateAccount = () => {
    if (!newAccountData.name || !newAccountData.type) {
      toast({
        title: "Error",
        description: "Please fill in required fields (Name and Type)",
        variant: "destructive",
      });
      return;
    }

    // Find the selected payment method name to store as paymentMethodKey
    const selectedPaymentMethod = paymentMethods.find(pm => pm.id === newAccountData.paymentAccount);
    
    createAccountMutation.mutate({
      name: newAccountData.name,
      type: newAccountData.type,
      currency: newAccountData.currency,
      openingBalance: newAccountData.openingBalance,
      paymentMethodKey: (newAccountData.paymentAccount === 'none' || !selectedPaymentMethod) ? null : selectedPaymentMethod.name,
    });
  };

  const formatCurrency = (amount: string) => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) return '৳ 0';
    return `৳ ${numAmount.toLocaleString()}`;
  };

  // Pagination
  const totalPages = Math.ceil(accounts.length / perPage);
  const startIndex = (currentPage - 1) * perPage;
  const paginatedAccounts = accounts.slice(startIndex, startIndex + perPage);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Account Management</CardTitle>
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
          <CardTitle>Account Management</CardTitle>
          <div className="flex items-center space-x-2">
            <Button
              onClick={() => setShowBalances(!showBalances)}
              variant="outline"
              size="sm"
              data-testid="button-toggle-balances"
            >
              {showBalances ? "Hide" : "Show"} Balances
            </Button>
            <Button
              size="sm"
              onClick={() => setShowAddForm(true)}
              data-testid="button-add-account"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Account
            </Button>
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
      </CardHeader>
      <CardContent>
        {/* Add Account Form */}
        {showAddForm && (
          <div className="mb-6 p-4 border rounded-lg bg-muted/50">
            <h3 className="text-lg font-medium mb-4">Add New Account</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="text-sm font-medium">Account Name *</label>
                <Input
                  value={newAccountData.name}
                  onChange={(e) => setNewAccountData({ ...newAccountData, name: e.target.value })}
                  placeholder="e.g., Main Cash, Bkash Personal"
                  data-testid="input-new-account-name"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Account Type *</label>
                <Select
                  value={newAccountData.type}
                  onValueChange={(value) => setNewAccountData({ ...newAccountData, type: value })}
                >
                  <SelectTrigger data-testid="select-new-account-type">
                    <SelectValue placeholder="Select Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="mobile_wallet">Mobile Wallet</SelectItem>
                    <SelectItem value="bank_account">Bank Account</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="crypto">Crypto</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Currency</label>
                <Input
                  value={newAccountData.currency}
                  onChange={(e) => setNewAccountData({ ...newAccountData, currency: e.target.value })}
                  placeholder="BDT"
                  data-testid="input-new-account-currency"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Opening Balance</label>
                <Input
                  type="number"
                  step="0.01"
                  value={newAccountData.openingBalance}
                  onChange={(e) => setNewAccountData({ ...newAccountData, openingBalance: e.target.value })}
                  placeholder="0.00"
                  data-testid="input-new-account-balance"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Payment Account</label>
                <Select
                  value={newAccountData.paymentAccount}
                  onValueChange={(value) => setNewAccountData({ ...newAccountData, paymentAccount: value })}
                >
                  <SelectTrigger data-testid="select-new-account-payment-method">
                    <SelectValue placeholder="Select Payment Method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {paymentMethods.map((method) => (
                      <SelectItem key={method.id} value={method.id}>
                        {method.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                onClick={handleCreateAccount}
                disabled={createAccountMutation.isPending}
                data-testid="button-save-new-account"
              >
                {createAccountMutation.isPending ? "Creating..." : "Create Account"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowAddForm(false)}
                data-testid="button-cancel-new-account"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {accounts.length === 0 ? (
          <p className="text-center text-muted-foreground py-8" data-testid="text-no-accounts">
            No accounts found
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Current Balance</TableHead>
                    <TableHead>Currency</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedAccounts.map((account) => (
                    <TableRow key={account.id} data-testid={`row-account-${account.id}`}>
                      <TableCell>
                        {editingId === account.id ? (
                          <Input
                            value={editData.name || ''}
                            onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                            data-testid={`input-edit-name-${account.id}`}
                          />
                        ) : (
                          <span className="font-medium" data-testid={`text-name-${account.id}`}>
                            {account.name}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === account.id ? (
                          <Select
                            value={editData.type || ''}
                            onValueChange={(value) => setEditData({ ...editData, type: value as any })}
                          >
                            <SelectTrigger className="w-32" data-testid={`select-edit-type-${account.id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cash">Cash</SelectItem>
                              <SelectItem value="mobile_wallet">Mobile Wallet</SelectItem>
                              <SelectItem value="bank_account">Bank Account</SelectItem>
                              <SelectItem value="card">Card</SelectItem>
                              <SelectItem value="crypto">Crypto</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="capitalize" data-testid={`text-type-${account.id}`}>
                            {account.type.replace('_', ' ')}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === account.id ? (
                          <Select
                            value={editData.status || ''}
                            onValueChange={(value) => setEditData({ ...editData, status: value as any })}
                          >
                            <SelectTrigger className="w-24" data-testid={`select-edit-status-${account.id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="archived">Archived</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge
                            variant={account.status === 'active' ? 'default' : 'secondary'}
                            className={
                              account.status === 'active'
                                ? 'bg-green-100 text-green-800 hover:bg-green-100'
                                : 'bg-gray-100 text-gray-800 hover:bg-gray-100'
                            }
                            data-testid={`badge-status-${account.id}`}
                          >
                            {account.status}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === account.id ? (
                          <Input
                            type="number"
                            step="0.01"
                            value={editData.currentBalance || ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              // Only update if value is a valid number or empty
                              if (value === '' || !isNaN(parseFloat(value))) {
                                setEditData({ ...editData, currentBalance: value });
                              }
                            }}
                            className="w-32"
                            data-testid={`input-edit-balance-${account.id}`}
                          />
                        ) : (
                          <span className="font-medium" data-testid={`text-balance-${account.id}`}>
                            {showBalances ? formatCurrency(account.currentBalance) : '••••••'}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === account.id ? (
                          <Input
                            value={editData.currency || ''}
                            onChange={(e) => setEditData({ ...editData, currency: e.target.value })}
                            className="w-20"
                            data-testid={`input-edit-currency-${account.id}`}
                          />
                        ) : (
                          <span data-testid={`text-currency-${account.id}`}>{account.currency}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === account.id ? (
                          <Input
                            value={editData.paymentMethodKey || ''}
                            onChange={(e) => setEditData({ ...editData, paymentMethodKey: e.target.value })}
                            className="w-32"
                            data-testid={`input-edit-payment-method-${account.id}`}
                          />
                        ) : (
                          <span data-testid={`text-payment-method-${account.id}`}>
                            {account.paymentMethodKey || 'N/A'}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === account.id ? (
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              onClick={handleSaveEdit}
                              disabled={updateAccountMutation.isPending}
                              data-testid={`button-save-${account.id}`}
                            >
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleCancelEdit}
                              data-testid={`button-cancel-${account.id}`}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(account)}
                              data-testid={`button-edit-${account.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-destructive hover:text-destructive"
                                  data-testid={`button-delete-${account.id}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this account? This action cannot be undone and will affect all related transactions.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel data-testid={`button-cancel-delete-${account.id}`}>
                                    Cancel
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(account.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    data-testid={`button-confirm-delete-${account.id}`}
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
                Showing {startIndex + 1} to {Math.min(startIndex + perPage, accounts.length)} of {accounts.length} accounts
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