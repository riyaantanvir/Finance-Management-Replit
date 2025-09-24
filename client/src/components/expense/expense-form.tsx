import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { InsertExpense } from "@shared/schema";

export default function ExpenseForm() {
  const [formData, setFormData] = useState<InsertExpense>({
    date: new Date().toISOString().split('T')[0],
    type: '',
    details: '',
    amount: '',
    tag: '',
    paymentMethod: '',
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createExpenseMutation = useMutation({
    mutationFn: (data: InsertExpense) => apiRequest("POST", "/api/expenses", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: "Expense entry created successfully",
      });
      setFormData({
        date: new Date().toISOString().split('T')[0],
        type: '',
        details: '',
        amount: '',
        tag: '',
        paymentMethod: '',
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create expense entry",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createExpenseMutation.mutate(formData);
  };

  const handleInputChange = (field: keyof InsertExpense, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Add New Entry</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4" data-testid="form-expense">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
                required
                data-testid="input-date"
              />
            </div>
            
            <div>
              <Label htmlFor="type">Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => handleInputChange('type', value)}
                required
              >
                <SelectTrigger data-testid="select-type">
                  <SelectValue placeholder="Select Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="amount">Amount (BDT)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => handleInputChange('amount', e.target.value)}
                required
                data-testid="input-amount"
              />
            </div>
            
            <div className="md:col-span-2">
              <Label htmlFor="details">Details</Label>
              <Input
                id="details"
                type="text"
                placeholder="Enter expense/income details"
                value={formData.details}
                onChange={(e) => handleInputChange('details', e.target.value)}
                required
                data-testid="input-details"
              />
            </div>
            
            <div>
              <Label htmlFor="tag">Tag</Label>
              <Select
                value={formData.tag}
                onValueChange={(value) => handleInputChange('tag', value)}
                required
              >
                <SelectTrigger data-testid="select-tag">
                  <SelectValue placeholder="Select Tag" />
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
            </div>
            
            <div>
              <Label htmlFor="paymentMethod">Payment Method</Label>
              <Select
                value={formData.paymentMethod}
                onValueChange={(value) => handleInputChange('paymentMethod', value)}
                required
              >
                <SelectTrigger data-testid="select-payment-method">
                  <SelectValue placeholder="Select Method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bkash">Bkash</SelectItem>
                  <SelectItem value="binance">Binance</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="bank">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex justify-end">
            <Button
              type="submit"
              className="bg-black hover:bg-gray-800 text-white"
              disabled={createExpenseMutation.isPending}
              data-testid="button-save-entry"
            >
              {createExpenseMutation.isPending ? "Saving..." : "Save Entry"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
