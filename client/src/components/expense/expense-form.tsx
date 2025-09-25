import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { InsertExpense, Tag, PaymentMethod } from "@shared/schema";

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

  // Fetch tags and payment methods from admin panel
  const { data: tags = [] } = useQuery<Tag[]>({
    queryKey: ["/api/tags"],
  });

  const { data: paymentMethods = [] } = useQuery<PaymentMethod[]>({
    queryKey: ["/api/payment-methods"],
  });

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
    <Card className="mb-4 md:mb-6">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg md:text-xl">Add New Entry</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6" data-testid="form-expense">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            <div>
              <Label htmlFor="date" className="text-sm font-medium">Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
                required
                className="mt-1 h-11"
                data-testid="input-date"
              />
            </div>
            
            <div>
              <Label htmlFor="type" className="text-sm font-medium">Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => handleInputChange('type', value)}
                required
              >
                <SelectTrigger className="mt-1 h-11" data-testid="select-type">
                  <SelectValue placeholder="Select Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="amount" className="text-sm font-medium">Amount (BDT)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => handleInputChange('amount', e.target.value)}
                required
                className="mt-1 h-11"
                data-testid="input-amount"
              />
            </div>
            
            <div className="sm:col-span-2">
              <Label htmlFor="details" className="text-sm font-medium">Details</Label>
              <Input
                id="details"
                type="text"
                placeholder="Enter expense/income details"
                value={formData.details}
                onChange={(e) => handleInputChange('details', e.target.value)}
                required
                className="mt-1 h-11"
                data-testid="input-details"
              />
            </div>
            
            <div>
              <Label htmlFor="tag" className="text-sm font-medium">Tag</Label>
              <Select
                value={formData.tag}
                onValueChange={(value) => handleInputChange('tag', value)}
                required
              >
                <SelectTrigger className="mt-1 h-11" data-testid="select-tag">
                  <SelectValue placeholder="Select Tag" />
                </SelectTrigger>
                <SelectContent>
                  {tags.map((tag) => (
                    <SelectItem key={tag.id} value={tag.name}>
                      {tag.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">Select from admin-defined tags</p>
            </div>
            
            <div>
              <Label htmlFor="paymentMethod" className="text-sm font-medium">Payment Method</Label>
              <Select
                value={formData.paymentMethod}
                onValueChange={(value) => handleInputChange('paymentMethod', value)}
                required
              >
                <SelectTrigger className="mt-1 h-11" data-testid="select-payment-method">
                  <SelectValue placeholder="Select Payment Method" />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method.id} value={method.name}>
                      {method.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">Select from admin-defined payment methods</p>
            </div>
          </div>
          
          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              className="bg-black hover:bg-gray-800 text-white w-full sm:w-auto h-11 text-sm md:text-base min-h-[44px]"
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
