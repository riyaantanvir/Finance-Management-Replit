import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { insertMainTagSchema, insertSubTagSchema } from '@shared/schema';
import { Plus, Edit, Trash2, ChevronRight, FolderOpen, Tag as TagIcon } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { z } from 'zod';

type MainTag = {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

type SubTag = {
  id: string;
  name: string;
  mainTagId: string;
  description: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export function HierarchicalTagsManagement() {
  const { toast } = useToast();
  const [selectedMainTag, setSelectedMainTag] = useState<MainTag | null>(null);
  const [isMainTagDialogOpen, setIsMainTagDialogOpen] = useState(false);
  const [isSubTagDialogOpen, setIsSubTagDialogOpen] = useState(false);
  const [editingMainTag, setEditingMainTag] = useState<MainTag | null>(null);
  const [editingSubTag, setEditingSubTag] = useState<SubTag | null>(null);

  // Fetch main tags
  const { data: mainTags = [], isLoading: isLoadingMainTags } = useQuery<MainTag[]>({
    queryKey: ['/api/main-tags'],
  });

  // Fetch sub-tags for selected main tag
  const { data: subTags = [], isLoading: isLoadingSubTags } = useQuery<SubTag[]>({
    queryKey: ['/api/sub-tags', selectedMainTag?.id],
    enabled: !!selectedMainTag,
    queryFn: async () => {
      if (!selectedMainTag) return [];
      const response = await fetch(`/api/sub-tags?mainTagId=${selectedMainTag.id}`);
      if (!response.ok) throw new Error('Failed to fetch sub tags');
      return response.json();
    },
  });

  // Main tag mutations
  const createMainTagMutation = useMutation({
    mutationFn: async (data: z.infer<typeof insertMainTagSchema>) => 
      apiRequest('POST', '/api/main-tags', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/main-tags'] });
      setIsMainTagDialogOpen(false);
      toast({ title: 'Success', description: 'Main tag created successfully' });
    },
    onError: () => toast({ title: 'Error', description: 'Failed to create main tag', variant: 'destructive' }),
  });

  const updateMainTagMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<z.infer<typeof insertMainTagSchema>> }) =>
      apiRequest('PUT', `/api/main-tags/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/main-tags'] });
      setEditingMainTag(null);
      toast({ title: 'Success', description: 'Main tag updated successfully' });
    },
    onError: () => toast({ title: 'Error', description: 'Failed to update main tag', variant: 'destructive' }),
  });

  const deleteMainTagMutation = useMutation({
    mutationFn: async (id: string) => apiRequest('DELETE', `/api/main-tags/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/main-tags'] });
      setSelectedMainTag(null);
      toast({ title: 'Success', description: 'Main tag deleted successfully' });
    },
    onError: () => toast({ title: 'Error', description: 'Failed to delete main tag', variant: 'destructive' }),
  });

  // Sub tag mutations
  const createSubTagMutation = useMutation({
    mutationFn: async (data: z.infer<typeof insertSubTagSchema>) =>
      apiRequest('POST', '/api/sub-tags', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sub-tags', selectedMainTag?.id] });
      setIsSubTagDialogOpen(false);
      toast({ title: 'Success', description: 'Sub-tag created successfully' });
    },
    onError: () => toast({ title: 'Error', description: 'Failed to create sub-tag', variant: 'destructive' }),
  });

  const updateSubTagMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<z.infer<typeof insertSubTagSchema>> }) =>
      apiRequest('PUT', `/api/sub-tags/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sub-tags', selectedMainTag?.id] });
      setEditingSubTag(null);
      toast({ title: 'Success', description: 'Sub-tag updated successfully' });
    },
    onError: () => toast({ title: 'Error', description: 'Failed to update sub-tag', variant: 'destructive' }),
  });

  const deleteSubTagMutation = useMutation({
    mutationFn: async (id: string) => apiRequest('DELETE', `/api/sub-tags/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sub-tags', selectedMainTag?.id] });
      toast({ title: 'Success', description: 'Sub-tag deleted successfully' });
    },
    onError: () => toast({ title: 'Error', description: 'Failed to delete sub-tag', variant: 'destructive' }),
  });

  // Forms
  const mainTagForm = useForm<z.infer<typeof insertMainTagSchema>>({
    resolver: zodResolver(insertMainTagSchema),
    defaultValues: { name: '', description: '' },
  });

  const editMainTagForm = useForm<Partial<z.infer<typeof insertMainTagSchema>>>({
    defaultValues: { name: '', description: '' },
  });

  const subTagForm = useForm<z.infer<typeof insertSubTagSchema>>({
    resolver: zodResolver(insertSubTagSchema),
    defaultValues: { name: '', mainTagId: '', description: '' },
  });

  const editSubTagForm = useForm<Partial<z.infer<typeof insertSubTagSchema>>>({
    defaultValues: { name: '', description: '' },
  });

  const handleCreateMainTag = (data: z.infer<typeof insertMainTagSchema>) => {
    createMainTagMutation.mutate(data);
    mainTagForm.reset();
  };

  const handleEditMainTag = (tag: MainTag) => {
    setEditingMainTag(tag);
    editMainTagForm.reset({ name: tag.name, description: tag.description || '' });
  };

  const handleUpdateMainTag = (data: Partial<z.infer<typeof insertMainTagSchema>>) => {
    if (editingMainTag) {
      updateMainTagMutation.mutate({ id: editingMainTag.id, data });
    }
  };

  const handleCreateSubTag = (data: z.infer<typeof insertSubTagSchema>) => {
    if (!selectedMainTag) return;
    createSubTagMutation.mutate({ ...data, mainTagId: selectedMainTag.id });
    subTagForm.reset();
  };

  const handleEditSubTag = (tag: SubTag) => {
    setEditingSubTag(tag);
    editSubTagForm.reset({ name: tag.name, description: tag.description || '' });
  };

  const handleUpdateSubTag = (data: Partial<z.infer<typeof insertSubTagSchema>>) => {
    if (editingSubTag) {
      updateSubTagMutation.mutate({ id: editingSubTag.id, data });
    }
  };

  if (isLoadingMainTags) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Hierarchical Tags</CardTitle>
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
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Hierarchical Tag System</CardTitle>
            <CardDescription>
              Create main categories and sub-categories for detailed expense tracking
            </CardDescription>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Main Tags Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5" />
                Main Categories
              </CardTitle>
              <CardDescription>Top-level expense categories</CardDescription>
            </div>
            <Dialog open={isMainTagDialogOpen} onOpenChange={setIsMainTagDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" data-testid="button-add-main-tag">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Main Tag
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Main Category</DialogTitle>
                  <DialogDescription>
                    Add a new top-level expense category (e.g., "Family bazer", "Transportation")
                  </DialogDescription>
                </DialogHeader>
                <Form {...mainTagForm}>
                  <form onSubmit={mainTagForm.handleSubmit(handleCreateMainTag)} className="space-y-4">
                    <FormField
                      control={mainTagForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Family bazer" data-testid="input-main-tag-name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={mainTagForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description (Optional)</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Description" data-testid="input-main-tag-description" {...field} value={field.value || ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <DialogFooter>
                      <Button type="submit" disabled={createMainTagMutation.isPending} data-testid="button-submit-main-tag">
                        {createMainTagMutation.isPending ? 'Creating...' : 'Create'}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {mainTags.map((tag) => (
                <div
                  key={tag.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedMainTag?.id === tag.id ? 'bg-primary/10 border-primary' : 'hover:bg-muted'
                  }`}
                  onClick={() => setSelectedMainTag(tag)}
                  data-testid={`main-tag-${tag.id}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FolderOpen className="h-4 w-4" />
                      <span className="font-medium">{tag.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleEditMainTag(tag); }} data-testid={`button-edit-main-tag-${tag.id}`}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()} data-testid={`button-delete-main-tag-${tag.id}`}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Main Category</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure? This will also delete all sub-categories under "{tag.name}".
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteMainTagMutation.mutate(tag.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Sub Tags Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TagIcon className="h-5 w-5" />
                Sub-Categories
              </CardTitle>
              <CardDescription>
                {selectedMainTag ? `Under "${selectedMainTag.name}"` : 'Select a main category first'}
              </CardDescription>
            </div>
            {selectedMainTag && (
              <Dialog open={isSubTagDialogOpen} onOpenChange={setIsSubTagDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" data-testid="button-add-sub-tag">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Sub-Tag
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Sub-Category</DialogTitle>
                    <DialogDescription>
                      Add a sub-category under "{selectedMainTag.name}"
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...subTagForm}>
                    <form onSubmit={subTagForm.handleSubmit(handleCreateSubTag)} className="space-y-4">
                      <FormField
                        control={subTagForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Sub-Category Name</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., kacha bazer, fish bazer" data-testid="input-sub-tag-name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={subTagForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description (Optional)</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Description" data-testid="input-sub-tag-description" {...field} value={field.value || ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <DialogFooter>
                        <Button type="submit" disabled={createSubTagMutation.isPending} data-testid="button-submit-sub-tag">
                          {createSubTagMutation.isPending ? 'Creating...' : 'Create'}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            )}
          </CardHeader>
          <CardContent>
            {!selectedMainTag ? (
              <div className="text-center py-12 text-muted-foreground">
                <TagIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a main category to view sub-categories</p>
              </div>
            ) : isLoadingSubTags ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : subTags.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <TagIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No sub-categories yet. Add one to get started.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {subTags.map((tag) => (
                  <div key={tag.id} className="p-3 rounded-lg border hover:bg-muted transition-colors" data-testid={`sub-tag-${tag.id}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{tag.name}</Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleEditSubTag(tag)} data-testid={`button-edit-sub-tag-${tag.id}`}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" data-testid={`button-delete-sub-tag-${tag.id}`}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Sub-Category</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{tag.name}"?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteSubTagMutation.mutate(tag.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Main Tag Dialog */}
      <Dialog open={!!editingMainTag} onOpenChange={() => setEditingMainTag(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Main Category</DialogTitle>
          </DialogHeader>
          <Form {...editMainTagForm}>
            <form onSubmit={editMainTagForm.handleSubmit(handleUpdateMainTag)} className="space-y-4">
              <FormField
                control={editMainTagForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-edit-main-tag-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editMainTagForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} value={field.value || ''} data-testid="input-edit-main-tag-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={updateMainTagMutation.isPending} data-testid="button-update-main-tag">
                  {updateMainTagMutation.isPending ? 'Updating...' : 'Update'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Sub Tag Dialog */}
      <Dialog open={!!editingSubTag} onOpenChange={() => setEditingSubTag(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Sub-Category</DialogTitle>
          </DialogHeader>
          <Form {...editSubTagForm}>
            <form onSubmit={editSubTagForm.handleSubmit(handleUpdateSubTag)} className="space-y-4">
              <FormField
                control={editSubTagForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-edit-sub-tag-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editSubTagForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} value={field.value || ''} data-testid="input-edit-sub-tag-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={updateSubTagMutation.isPending} data-testid="button-update-sub-tag">
                  {updateSubTagMutation.isPending ? 'Updating...' : 'Update'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
