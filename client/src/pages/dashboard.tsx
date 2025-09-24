import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUp, ArrowDown, Wallet, Calendar, ShoppingCart, Briefcase, Car } from "lucide-react";
import { Expense } from "@shared/schema";

interface DashboardStats {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  thisMonth: number;
}

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: recentExpenses, isLoading: expensesLoading } = useQuery<Expense[]>({
    queryKey: ["/api/expenses"],
  });

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

  if (statsLoading || expensesLoading) {
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
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Total Income</p>
                <p className="text-lg md:text-2xl font-bold text-green-600" data-testid="text-total-income">
                  {formatCurrency(stats?.totalIncome || 0)}
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
                  {formatCurrency(stats?.totalExpenses || 0)}
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
                  {formatCurrency(stats?.netBalance || 0)}
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
                  {formatCurrency(stats?.thisMonth || 0)}
                </p>
              </div>
              <Calendar className="h-5 w-5 md:h-6 md:w-6 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {!recentExpenses || recentExpenses.length === 0 ? (
            <p className="text-center text-muted-foreground py-8" data-testid="text-no-transactions">
              No transactions found
            </p>
          ) : (
            <div className="space-y-3">
              {recentExpenses.slice(0, 5).map((expense) => (
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
