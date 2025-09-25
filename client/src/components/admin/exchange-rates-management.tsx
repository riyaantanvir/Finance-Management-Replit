import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { insertExchangeRateSchema, updateExchangeRateSchema, type ExchangeRate, type InsertExchangeRate, type UpdateExchangeRate } from '@shared/schema';
import { Plus, Edit, Trash2, TrendingUp, DollarSign } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

// Common currencies for exchange rate management
const CURRENCIES = [
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'USDT', label: 'USDT - Tether' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'GBP', label: 'GBP - British Pound' },
  { value: 'INR', label: 'INR - Indian Rupee' },
  { value: 'JPY', label: 'JPY - Japanese Yen' },
  { value: 'CNY', label: 'CNY - Chinese Yuan' },
  { value: 'CAD', label: 'CAD - Canadian Dollar' },
  { value: 'AUD', label: 'AUD - Australian Dollar' },
];

export function ExchangeRatesManagement() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingExchangeRate, setEditingExchangeRate] = useState<ExchangeRate | null>(null);

  const { data: exchangeRates = [], isLoading } = useQuery<ExchangeRate[]>({
    queryKey: ['/api/exchange-rates'],
  });

  const createExchangeRateMutation = useMutation({
    mutationFn: async (exchangeRateData: InsertExchangeRate) => {
      const response = await fetch('/api/exchange-rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exchangeRateData),
      });
      if (!response.ok) throw new Error('Failed to create exchange rate');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/exchange-rates'] });
      setIsCreateDialogOpen(false);
      toast({ title: 'Success', description: 'Exchange rate created successfully' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to create exchange rate', variant: 'destructive' });
    },
  });

  const updateExchangeRateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateExchangeRate }) => {
      const response = await fetch(`/api/exchange-rates/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update exchange rate');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/exchange-rates'] });
      setEditingExchangeRate(null);
      toast({ title: 'Success', description: 'Exchange rate updated successfully' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update exchange rate', variant: 'destructive' });
    },
  });

  const deleteExchangeRateMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/exchange-rates/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete exchange rate');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/exchange-rates'] });
      toast({ title: 'Success', description: 'Exchange rate deleted successfully' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to delete exchange rate', variant: 'destructive' });
    },
  });

  const createForm = useForm<InsertExchangeRate>({
    resolver: zodResolver(insertExchangeRateSchema),
    defaultValues: {
      fromCurrency: 'USD',
      toCurrency: 'BDT',
      rate: '0',
    },
  });

  const editForm = useForm<UpdateExchangeRate>({
    resolver: zodResolver(updateExchangeRateSchema),
    defaultValues: {
      rate: '0',
    },
  });

  const handleCreate = (data: InsertExchangeRate) => {
    createExchangeRateMutation.mutate(data);
  };

  const handleEdit = (exchangeRate: ExchangeRate) => {
    setEditingExchangeRate(exchangeRate);
    editForm.reset({
      rate: exchangeRate.rate,
    });
  };

  const handleUpdate = (data: UpdateExchangeRate) => {
    if (editingExchangeRate) {
      updateExchangeRateMutation.mutate({ id: editingExchangeRate.id, data });
    }
  };

  const handleDelete = (id: string) => {
    deleteExchangeRateMutation.mutate(id);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Exchange Rates Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Exchange Rates Management</span>
          </CardTitle>
          <CardDescription>
            Manage currency exchange rates for multi-currency transactions
          </CardDescription>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-exchange-rate">
              <Plus className="h-4 w-4 mr-2" />
              Add Exchange Rate
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Exchange Rate</DialogTitle>
              <DialogDescription>
                Add a new currency exchange rate
              </DialogDescription>
            </DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(handleCreate)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={createForm.control}
                    name="fromCurrency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>From Currency</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-from-currency">
                              <SelectValue placeholder="Select currency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {CURRENCIES.map((currency) => (
                              <SelectItem key={currency.value} value={currency.value}>
                                {currency.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="toCurrency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>To Currency</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-to-currency">
                              <SelectValue placeholder="Select currency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="BDT">BDT - Bangladeshi Taka</SelectItem>
                            {CURRENCIES.map((currency) => (
                              <SelectItem key={currency.value} value={currency.value}>
                                {currency.label}
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
                  name="rate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Exchange Rate</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          step="0.01"
                          placeholder="e.g., 124.50"
                          data-testid="input-exchange-rate"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value || '0')}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button 
                    type="submit" 
                    disabled={createExchangeRateMutation.isPending}
                    data-testid="button-submit-exchange-rate"
                  >
                    {createExchangeRateMutation.isPending ? 'Creating...' : 'Create Exchange Rate'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {exchangeRates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No exchange rates found. Create your first exchange rate to get started.</p>
            <p className="text-sm mt-2">Example: 1 USD = 124 BDT</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {exchangeRates.map((rate: ExchangeRate) => (
              <Card key={rate.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-4 w-4 text-primary" />
                      <span className="text-lg font-semibold">
                        1 {rate.fromCurrency} = {rate.rate} {rate.toCurrency}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(rate)}
                        data-testid={`button-edit-exchange-rate-${rate.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            data-testid={`button-delete-exchange-rate-${rate.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Exchange Rate</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete the exchange rate "{rate.fromCurrency} to {rate.toCurrency}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(rate.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <Badge variant="outline" className="text-xs">
                      {rate.fromCurrency} → {rate.toCurrency}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Last updated: {rate.updatedAt ? new Date(rate.updatedAt).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={!!editingExchangeRate} onOpenChange={() => setEditingExchangeRate(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Exchange Rate</DialogTitle>
              <DialogDescription>
                Update the exchange rate for {editingExchangeRate?.fromCurrency} to {editingExchangeRate?.toCurrency}
              </DialogDescription>
            </DialogHeader>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(handleUpdate)} className="space-y-4">
                <FormField
                  control={editForm.control}
                  name="rate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Exchange Rate (1 {editingExchangeRate?.fromCurrency} = ? {editingExchangeRate?.toCurrency})
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          step="0.01"
                          placeholder="e.g., 124.50"
                          data-testid="input-edit-exchange-rate"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value || '0')}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button 
                    type="submit" 
                    disabled={updateExchangeRateMutation.isPending}
                    data-testid="button-update-exchange-rate"
                  >
                    {updateExchangeRateMutation.isPending ? 'Updating...' : 'Update Exchange Rate'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}