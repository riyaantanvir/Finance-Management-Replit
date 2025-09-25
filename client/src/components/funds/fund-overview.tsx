import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRightLeft, Wallet, TrendingUp, Eye, EyeOff, RefreshCw } from "lucide-react";
import { Account, Transfer } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function FundOverview() {
  const [showBalances, setShowBalances] = useState(true);
  const queryClient = useQueryClient();

  const { data: accounts = [], isLoading: accountsLoading, refetch: refetchAccounts } = useQuery<Account[]>({
    queryKey: ["/api/accounts"],
  });

  const { data: transfers = [], isLoading: transfersLoading, refetch: refetchTransfers } = useQuery<Transfer[]>({
    queryKey: ["/api/transfers"],
  });

  // Refresh function to pull current data
  const handleRefresh = async () => {
    await Promise.all([
      refetchAccounts(),
      refetchTransfers(),
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/transfers"] })
    ]);
  };

  // Calculate overview stats
  const stats = useMemo(() => {
    const activeAccounts = accounts.filter(acc => acc.status === 'active');
    const totalBalance = activeAccounts.reduce((sum, acc) => sum + parseFloat(acc.currentBalance), 0);
    
    // This month transfers
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthTransfers = transfers.filter(t => t.createdAt && new Date(t.createdAt) >= startOfMonth);
    const thisMonthAmount = thisMonthTransfers.reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
    return {
      totalAccounts: activeAccounts.length,
      totalBalance,
      thisMonthTransfers: thisMonthTransfers.length,
      thisMonthAmount,
    };
  }, [accounts, transfers]);

  const formatCurrency = (amount: number) => `৳ ${amount.toLocaleString()}`;

  // Color mapping for different account types
  const getAccountColor = (type: string, index: number) => {
    const colors = [
      'bg-cyan-500', 'bg-purple-500', 'bg-amber-500', 
      'bg-slate-500', 'bg-red-500', 'bg-green-500',
      'bg-blue-500', 'bg-pink-500', 'bg-indigo-500'
    ];
    const typeColors = {
      cash: 'bg-cyan-500',
      mobile_wallet: 'bg-purple-500', 
      bank_account: 'bg-slate-500',
      card: 'bg-amber-500',
      crypto: 'bg-red-500',
      other: 'bg-gray-500'
    };
    return typeColors[type as keyof typeof typeColors] || colors[index % colors.length];
  };

  if (accountsLoading || transfersLoading) {
    return (
      <div className="p-4 md:p-6 space-y-4 md:space-y-6" data-testid="fund-overview-loading">
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
    <div className="p-4 md:p-6 space-y-4 md:space-y-6" data-testid="fund-overview-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-1">Fund Management</h1>
          <p className="text-muted-foreground text-sm">
            Overview of your accounts and fund transfers
          </p>
        </div>
        <div className="flex gap-2">
          <div className="text-sm text-muted-foreground bg-muted px-3 py-2 rounded-md">
            {stats.totalAccounts} active {stats.totalAccounts === 1 ? 'account' : 'accounts'}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={accountsLoading || transfersLoading}
            data-testid="button-refresh-data"
          >
            <RefreshCw className={`h-4 w-4 ${(accountsLoading || transfersLoading) ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowBalances(!showBalances)}
            data-testid="button-toggle-balances"
          >
            {showBalances ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Total Balance</p>
                <p className="text-lg md:text-2xl font-bold text-primary" data-testid="text-total-balance">
                  {showBalances ? formatCurrency(stats.totalBalance) : '৳ ••••••'}
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
                <p className="text-xs md:text-sm text-muted-foreground">Active Accounts</p>
                <p className="text-lg md:text-2xl font-bold text-blue-600" data-testid="text-active-accounts">
                  {stats.totalAccounts}
                </p>
              </div>
              <Wallet className="h-5 w-5 md:h-6 md:w-6 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">This Month Transfers</p>
                <p className="text-lg md:text-2xl font-bold text-green-600" data-testid="text-monthly-transfers">
                  {stats.thisMonthTransfers}
                </p>
              </div>
              <ArrowRightLeft className="h-5 w-5 md:h-6 md:w-6 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Monthly Volume</p>
                <p className="text-lg md:text-2xl font-bold text-orange-600" data-testid="text-monthly-volume">
                  {showBalances ? formatCurrency(stats.thisMonthAmount) : '৳ ••••••'}
                </p>
              </div>
              <TrendingUp className="h-5 w-5 md:h-6 md:w-6 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Current Account Balances */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Current Account Balances</span>
            <span className="text-sm font-normal text-muted-foreground">
              {accounts.filter(acc => acc.status === 'active').length} active
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {accounts.filter(acc => acc.status === 'active').length === 0 ? (
            <p className="text-center text-muted-foreground py-8" data-testid="text-no-accounts">
              No active accounts found
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {accounts
                .filter(acc => acc.status === 'active')
                .map((account, index) => (
                <div
                  key={account.id}
                  className={`${getAccountColor(account.type, index)} text-white rounded-lg p-4 hover:shadow-lg transition-shadow`}
                  data-testid={`account-card-${account.id}`}
                >
                  <div className="flex items-center space-x-2 mb-2">
                    <Wallet className="h-5 w-5 text-white" />
                    <span className="text-sm font-medium opacity-90">
                      {account.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-1" data-testid={`text-account-name-${account.id}`}>
                      {account.name}
                    </h3>
                    <p className="text-xl font-bold" data-testid={`text-account-balance-${account.id}`}>
                      {showBalances ? formatCurrency(parseFloat(account.currentBalance)) : '••••••'}
                    </p>
                    {account.paymentMethodKey && (
                      <p className="text-sm opacity-75 mt-1" data-testid={`text-payment-method-${account.id}`}>
                        {account.paymentMethodKey}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Transfers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Recent Transfers</span>
            <span className="text-sm font-normal text-muted-foreground">
              {transfers.slice(0, 10).length} recent
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {transfers.length === 0 ? (
            <p className="text-center text-muted-foreground py-8" data-testid="text-no-transfers">
              No transfers found
            </p>
          ) : (
            <div className="space-y-3">
              {transfers.slice(0, 10).map((transfer) => (
                <div
                  key={transfer.id}
                  className="flex items-center justify-between py-3 border-b border-border last:border-b-0"
                  data-testid={`transfer-${transfer.id}`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <ArrowRightLeft className="text-green-600 text-xs" />
                    </div>
                    <div>
                      <p className="font-medium" data-testid={`text-transfer-description-${transfer.id}`}>
                        {transfer.note || 'Fund Transfer'}
                      </p>
                      <p className="text-sm text-muted-foreground" data-testid={`text-transfer-date-${transfer.id}`}>
                        {transfer.createdAt ? new Date(transfer.createdAt).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-blue-600" data-testid={`text-transfer-amount-${transfer.id}`}>
                      {showBalances ? formatCurrency(parseFloat(transfer.amount)) : '••••••'}
                    </p>
                    <p className="text-sm text-muted-foreground" data-testid={`text-transfer-accounts-${transfer.id}`}>
                      Between accounts
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