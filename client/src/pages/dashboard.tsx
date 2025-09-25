import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowUp, ArrowDown, Wallet, Calendar, ShoppingCart, Briefcase, Car, Filter } from "lucide-react";
import { Expense } from "@shared/schema";
import ExpenseFilters from "@/components/expense/expense-filters";

interface DashboardStats {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  thisMonth: number;
}

export default function Dashboard() {
  const [filters, setFilters] = useState({
    dateRange: 'all',
    tag: 'all',
    paymentMethod: 'all',
    type: 'all',
    startDate: '',
    endDate: '',
  });

  const [showFilters, setShowFilters] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [tagModalOpen, setTagModalOpen] = useState(false);

  // Build query params based on filters
  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    
    if (filters.dateRange !== 'all') {
      params.append('dateRange', filters.dateRange);
    }
    if (filters.tag !== 'all') {
      params.append('tag', filters.tag);
    }
    if (filters.paymentMethod !== 'all') {
      params.append('paymentMethod', filters.paymentMethod);
    }
    if (filters.type !== 'all') {
      params.append('type', filters.type);
    }
    // Only include custom date range params when dateRange is 'custom'
    if (filters.dateRange === 'custom' && filters.startDate) {
      params.append('startDate', filters.startDate);
    }
    if (filters.dateRange === 'custom' && filters.endDate) {
      params.append('endDate', filters.endDate);
    }
    
    return params.toString();
  }, [filters]);

  const { data: allExpenses = [], isLoading: allExpensesLoading } = useQuery<Expense[]>({
    queryKey: ["/api/expenses"],
  });

  const { data: filteredExpenses = [], isLoading: expensesLoading } = useQuery<Expense[]>({
    queryKey: ["/api/expenses/filtered", queryParams],
    queryFn: async () => {
      const url = queryParams ? `/api/expenses/filtered?${queryParams}` : '/api/expenses';
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch expenses');
      return response.json();
    },
    enabled: true,
  });

  // Get expenses for selected tag within current filter range
  const selectedTagExpenses = useMemo(() => {
    if (!selectedTag) return [];
    return filteredExpenses.filter(expense => 
      expense.type === 'expense' && expense.tag === selectedTag
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [filteredExpenses, selectedTag]);

  // Calculate stats from filtered expenses
  const stats = useMemo(() => {
    const expenses = filteredExpenses;
    
    const totalIncome = expenses
      .filter(e => e.type === 'income')
      .reduce((sum, e) => sum + parseFloat(e.amount), 0);
      
    const totalExpenses = expenses
      .filter(e => e.type === 'expense')
      .reduce((sum, e) => sum + parseFloat(e.amount), 0);
      
    const netBalance = totalIncome - totalExpenses;
    
    // This month expenses from filtered data
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthExpenses = expenses
      .filter(e => new Date(e.date) >= startOfMonth && e.type === 'expense')
      .reduce((sum, e) => sum + parseFloat(e.amount), 0);
    
    return {
      totalIncome,
      totalExpenses,
      netBalance,
      thisMonth: thisMonthExpenses,
    };
  }, [filteredExpenses]);

  // Calculate tag-wise expense breakdown from filtered expenses
  const tagBreakdown = useMemo(() => {
    const expenses = filteredExpenses.filter(e => e.type === 'expense');
    const tagTotals = expenses.reduce((acc, expense) => {
      const tag = expense.tag;
      const amount = parseFloat(expense.amount);
      acc[tag] = (acc[tag] || 0) + amount;
      return acc;
    }, {} as Record<string, number>);

    // Convert to array and sort by amount (highest first)
    return Object.entries(tagTotals)
      .map(([tag, amount]) => ({ tag, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [filteredExpenses]);

  const formatCurrency = (amount: number) => `৳ ${amount.toLocaleString()}`;

  const getTransactionIcon = (type: string, tag: string) => {
    if (type === 'income') return <Briefcase className="text-green-600 text-xs" />;
    
    switch (tag) {
      case 'home':
      case 'family':
        return <ShoppingCart className="text-red-600 text-xs" />;
      case 'transport':
        return <Car className="text-blue-600 text-xs" />;
      default:
        return <ShoppingCart className="text-red-600 text-xs" />;
    }
  };

  const getTransactionBgColor = (type: string, tag: string) => {
    if (type === 'income') return 'bg-green-100';
    
    switch (tag) {
      case 'transport':
        return 'bg-blue-100';
      default:
        return 'bg-red-100';
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => {
      const newFilters = { ...prev, [key]: value };
      
      // Clear custom date range when switching away from 'custom'
      if (key === 'dateRange' && value !== 'custom') {
        newFilters.startDate = '';
        newFilters.endDate = '';
      }
      
      return newFilters;
    });
  };

  const handleDateRangeChange = (startDate: string, endDate: string) => {
    setFilters(prev => ({ 
      ...prev, 
      startDate, 
      endDate,
      dateRange: 'custom'
    }));
  };

  if (allExpensesLoading || expensesLoading) {
    return (
      <div className="p-6" data-testid="dashboard-loading">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-12 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6" data-testid="dashboard-page">
      {/* Filter Toggle and Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-1">Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            {filters.dateRange !== 'all' || filters.tag !== 'all' || filters.paymentMethod !== 'all' || filters.type !== 'all'
              ? 'Filtered view of your financial data'
              : 'Overview of your financial data'
            }
          </p>
        </div>
        <div className="flex gap-2">
          <div className="text-sm text-muted-foreground bg-muted px-3 py-2 rounded-md">
            {filteredExpenses.length} {filteredExpenses.length === 1 ? 'transaction' : 'transactions'}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            data-testid="button-toggle-filters"
          >
            <Filter className="h-4 w-4" />
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>
        </div>
      </div>

      {/* Filters Section */}
      {showFilters && (
        <ExpenseFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          onDateRangeChange={handleDateRangeChange}
          expenses={allExpenses}
        />
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Total Income</p>
                <p className="text-lg md:text-2xl font-bold text-green-600" data-testid="text-total-income">
                  {formatCurrency(stats.totalIncome)}
                </p>
              </div>
              <ArrowUp className="h-5 w-5 md:h-6 md:w-6 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Total Expenses</p>
                <p className="text-lg md:text-2xl font-bold text-red-600" data-testid="text-total-expenses">
                  {formatCurrency(stats.totalExpenses)}
                </p>
              </div>
              <ArrowDown className="h-5 w-5 md:h-6 md:w-6 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Net Balance</p>
                <p className="text-lg md:text-2xl font-bold text-primary" data-testid="text-net-balance">
                  {formatCurrency(stats.netBalance)}
                </p>
              </div>
              <Wallet className="h-5 w-5 md:h-6 md:w-6 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">This Month</p>
                <p className="text-lg md:text-2xl font-bold text-muted-foreground" data-testid="text-this-month">
                  {formatCurrency(stats.thisMonth)}
                </p>
              </div>
              <Calendar className="h-5 w-5 md:h-6 md:w-6 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tag Expense Breakdown */}
      {tagBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Expense Breakdown by Tag</span>
              <span className="text-sm font-normal text-muted-foreground">
                {filters.dateRange !== 'all' || filters.tag !== 'all' || filters.paymentMethod !== 'all' || filters.type !== 'all'
                  ? 'Filtered view'
                  : 'All time'
                }
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {tagBreakdown.map(({ tag, amount }) => {
                const percentage = stats.totalExpenses > 0 ? ((amount / stats.totalExpenses) * 100) : 0;
                
                return (
                  <Dialog key={tag}>
                    <DialogTrigger asChild>
                      <div
                        className="p-4 border rounded-lg hover:shadow-md transition-all cursor-pointer hover:scale-105"
                        data-testid={`tag-breakdown-${tag}`}
                        onClick={() => {
                          setSelectedTag(tag);
                          setTagModalOpen(true);
                        }}
                      >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${getTransactionBgColor('expense', tag)}`}></div>
                        <span className="font-medium capitalize text-sm" data-testid={`text-tag-name-${tag}`}>
                          {tag}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground" data-testid={`text-tag-percentage-${tag}`}>
                        {percentage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-lg font-bold text-red-600" data-testid={`text-tag-amount-${tag}`}>
                        {formatCurrency(amount)}
                      </p>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-red-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                          data-testid={`progress-tag-${tag}`}
                        ></div>
                      </div>
                      </div>
                    </div>
                    </DialogTrigger>
                    
                    {/* Tag Expense Modal */}
                    <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
                      <DialogHeader>
                        <DialogTitle className="flex items-center space-x-3">
                          <div className={`w-8 h-8 ${getTransactionBgColor('expense', tag)} rounded-full flex items-center justify-center`}>
                            {getTransactionIcon('expense', tag)}
                          </div>
                          <div>
                            <h2 className="text-xl font-bold capitalize">{tag} Expenses</h2>
                            <p className="text-sm text-muted-foreground">
                              Total: {formatCurrency(amount)} ({percentage.toFixed(1)}% of expenses)
                            </p>
                          </div>
                        </DialogTitle>
                      </DialogHeader>
                      
                      <div className="mt-4 overflow-y-auto">
                        <h3 className="text-lg font-semibold mb-4">All {tag} transactions in current filter range</h3>
                        {selectedTag === tag ? (
                          selectedTagExpenses.length === 0 ? (
                            <p className="text-center text-muted-foreground py-8">
                              No {tag} transactions found in current filter range
                            </p>
                          ) : (
                            <div className="space-y-3 max-h-96 overflow-y-auto">
                              {selectedTagExpenses.map((expense) => (
                                <div
                                  key={expense.id}
                                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                                  data-testid={`modal-expense-${expense.id}`}
                                >
                                  <div className="flex items-center space-x-3">
                                    <div className={`w-10 h-10 ${getTransactionBgColor(expense.type, expense.tag)} rounded-full flex items-center justify-center`}>
                                      {getTransactionIcon(expense.type, expense.tag)}
                                    </div>
                                    <div>
                                      <p className="font-medium" data-testid={`modal-expense-details-${expense.id}`}>
                                        {expense.details}
                                      </p>
                                      <p className="text-sm text-muted-foreground" data-testid={`modal-expense-date-${expense.id}`}>
                                        {new Date(expense.date).toLocaleDateString()} • {expense.paymentMethod}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-bold text-lg text-red-600" data-testid={`modal-expense-amount-${expense.id}`}>
                                      -{formatCurrency(parseFloat(expense.amount))}
                                    </p>
                                    <p className="text-xs text-muted-foreground capitalize">
                                      {expense.tag}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )
                        ) : null}
                      </div>
                    </DialogContent>
                  </Dialog>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtered Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>
              {filters.dateRange !== 'all' || filters.tag !== 'all' || filters.paymentMethod !== 'all' || filters.type !== 'all' 
                ? 'Filtered Transactions' 
                : 'Recent Transactions'
              }
            </span>
            {(filters.dateRange !== 'all' || filters.tag !== 'all' || filters.paymentMethod !== 'all' || filters.type !== 'all') && (
              <span className="text-sm font-normal text-muted-foreground">
                {filteredExpenses.length} {filteredExpenses.length === 1 ? 'result' : 'results'}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!filteredExpenses || filteredExpenses.length === 0 ? (
            <p className="text-center text-muted-foreground py-8" data-testid="text-no-transactions">
              {(filters.dateRange !== 'all' || filters.tag !== 'all' || filters.paymentMethod !== 'all' || filters.type !== 'all')
                ? 'No transactions match your filters'
                : 'No transactions found'
              }
            </p>
          ) : (
            <div className="space-y-3">
              {filteredExpenses.slice(0, 10).map((expense) => (
                <div
                  key={expense.id}
                  className="flex items-center justify-between py-3 border-b border-border last:border-b-0"
                  data-testid={`transaction-${expense.id}`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 ${getTransactionBgColor(expense.type, expense.tag)} rounded-full flex items-center justify-center`}>
                      {getTransactionIcon(expense.type, expense.tag)}
                    </div>
                    <div>
                      <p className="font-medium" data-testid={`text-transaction-details-${expense.id}`}>
                        {expense.details}
                      </p>
                      <p className="text-sm text-muted-foreground" data-testid={`text-transaction-date-${expense.id}`}>
                        {new Date(expense.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-medium ${
                        expense.type === 'income' ? 'text-green-600' : 'text-red-600'
                      }`}
                      data-testid={`text-transaction-amount-${expense.id}`}
                    >
                      {expense.type === 'income' ? '+' : '-'}{formatCurrency(parseFloat(expense.amount))}
                    </p>
                    <p className="text-sm text-muted-foreground" data-testid={`text-transaction-method-${expense.id}`}>
                      {expense.paymentMethod}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
