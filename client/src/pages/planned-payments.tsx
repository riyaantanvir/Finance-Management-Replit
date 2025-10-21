import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash2, Plus, DollarSign, Calendar, Tag as TagIcon } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { PlannedPayment, Tag, InsertPlannedPayment } from "@shared/schema";

export default function PlannedPayments() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<PlannedPayment | null>(null);
  const [selectedTag, setSelectedTag] = useState<string>("");
  const [selectedFrequency, setSelectedFrequency] = useState<"monthly" | "weekly" | "daily" | "custom">("monthly");

  const { data: plannedPayments, isLoading: isLoadingPayments } = useQuery<PlannedPayment[]>({
    queryKey: ["/api/planned-payments"],
  });

  const { data: tags } = useQuery<Tag[]>({
    queryKey: ["/api/tags"],
  });

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

      <div className="grid gap-4">
        {plannedPayments && plannedPayments.length > 0 ? (
          plannedPayments.map((payment) => (
            <Card key={payment.id} data-testid={`card-planned-payment-${payment.id}`}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      <TagIcon className="h-5 w-5" />
                      {payment.tag}
                    </CardTitle>
                    <CardDescription className="mt-2 space-y-1">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        <span className="font-semibold">${parseFloat(payment.amount).toFixed(2)}</span>
                        <span className="text-xs">/ {payment.frequency}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span className="text-xs">
                          {new Date(payment.startDate).toLocaleDateString()}
                          {payment.endDate && ` - ${new Date(payment.endDate).toLocaleDateString()}`}
                        </span>
                      </div>
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingPayment(payment)}
                      data-testid={`button-edit-${payment.id}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm(`Delete planned payment for ${payment.tag}?`)) {
                          deleteMutation.mutate(payment.id);
                        }
                      }}
                      data-testid={`button-delete-${payment.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
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
    </div>
  );
}
