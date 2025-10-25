import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Target, TrendingUp, AlertTriangle, CheckCircle, ArrowUp, ArrowDown } from "lucide-react";
import { PlanVsActualSummary } from "@shared/schema";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface PlanVsActualViewProps {
  dateRange: string;
  tag: string;
  startDate?: string;
  endDate?: string;
}

type SortField = "tag" | "planned" | "actual" | "variance" | "savings";
type SortOrder = "asc" | "desc";

export default function PlanVsActualView({ dateRange, tag, startDate, endDate }: PlanVsActualViewProps) {
  const [budgetStatus, setBudgetStatus] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("tag");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  // Build query params
  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    
    if (dateRange && dateRange !== 'all') {
      params.append('dateRange', dateRange);
    }
    if (tag && tag !== 'all') {
      params.append('tag', tag);
    }
    if (budgetStatus && budgetStatus !== 'all') {
      params.append('budgetStatus', budgetStatus);
    }
    if (dateRange === 'custom' && startDate) {
      params.append('startDate', startDate);
    }
    if (dateRange === 'custom' && endDate) {
      params.append('endDate', endDate);
    }
    
    return params.toString();
  }, [dateRange, tag, budgetStatus, startDate, endDate]);

  const { data, isLoading } = useQuery<PlanVsActualSummary>({
    queryKey: ["/api/dashboard/plan-vs-actual", queryParams],
    queryFn: async () => {
      const url = queryParams 
        ? `/api/dashboard/plan-vs-actual?${queryParams}` 
        : '/api/dashboard/plan-vs-actual';
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch plan vs actual data');
      return response.json();
    },
  });

  // Sort categories
  const sortedCategories = useMemo(() => {
    if (!data?.categories) return [];
    
    const sorted = [...data.categories];
    
    sorted.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case "tag":
          comparison = a.tag.localeCompare(b.tag);
          break;
        case "planned":
          comparison = a.planned - b.planned;
          break;
        case "actual":
          comparison = a.actual - b.actual;
          break;
        case "variance":
          comparison = a.variance - b.variance;
          break;
        case "savings":
          comparison = (a.savedAmount - a.exceededAmount) - (b.savedAmount - b.exceededAmount);
          break;
      }
      
      return sortOrder === "asc" ? comparison : -comparison;
    });
    
    return sorted;
  }, [data?.categories, sortField, sortOrder]);

  // Prepare chart data (top 10 categories by actual spending)
  const chartData = useMemo(() => {
    if (!sortedCategories) return [];
    
    return sortedCategories
      .slice(0, 10)
      .map(cat => ({
        name: cat.tag.length > 15 ? cat.tag.substring(0, 15) + '...' : cat.tag,
        Planned: cat.planned,
        Actual: cat.actual
      }));
  }, [sortedCategories]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const formatCurrency = (amount: number) => {
    return `৳${amount.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "over":
        return <Badge variant="destructive" data-testid="badge-over">Over Budget</Badge>;
      case "under":
        return <Badge className="bg-green-600 hover:bg-green-700" data-testid="badge-under">Under Budget</Badge>;
      case "on_track":
        return <Badge variant="secondary" data-testid="badge-on-track">On Track</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-8 text-muted-foreground" data-testid="text-no-data">
        No plan vs actual data available
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="card-total-planned">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Planned
            </CardTitle>
            <Target className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600" data-testid="text-total-planned">
              {formatCurrency(data.totalPlanned)}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-total-actual">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Actual
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600" data-testid="text-total-actual">
              {formatCurrency(data.totalActual)}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-variance">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Variance
            </CardTitle>
            {data.totalVariance >= 0 ? (
              <ArrowDown className="h-4 w-4 text-green-600" />
            ) : (
              <ArrowUp className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${data.totalVariance >= 0 ? 'text-green-600' : 'text-red-600'}`} data-testid="text-variance">
              {formatCurrency(Math.abs(data.totalVariance))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.totalVariance >= 0 ? 'Under budget' : 'Over budget'}
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-status-summary">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Budget Status
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between" data-testid="status-over-count">
                <span className="text-red-600">Over:</span>
                <span className="font-semibold">{data.overBudgetCount}</span>
              </div>
              <div className="flex justify-between" data-testid="status-under-count">
                <span className="text-green-600">Under:</span>
                <span className="font-semibold">{data.underBudgetCount}</span>
              </div>
              <div className="flex justify-between" data-testid="status-on-track-count">
                <span className="text-gray-600">On Track:</span>
                <span className="font-semibold">{data.onTrackCount}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Budget Analysis</CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Filter by Status:</span>
              <Select value={budgetStatus} onValueChange={setBudgetStatus}>
                <SelectTrigger className="w-[150px]" data-testid="select-budget-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="over">Over Budget</SelectItem>
                  <SelectItem value="under">Under Budget</SelectItem>
                  <SelectItem value="on_track">On Track</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {sortedCategories.length === 0 ? (
            <p className="text-center text-muted-foreground py-8" data-testid="text-no-categories">
              No categories found
            </p>
          ) : (
            <div className="space-y-6">
              {/* Comparison Chart */}
              {chartData.length > 0 && (
                <div className="w-full h-64" data-testid="chart-plan-vs-actual">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value: number) => formatCurrency(value)}
                      />
                      <Legend />
                      <Bar dataKey="Planned" fill="#3b82f6" />
                      <Bar dataKey="Actual" fill="#9333ea" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Variance Table */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50" 
                        onClick={() => handleSort("tag")}
                        data-testid="header-tag"
                      >
                        Category {sortField === "tag" && (sortOrder === "asc" ? "↑" : "↓")}
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50" 
                        onClick={() => handleSort("planned")}
                        data-testid="header-planned"
                      >
                        Planned {sortField === "planned" && (sortOrder === "asc" ? "↑" : "↓")}
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50" 
                        onClick={() => handleSort("actual")}
                        data-testid="header-actual"
                      >
                        Actual {sortField === "actual" && (sortOrder === "asc" ? "↑" : "↓")}
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50" 
                        onClick={() => handleSort("variance")}
                        data-testid="header-variance"
                      >
                        Variance {sortField === "variance" && (sortOrder === "asc" ? "↑" : "↓")}
                      </TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedCategories.map((category) => (
                      <TableRow key={category.tag} data-testid={`row-category-${category.tag}`}>
                        <TableCell className="font-medium" data-testid={`cell-tag-${category.tag}`}>
                          {category.tag}
                        </TableCell>
                        <TableCell data-testid={`cell-planned-${category.tag}`}>
                          {formatCurrency(category.planned)}
                        </TableCell>
                        <TableCell data-testid={`cell-actual-${category.tag}`}>
                          {formatCurrency(category.actual)}
                        </TableCell>
                        <TableCell 
                          className={category.variance >= 0 ? 'text-green-600' : 'text-red-600'}
                          data-testid={`cell-variance-${category.tag}`}
                        >
                          {category.variance >= 0 ? '+' : ''}{formatCurrency(category.variance)}
                          {category.savedAmount > 0 && (
                            <span className="text-xs ml-1">(saved)</span>
                          )}
                          {category.exceededAmount > 0 && (
                            <span className="text-xs ml-1">(over)</span>
                          )}
                        </TableCell>
                        <TableCell data-testid={`cell-progress-${category.tag}`}>
                          <div className="w-full space-y-1">
                            <Progress 
                              value={Math.min(category.percentage, 100)} 
                              className={
                                category.status === 'over' ? 'bg-red-200 [&>div]:bg-red-600' :
                                category.status === 'under' ? 'bg-green-200 [&>div]:bg-green-600' :
                                'bg-gray-200 [&>div]:bg-gray-600'
                              }
                            />
                            <span className="text-xs text-muted-foreground">
                              {category.percentage.toFixed(1)}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell data-testid={`cell-status-${category.tag}`}>
                          {getStatusBadge(category.status)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Budget Summary Totals */}
              {sortedCategories.length > 0 && (
                <div className="border-t pt-4 mt-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    {(budgetStatus === 'all' || budgetStatus === 'under') && (
                      <Card className="border-green-200 bg-green-50/50" data-testid="card-total-under-budget">
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Total Under Budget</p>
                              <p className="text-2xl font-bold text-green-600" data-testid="text-total-under-budget">
                                {formatCurrency(
                                  sortedCategories
                                    .filter(cat => cat.status === 'under')
                                    .reduce((sum, cat) => sum + cat.variance, 0)
                                )}
                              </p>
                            </div>
                            <ArrowDown className="h-8 w-8 text-green-600" />
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {(budgetStatus === 'all' || budgetStatus === 'over') && (
                      <Card className="border-red-200 bg-red-50/50" data-testid="card-total-over-budget">
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Total Over Budget</p>
                              <p className="text-2xl font-bold text-red-600" data-testid="text-total-over-budget">
                                {formatCurrency(
                                  Math.abs(
                                    sortedCategories
                                      .filter(cat => cat.status === 'over')
                                      .reduce((sum, cat) => sum + cat.variance, 0)
                                  )
                                )}
                              </p>
                            </div>
                            <ArrowUp className="h-8 w-8 text-red-600" />
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {budgetStatus === 'all' && (
                      <Card className="border-blue-200 bg-blue-50/50" data-testid="card-net-variance">
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Net Variance</p>
                              <p className={`text-2xl font-bold ${
                                sortedCategories.reduce((sum, cat) => sum + cat.variance, 0) >= 0 
                                  ? 'text-green-600' 
                                  : 'text-red-600'
                              }`} data-testid="text-net-variance">
                                {formatCurrency(
                                  Math.abs(sortedCategories.reduce((sum, cat) => sum + cat.variance, 0))
                                )}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {sortedCategories.reduce((sum, cat) => sum + cat.variance, 0) >= 0 ? 'Saved' : 'Over'}
                              </p>
                            </div>
                            <CheckCircle className="h-8 w-8 text-blue-600" />
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
