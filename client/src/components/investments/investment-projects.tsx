import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Filter, Edit, Eye, Activity, Target, TrendingUp, Calendar, Trash2 } from "lucide-react";
import { InvProject, InvTx, InvPayout, InvCategory, Account, ExchangeRate, SettingsFinance } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertInvProjectSchema, type InsertInvProject } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type ProjectWithStats = InvProject & {
  totalInvested: number;
  totalReturns: number;
  netProfit: number;
  transactionCount: number;
  payoutCount: number;
  lastActivity?: Date;
};

export default function InvestmentProjects() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedProject, setSelectedProject] = useState<ProjectWithStats | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<InvProject | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch data
  const { data: projects = [], isLoading: projectsLoading, refetch: refetchProjects } = useQuery<InvProject[]>({
    queryKey: ["/api/inv-projects"],
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const { data: transactions = [] } = useQuery<InvTx[]>({
    queryKey: ["/api/inv-tx"],
  });

  const { data: payouts = [] } = useQuery<InvPayout[]>({
    queryKey: ["/api/inv-payouts"],
  });

  const { data: categories = [] } = useQuery<InvCategory[]>({
    queryKey: ["/api/inv-categories"],
  });

  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ["/api/accounts"],
  });

  const { data: exchangeRates = [] } = useQuery<ExchangeRate[]>({
    queryKey: ["/api/exchange-rates"],
  });

  const { data: financeSettings } = useQuery<SettingsFinance>({
    queryKey: ["/api/settings/finance"],
    initialData: { id: '', baseCurrency: 'BDT', allowNegativeBalances: true, updatedAt: null }
  });

  // Currency conversion helper (reuse from overview)
  const convertCurrency = (amount: number, fromCurrency: string, toCurrency: string): number | null => {
    if (fromCurrency === toCurrency) {
      return amount;
    }

    const directRate = exchangeRates.find(r => 
      r.fromCurrency === fromCurrency && r.toCurrency === toCurrency
    );

    if (directRate) {
      return amount * parseFloat(directRate.rate);
    }

    const inverseRate = exchangeRates.find(r => 
      r.fromCurrency === toCurrency && r.toCurrency === fromCurrency
    );

    if (inverseRate) {
      return amount / parseFloat(inverseRate.rate);
    }

    return null;
  };

  // Create form
  const createForm = useForm<InsertInvProject>({
    resolver: zodResolver(insertInvProjectSchema),
    defaultValues: {
      name: "",
      type: "other",
      startDate: new Date().toISOString().split('T')[0],
      status: "active",
      currency: financeSettings?.baseCurrency || "BDT",
      initialAmount: "0",
      notes: "",
    },
  });

  // Edit form
  const editForm = useForm<InsertInvProject>({
    resolver: zodResolver(insertInvProjectSchema),
  });

  // Create project mutation
  const createProjectMutation = useMutation({
    mutationFn: (data: InsertInvProject) => apiRequest('POST', '/api/inv-projects', data),
    onSuccess: () => {
      toast({ title: "Success", description: "Project created successfully" });
      setIsCreateModalOpen(false);
      createForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/inv-projects"] });
      refetchProjects();
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to create project",
        variant: "destructive"
      });
    },
  });

  // Update project mutation
  const updateProjectMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: InsertInvProject }) => 
      apiRequest('PUT', `/api/inv-projects/${id}`, data),
    onSuccess: () => {
      toast({ title: "Success", description: "Project updated successfully" });
      setEditingProject(null);
      editForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/inv-projects"] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to update project",
        variant: "destructive"
      });
    },
  });

  // Delete project mutation
  const deleteProjectMutation = useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/inv-projects/${id}`, undefined),
    onSuccess: () => {
      toast({ title: "Success", description: "Project deleted successfully" });
      setSelectedProject(null);
      setEditingProject(null);
      queryClient.invalidateQueries({ queryKey: ["/api/inv-projects"] });
      refetchProjects();
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to delete project",
        variant: "destructive"
      });
    },
  });

  // Calculate project statistics
  const projectsWithStats = useMemo((): ProjectWithStats[] => {
    const baseCurrency = financeSettings?.baseCurrency || 'BDT';
    
    return projects.map(project => {
      const projectTransactions = transactions.filter(tx => tx.projectId === project.id);
      const projectPayouts = payouts.filter(p => p.projectId === project.id);
      
      // Calculate invested amount (initial amount + cost transactions)
      const initialAmount = convertCurrency(parseFloat(project.initialAmount), project.currency, baseCurrency) || 0;
      const transactionsCost = projectTransactions
        .filter(tx => tx.direction === 'cost')
        .reduce((sum, tx) => {
          const convertedAmount = convertCurrency(parseFloat(tx.amount), tx.currency, baseCurrency);
          return sum + (convertedAmount || 0);
        }, 0);
      const totalInvested = initialAmount + transactionsCost;

      // Calculate returns (income transactions)
      const totalReturns = projectTransactions
        .filter(tx => tx.direction === 'income')
        .reduce((sum, tx) => {
          const convertedAmount = convertCurrency(parseFloat(tx.amount), tx.currency, baseCurrency);
          return sum + (convertedAmount || 0);
        }, 0);

      const netProfit = totalReturns - totalInvested;
      
      // Find last activity
      const allActivities = [
        ...projectTransactions.map(tx => tx.createdAt).filter(Boolean),
        ...projectPayouts.map(p => p.createdAt).filter(Boolean)
      ];
      const lastActivity = allActivities.length > 0 
        ? new Date(Math.max(...allActivities.map(d => new Date(d!).getTime())))
        : undefined;

      return {
        ...project,
        totalInvested,
        totalReturns,
        netProfit,
        transactionCount: projectTransactions.length,
        payoutCount: projectPayouts.length,
        lastActivity,
      };
    });
  }, [projects, transactions, payouts, exchangeRates, financeSettings]);

  // Filter projects
  const filteredProjects = useMemo(() => {
    return projectsWithStats.filter(project => {
      const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (project.notes && project.notes.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = statusFilter === "all" || project.status === statusFilter;
      const matchesType = typeFilter === "all" || project.type === typeFilter;
      
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [projectsWithStats, searchTerm, statusFilter, typeFilter]);

  const formatCurrency = (amount: number, currency: string = financeSettings?.baseCurrency || 'BDT') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency === 'BDT' ? 'USD' : currency,
      minimumFractionDigits: 2,
    }).format(amount).replace('$', currency === 'BDT' ? '৳' : '$');
  };

  const onCreateProject = (data: InsertInvProject) => {
    createProjectMutation.mutate(data);
  };

  const onEditProject = (data: InsertInvProject) => {
    if (editingProject) {
      updateProjectMutation.mutate({ id: editingProject.id, data });
    }
  };

  const openEditModal = (project: InvProject) => {
    setEditingProject(project);
    editForm.reset({
      name: project.name,
      type: project.type,
      startDate: project.startDate,
      status: project.status,
      currency: project.currency,
      initialAmount: project.initialAmount,
      notes: project.notes || "",
    });
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900" data-testid="text-projects-title">
            Investment Projects
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage your investment projects and track performance
          </p>
        </div>
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-project">
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
            </DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(onCreateProject)} className="space-y-4">
                <FormField
                  control={createForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter project name" {...field} data-testid="input-project-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={createForm.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-project-type">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="gher">Gher</SelectItem>
                            <SelectItem value="capital">Capital</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
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
                            <SelectTrigger data-testid="select-project-currency">
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

                <FormField
                  control={createForm.control}
                  name="initialAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Initial Investment Amount</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          min="0"
                          placeholder="0.00" 
                          {...field} 
                          data-testid="input-initial-amount"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createForm.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-start-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Project description or notes" 
                          {...field} 
                          value={field.value || ""}
                          data-testid="textarea-project-notes"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createProjectMutation.isPending}
                    data-testid="button-save-project"
                  >
                    {createProjectMutation.isPending ? "Creating..." : "Create Project"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-search-projects"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48" data-testid="select-status-filter">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-48" data-testid="select-type-filter">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="gher">Gher</SelectItem>
            <SelectItem value="capital">Capital</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 flex-1">
        {projectsLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : filteredProjects.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
            <Target className="h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No projects found</h3>
            <p className="text-gray-500 mb-6">
              {searchTerm || statusFilter !== "all" || typeFilter !== "all"
                ? "Try adjusting your search or filters"
                : "Create your first investment project to get started"
              }
            </p>
            {!searchTerm && statusFilter === "all" && typeFilter === "all" && (
              <Button onClick={() => setIsCreateModalOpen(true)} data-testid="button-create-first-project">
                <Plus className="h-4 w-4 mr-2" />
                Create Project
              </Button>
            )}
          </div>
        ) : (
          filteredProjects.map((project) => (
            <Card 
              key={project.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedProject(project)}
              data-testid={`card-project-${project.id}`}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg font-medium line-clamp-1">
                      {project.name}
                    </CardTitle>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                      {project.notes || "No description"}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditModal(project);
                    }}
                    data-testid={`button-edit-project-${project.id}`}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Are you sure you want to delete "${project.name}"? This action cannot be undone.`)) {
                        deleteProjectMutation.mutate(project.id);
                      }
                    }}
                    data-testid={`button-delete-project-${project.id}`}
                    disabled={deleteProjectMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="text-xs">
                    {project.type}
                  </Badge>
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${
                      project.status === 'active' 
                        ? 'text-green-600 border-green-200' 
                        : 'text-gray-600'
                    }`}
                  >
                    {project.status}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {project.currency}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Invested</p>
                    <p className="font-medium text-blue-600">
                      {formatCurrency(project.totalInvested, project.currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Returns</p>
                    <p className={`font-medium ${
                      project.totalReturns > 0 ? 'text-green-600' : 'text-gray-600'
                    }`}>
                      {formatCurrency(project.totalReturns, project.currency)}
                    </p>
                  </div>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">Net Profit/Loss</p>
                  <p className={`font-bold ${
                    project.netProfit >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(project.netProfit, project.currency)}
                  </p>
                  {project.totalInvested > 0 && (
                    <p className="text-xs text-gray-500">
                      ROI: {((project.netProfit / project.totalInvested) * 100).toFixed(1)}%
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>{project.transactionCount} transactions</span>
                  <span>{project.payoutCount} payouts</span>
                </div>
                
                {project.lastActivity && (
                  <div className="flex items-center text-xs text-gray-500">
                    <Activity className="h-3 w-3 mr-1" />
                    Last activity: {project.lastActivity.toLocaleDateString()}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Project Detail Modal */}
      <Dialog open={!!selectedProject} onOpenChange={() => setSelectedProject(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <span>{selectedProject?.name}</span>
              <Badge variant="outline" className={
                selectedProject?.status === 'active' 
                  ? 'text-green-600 border-green-200' 
                  : 'text-gray-600'
              }>
                {selectedProject?.status}
              </Badge>
            </DialogTitle>
          </DialogHeader>
          
          {selectedProject && (
            <div className="space-y-6">
              {/* Project Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Type</p>
                  <p className="font-medium">{selectedProject.type}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Currency</p>
                  <p className="font-medium">{selectedProject.currency}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Start Date</p>
                  <p className="font-medium">
                    {new Date(selectedProject.startDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Created</p>
                  <p className="font-medium">
                    {selectedProject.createdAt 
                      ? new Date(selectedProject.createdAt).toLocaleDateString()
                      : 'N/A'
                    }
                  </p>
                </div>
              </div>

              {/* Description */}
              {selectedProject.notes && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">Description</p>
                  <p className="text-sm bg-gray-50 p-3 rounded-lg">{selectedProject.notes}</p>
                </div>
              )}

              {/* Financial Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="text-sm text-gray-500">Total Invested</p>
                        <p className="text-lg font-bold text-blue-600">
                          {formatCurrency(selectedProject.totalInvested, selectedProject.currency)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center space-x-2">
                      <Target className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="text-sm text-gray-500">Total Returns</p>
                        <p className="text-lg font-bold text-green-600">
                          {formatCurrency(selectedProject.totalReturns, selectedProject.currency)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center space-x-2">
                      <Activity className={`h-5 w-5 ${selectedProject.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                      <div>
                        <p className="text-sm text-gray-500">Net Profit/Loss</p>
                        <p className={`text-lg font-bold ${
                          selectedProject.netProfit >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {formatCurrency(selectedProject.netProfit, selectedProject.currency)}
                        </p>
                        {selectedProject.totalInvested > 0 && (
                          <p className="text-xs text-gray-500">
                            ROI: {((selectedProject.netProfit / selectedProject.totalInvested) * 100).toFixed(1)}%
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Activity Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{selectedProject.transactionCount}</p>
                  <p className="text-sm text-gray-500">Transactions</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{selectedProject.payoutCount}</p>
                  <p className="text-sm text-gray-500">Payouts</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-2xl font-bold text-purple-600">
                    {transactions.filter(tx => tx.projectId === selectedProject.id && tx.direction === 'cost').length}
                  </p>
                  <p className="text-sm text-gray-500">Investments</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-2xl font-bold text-orange-600">
                    {transactions.filter(tx => tx.projectId === selectedProject.id && tx.direction === 'income').length}
                  </p>
                  <p className="text-sm text-gray-500">Income</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button variant="outline" onClick={() => openEditModal(selectedProject)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Project
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    if (confirm(`Are you sure you want to delete "${selectedProject?.name}"? This action cannot be undone.`)) {
                      deleteProjectMutation.mutate(selectedProject!.id);
                    }
                  }}
                  disabled={deleteProjectMutation.isPending}
                  data-testid={`button-delete-modal-${selectedProject?.id}`}
                  className="border-red-200 text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {deleteProjectMutation.isPending ? "Deleting..." : "Delete Project"}
                </Button>
                <Button onClick={() => {
                  // Navigation to transactions page with project filter would go here
                  setSelectedProject(null);
                }}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Transactions
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Project Modal */}
      <Dialog open={!!editingProject} onOpenChange={() => setEditingProject(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditProject)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter project name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="gher">Gher</SelectItem>
                          <SelectItem value="capital">Capital</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
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
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
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

                <FormField
                  control={editForm.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={editForm.control}
                name="initialAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Initial Investment Amount</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01" 
                        min="0"
                        placeholder="0.00" 
                        {...field} 
                        data-testid="input-edit-initial-amount"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Project description or notes" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setEditingProject(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateProjectMutation.isPending}>
                  {updateProjectMutation.isPending ? "Updating..." : "Update Project"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}