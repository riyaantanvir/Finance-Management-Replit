import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Target, DollarSign, Activity, RefreshCw, Plus, ArrowUpRight, ArrowDownLeft, BarChart3, AlertTriangle } from "lucide-react";
import { InvProject, InvTx, InvPayout, Account, ExchangeRate, SettingsFinance } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Link } from "wouter";

export default function InvestmentOverview() {
  const [selectedProject, setSelectedProject] = useState<InvProject | null>(null);
  const queryClient = useQueryClient();

  // Fetch all investment data
  const { data: projects = [], isLoading: projectsLoading, refetch: refetchProjects } = useQuery<InvProject[]>({
    queryKey: ["/api/inv-projects"],
  });

  const { data: transactions = [], isLoading: transactionsLoading, refetch: refetchTransactions } = useQuery<InvTx[]>({
    queryKey: ["/api/inv-tx"],
  });

  const { data: payouts = [], isLoading: payoutsLoading, refetch: refetchPayouts } = useQuery<InvPayout[]>({
    queryKey: ["/api/inv-payouts"],
  });

  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ["/api/accounts"],
  });

  // Fetch exchange rates for currency conversion
  const { data: exchangeRates = [] } = useQuery<ExchangeRate[]>({
    queryKey: ["/api/exchange-rates"],
  });

  // Fetch finance settings for base currency
  const { data: financeSettings } = useQuery<SettingsFinance>({
    queryKey: ["/api/settings/finance"],
    initialData: { id: '', baseCurrency: 'BDT', allowNegativeBalances: true, updatedAt: null }
  });

  // Currency conversion function  
  const convertToBaseCurrency = (amount: number, fromCurrency: string, baseCurrency: string): number | null => {
    if (fromCurrency === baseCurrency) {
      return amount;
    }

    const rate = exchangeRates.find(r => 
      r.fromCurrency === fromCurrency && r.toCurrency === baseCurrency
    );

    if (rate) {
      return amount * parseFloat(rate.rate);
    }

    const inverseRate = exchangeRates.find(r => 
      r.fromCurrency === baseCurrency && r.toCurrency === fromCurrency
    );

    if (inverseRate) {
      return amount / parseFloat(inverseRate.rate);
    }

    return null;
  };

  // Bidirectional currency conversion helper
  const convertCurrency = (amount: number, fromCurrency: string, toCurrency: string): number | null => {
    if (fromCurrency === toCurrency) {
      return amount;
    }

    // First check for direct rate (from → to)
    const directRate = exchangeRates.find(r => 
      r.fromCurrency === fromCurrency && r.toCurrency === toCurrency
    );

    if (directRate) {
      return amount * parseFloat(directRate.rate);
    }

    // Then check for inverse rate (to → from)
    const inverseRate = exchangeRates.find(r => 
      r.fromCurrency === toCurrency && r.toCurrency === fromCurrency
    );

    if (inverseRate) {
      return amount / parseFloat(inverseRate.rate);
    }

    return null;
  };

  // Refresh function to pull current data
  const handleRefresh = async () => {
    await Promise.all([
      refetchProjects(),
      refetchTransactions(),
      refetchPayouts(),
      queryClient.invalidateQueries({ queryKey: ["/api/investments"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/exchange-rates"] })
    ]);
  };

  // Calculate investment statistics
  const stats = useMemo(() => {
    const activeProjects = projects.filter(p => p.status === 'active');
    const baseCurrency = financeSettings?.baseCurrency || 'BDT';
    
    // Track missing exchange rates
    let missingRates = new Set<string>();
    
    // Calculate total invested (sum of cost transactions)
    let totalInvested = 0;
    let excludedInvestmentAmount = 0;
    
    transactions.filter(tx => tx.direction === 'cost').forEach(tx => {
      const convertedAmount = convertToBaseCurrency(parseFloat(tx.amount), tx.currency, baseCurrency);
      if (convertedAmount !== null) {
        totalInvested += convertedAmount;
      } else {
        if (tx.currency !== baseCurrency) {
          missingRates.add(`${tx.currency} → ${baseCurrency}`);
          excludedInvestmentAmount += parseFloat(tx.amount);
        } else {
          totalInvested += parseFloat(tx.amount);
        }
      }
    });

    // Calculate total returns (sum of income transactions)
    let totalReturns = 0;
    let excludedReturnsAmount = 0;
    
    transactions.filter(tx => tx.direction === 'income').forEach(tx => {
      const convertedAmount = convertToBaseCurrency(parseFloat(tx.amount), tx.currency, baseCurrency);
      if (convertedAmount !== null) {
        totalReturns += convertedAmount;
      } else {
        if (tx.currency !== baseCurrency) {
          missingRates.add(`${tx.currency} → ${baseCurrency}`);
          excludedReturnsAmount += parseFloat(tx.amount);
        } else {
          totalReturns += parseFloat(tx.amount);
        }
      }
    });

    // Calculate total payouts
    let totalPayouts = 0;
    let excludedPayoutsAmount = 0;
    
    payouts.forEach(payout => {
      const convertedAmount = convertToBaseCurrency(parseFloat(payout.amount), payout.currency, baseCurrency);
      if (convertedAmount !== null) {
        totalPayouts += convertedAmount;
      } else {
        if (payout.currency !== baseCurrency) {
          missingRates.add(`${payout.currency} → ${baseCurrency}`);
          excludedPayoutsAmount += parseFloat(payout.amount);
        } else {
          totalPayouts += parseFloat(payout.amount);
        }
      }
    });

    // Calculate net profit/loss
    const netProfit = totalReturns - totalInvested;
    const roi = totalInvested > 0 ? (netProfit / totalInvested) * 100 : 0;

    // This month activity
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthTransactions = transactions.filter(tx => 
      tx.createdAt && new Date(tx.createdAt) >= startOfMonth
    );

    return {
      totalProjects: projects.length,
      activeProjects: activeProjects.length,
      totalInvested,
      totalReturns,
      totalPayouts,
      netProfit,
      roi,
      thisMonthTransactions: thisMonthTransactions.length,
      baseCurrency,
      missingRates: Array.from(missingRates),
      hasIncompleteCurrencyData: missingRates.size > 0,
      excludedAmounts: {
        investment: excludedInvestmentAmount,
        returns: excludedReturnsAmount,
        payouts: excludedPayoutsAmount
      }
    };
  }, [projects, transactions, payouts, exchangeRates, financeSettings]);

  // Recent transactions (last 10)
  const recentTransactions = useMemo(() => {
    return [...transactions]
      .sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA; // Most recent first, undated entries go to bottom
      })
      .slice(0, 10);
  }, [transactions]);

  const formatCurrency = (amount: number, currency: string = stats.baseCurrency) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency === 'BDT' ? 'USD' : currency,
      minimumFractionDigits: 2,
    }).format(amount).replace('$', currency === 'BDT' ? '৳' : '$');
  };

  const isLoading = projectsLoading || transactionsLoading || payoutsLoading;

  return (
    <div className="flex flex-col h-full bg-gray-50 p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900" data-testid="text-investments-title">
            Investment Overview
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Track your investment portfolio performance and manage projects
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            onClick={handleRefresh}
            variant="outline" 
            size="sm"
            disabled={isLoading}
            data-testid="button-refresh-investments"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Link href="/investments/projects">
            <Button size="sm" data-testid="button-new-project">
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          </Link>
        </div>
      </div>

      {/* Missing Exchange Rate Warning */}
      {stats.hasIncompleteCurrencyData && (
        <Alert className="border-yellow-200 bg-yellow-50 text-yellow-800">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Incomplete currency data:</strong> Some amounts are excluded from totals due to missing exchange rates. 
            Missing rates for: {stats.missingRates.join(', ')}. 
            <Link href="/investments/settings" className="underline hover:text-yellow-900">
              Configure exchange rates
            </Link> for accurate calculations.
          </AlertDescription>
        </Alert>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invested</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-invested">
              {formatCurrency(stats.totalInvested)}
            </div>
            <p className="text-xs text-muted-foreground">
              Across {stats.totalProjects} projects
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Returns</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="text-total-returns">
              {formatCurrency(stats.totalReturns)}
            </div>
            <p className="text-xs text-muted-foreground">
              From active projects
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Profit/Loss</CardTitle>
            <BarChart3 className={`h-4 w-4 ${stats.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`} data-testid="text-net-profit">
              {formatCurrency(stats.netProfit)}
            </div>
            <p className="text-xs text-muted-foreground">
              ROI: {stats.roi.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
            <Target className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600" data-testid="text-active-projects">
              {stats.activeProjects}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.thisMonthTransactions} transactions this month
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
        {/* Active Projects */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Active Projects</CardTitle>
              <Link href="/investments/projects">
                <Button variant="ghost" size="sm" data-testid="button-view-all-projects">
                  View All
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <RefreshCw className="h-6 w-6 animate-spin" />
                </div>
              ) : projects.filter(p => p.status === 'active').length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No active projects found</p>
                  <Link href="/investments/projects">
                    <Button size="sm" className="mt-2" data-testid="button-create-first-project">
                      Create your first project
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {projects.filter(p => p.status === 'active').slice(0, 6).map((project) => {
                    const projectTransactions = transactions.filter(tx => tx.projectId === project.id);
                    const baseCurrency = stats.baseCurrency;
                    
                    // Check if all transactions can be converted to project currency
                    const costTransactions = projectTransactions.filter(tx => tx.direction === 'cost');
                    const incomeTransactions = projectTransactions.filter(tx => tx.direction === 'income');
                    
                    // Test conversion feasibility first
                    const canConvertAllToProjectCurrency = [...costTransactions, ...incomeTransactions].every(tx => {
                      const projectAmount = convertCurrency(parseFloat(tx.amount), tx.currency, project.currency);
                      return projectAmount !== null;
                    });
                    
                    // Use consistent currency throughout - either project currency or base currency
                    const displayCurrency = canConvertAllToProjectCurrency ? project.currency : baseCurrency;
                    
                    const invested = costTransactions.reduce((sum, tx) => {
                      const convertedAmount = convertCurrency(parseFloat(tx.amount), tx.currency, displayCurrency);
                      if (convertedAmount === null) return sum; // Skip if no conversion available
                      return sum + convertedAmount;
                    }, 0);
                    
                    const returns = incomeTransactions.reduce((sum, tx) => {
                      const convertedAmount = convertCurrency(parseFloat(tx.amount), tx.currency, displayCurrency);
                      if (convertedAmount === null) return sum; // Skip if no conversion available
                      return sum + convertedAmount;
                    }, 0);
                    
                    const hasConversionIssues = displayCurrency === baseCurrency && project.currency !== baseCurrency;
                    
                    return (
                      <div 
                        key={project.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                        onClick={() => setSelectedProject(project)}
                        data-testid={`card-project-${project.id}`}
                      >
                        <div>
                          <h4 className="font-medium text-sm">{project.name}</h4>
                          <p className="text-xs text-gray-500">{project.notes}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {project.type}
                            </Badge>
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${project.status === 'active' ? 'text-green-600 border-green-200' : 'text-gray-600'}`}
                            >
                              {project.status}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center justify-end space-x-1">
                            <p className="text-sm font-medium">
                              {formatCurrency(invested, displayCurrency)}
                            </p>
                            {hasConversionIssues && (
                              <Badge variant="outline" className="text-xs px-1 py-0 text-yellow-700 border-yellow-300">
                                Base
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center justify-end space-x-1">
                            <p className={`text-xs ${returns > invested ? 'text-green-600' : 'text-gray-500'}`}>
                              Returns: {formatCurrency(returns, displayCurrency)}
                            </p>
                            {hasConversionIssues && (
                              <Badge variant="outline" className="text-xs px-1 py-0 text-yellow-700 border-yellow-300">
                                Base
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Recent Activity</CardTitle>
            <Link href="/investments/transactions">
              <Button variant="ghost" size="sm" data-testid="button-view-all-transactions">
                View All
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <RefreshCw className="h-6 w-6 animate-spin" />
              </div>
            ) : recentTransactions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No recent activity</p>
              </div>
            ) : (
              recentTransactions.map((transaction) => {
                const project = projects.find(p => p.id === transaction.projectId);
                return (
                  <div 
                    key={transaction.id}
                    className="flex items-center justify-between py-2 border-b last:border-b-0"
                    data-testid={`transaction-${transaction.id}`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`p-1.5 rounded-full ${
                        transaction.direction === 'income' ? 'bg-green-100' : 'bg-blue-100'
                      }`}>
                        {transaction.direction === 'income' ? 
                          <ArrowUpRight className="h-3 w-3 text-green-600" /> :
                          <ArrowDownLeft className="h-3 w-3 text-blue-600" />
                        }
                      </div>
                      <div>
                        <p className="text-sm font-medium">{transaction.note || 'Investment transaction'}</p>
                        <p className="text-xs text-gray-500">{project?.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-medium ${
                        transaction.direction === 'income' ? 'text-green-600' : 'text-blue-600'
                      }`}>
                        {transaction.direction === 'income' ? '+' : '-'}{formatCurrency(parseFloat(transaction.amount), transaction.currency)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {transaction.createdAt ? new Date(transaction.createdAt).toLocaleDateString() : 'No date'}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Project Detail Dialog */}
      <Dialog open={!!selectedProject} onOpenChange={() => setSelectedProject(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedProject?.name}</DialogTitle>
          </DialogHeader>
          {selectedProject && (
            <div className="space-y-4">
              <p className="text-gray-600">{selectedProject.notes}</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Type</p>
                  <p className="font-medium">{selectedProject.type}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <Badge variant="outline" className={
                    selectedProject.status === 'active' ? 'text-green-600 border-green-200' : 'text-gray-600'
                  }>
                    {selectedProject.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Currency</p>
                  <p className="font-medium">{selectedProject.currency}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Start Date</p>
                  <p className="font-medium">{selectedProject.startDate ? new Date(selectedProject.startDate).toLocaleDateString() : 'Not set'}</p>
                </div>
              </div>
              <div className="flex space-x-2">
                <Link href={`/investments/projects?id=${selectedProject.id}`}>
                  <Button size="sm" data-testid="button-view-project-details">
                    View Details
                  </Button>
                </Link>
                <Link href={`/investments/transactions?project=${selectedProject.id}`}>
                  <Button variant="outline" size="sm" data-testid="button-view-project-transactions">
                    View Transactions
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}