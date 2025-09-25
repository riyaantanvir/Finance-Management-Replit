import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Settings, DollarSign, Edit, Trash2 } from "lucide-react";
import { InvCategory, SettingsFinance } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertInvCategorySchema, type InsertInvCategory } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function InvestmentSettings() {
  const [isCreateCategoryModalOpen, setIsCreateCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<InvCategory | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: categories = [], isLoading: categoriesLoading } = useQuery<InvCategory[]>({
    queryKey: ["/api/investments/categories"],
  });

  const { data: financeSettings } = useQuery<SettingsFinance>({
    queryKey: ["/api/settings/finance"],
    initialData: { id: '', baseCurrency: 'BDT', allowNegativeBalances: true, updatedAt: null }
  });

  const createCategoryForm = useForm<InsertInvCategory>({
    resolver: zodResolver(insertInvCategorySchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const editCategoryForm = useForm<InsertInvCategory>({
    resolver: zodResolver(insertInvCategorySchema),
  });

  const createCategoryMutation = useMutation({
    mutationFn: (data: InsertInvCategory) => apiRequest('/api/investments/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      toast({ title: "Success", description: "Category created successfully" });
      setIsCreateCategoryModalOpen(false);
      createCategoryForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/investments/categories"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create category", variant: "destructive" });
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: InsertInvCategory }) => 
      apiRequest(`/api/investments/categories/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      toast({ title: "Success", description: "Category updated successfully" });
      setEditingCategory(null);
      editCategoryForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/investments/categories"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update category", variant: "destructive" });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/investments/categories/${id}`, {
      method: 'DELETE',
    }),
    onSuccess: () => {
      toast({ title: "Success", description: "Category deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/investments/categories"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete category", variant: "destructive" });
    },
  });

  const openEditCategoryModal = (category: InvCategory) => {
    setEditingCategory(category);
    editCategoryForm.reset({
      name: category.name,
      description: category.description || "",
    });
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 p-4 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Investment Settings</h1>
        <p className="text-sm text-gray-600 mt-1">Configure investment categories and preferences</p>
      </div>

      {/* Finance Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <DollarSign className="h-5 w-5" />
            <span>Currency Settings</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-500 mb-2">Base Currency</p>
              <Badge variant="outline" className="text-lg px-3 py-1">
                {financeSettings?.baseCurrency || 'BDT'}
              </Badge>
              <p className="text-xs text-gray-500 mt-1">
                All investment calculations are converted to this base currency
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-2">Supported Currencies</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">BDT</Badge>
                <Badge variant="outline">USD</Badge>
                <Badge variant="outline">USDT</Badge>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Configure exchange rates in Fund Management → Settings
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Investment Categories */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <span>Investment Categories</span>
            </div>
            <Dialog open={isCreateCategoryModalOpen} onOpenChange={setIsCreateCategoryModalOpen}>
              <Button onClick={() => setIsCreateCategoryModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Category
              </Button>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Investment Category</DialogTitle>
                </DialogHeader>
                <Form {...createCategoryForm}>
                  <form onSubmit={createCategoryForm.handleSubmit((data) => createCategoryMutation.mutate(data))} className="space-y-4">
                    <FormField
                      control={createCategoryForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Technology, Real Estate" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={createCategoryForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Category description (optional)" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end space-x-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => setIsCreateCategoryModalOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={createCategoryMutation.isPending}>
                        {createCategoryMutation.isPending ? "Creating..." : "Create Category"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {categoriesLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="animate-pulse flex items-center justify-between p-4 border rounded-lg">
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/6"></div>
                </div>
              ))}
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-8">
              <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No investment categories found</p>
              <Button onClick={() => setIsCreateCategoryModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Category
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {categories.map((category) => (
                <div key={category.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">{category.name}</p>
                    {category.description && (
                      <p className="text-sm text-gray-500">{category.description}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditCategoryModal(category)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteCategoryMutation.mutate(category.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Category Modal */}
      <Dialog open={!!editingCategory} onOpenChange={() => setEditingCategory(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
          </DialogHeader>
          <Form {...editCategoryForm}>
            <form onSubmit={editCategoryForm.handleSubmit((data) => {
              if (editingCategory) {
                updateCategoryMutation.mutate({ id: editingCategory.id, data });
              }
            })} className="space-y-4">
              <FormField
                control={editCategoryForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Technology, Real Estate" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editCategoryForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Category description (optional)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setEditingCategory(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateCategoryMutation.isPending}>
                  {updateCategoryMutation.isPending ? "Updating..." : "Update Category"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}