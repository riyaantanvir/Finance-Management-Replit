import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRightLeft, Wallet, TrendingUp, Eye, EyeOff, RefreshCw, X, ArrowUpRight, ArrowDownLeft, Plus, Minus, RotateCcw } from "lucide-react";
import { Account, Transfer, Ledger, ExchangeRate, SettingsFinance } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function FundOverview() {
  const [showBalances, setShowBalances] = useState(true);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const queryClient = useQueryClient();

  const { data: accounts = [], isLoading: accountsLoading, refetch: refetchAccounts } = useQuery<Account[]>({
    queryKey: ["/api/accounts"],
  });

  const { data: transfers = [], isLoading: transfersLoading, refetch: refetchTransfers } = useQuery<Transfer[]>({
    queryKey: ["/api/transfers"],
  });

  // Fetch exchange rates for currency conversion
  const { data: exchangeRates = [], isLoading: ratesLoading } = useQuery<ExchangeRate[]>({
    queryKey: ["/api/exchange-rates"],
  });

  // Fetch finance settings for base currency
  const { data: financeSettings } = useQuery<SettingsFinance>({
    queryKey: ["/api/settings/finance"],
    initialData: { id: '', baseCurrency: 'BDT', allowNegativeBalances: true, updatedAt: null }
  });

  // Fetch ledger entries for selected account
  const { data: accountLedger = [], isLoading: ledgerLoading } = useQuery<Ledger[]>({
    queryKey: ["/api/ledger/account", selectedAccount?.id],
    enabled: !!selectedAccount,
  });

  // Fetch all ledger entries for account balance transactions
  const { data: allLedger = [], isLoading: allLedgerLoading } = useQuery<Ledger[]>({
    queryKey: ["/api/ledger"],
  });

  // Currency conversion function - returns null if no rate found
  const convertToBaseCurrency = (amount: number, fromCurrency: string, baseCurrency: string): number | null => {
    if (fromCurrency === baseCurrency) {
      return amount;
    }

    // Find exchange rate from fromCurrency to baseCurrency
    const rate = exchangeRates.find(r => 
      r.fromCurrency === fromCurrency && r.toCurrency === baseCurrency
    );

    if (rate) {
      return amount * parseFloat(rate.rate);
    }

    // If no direct rate found, try inverse rate
    const inverseRate = exchangeRates.find(r => 
      r.fromCurrency === baseCurrency && r.toCurrency === fromCurrency
    );

    if (inverseRate) {
      return amount / parseFloat(inverseRate.rate);
    }

    // If no rate found, return null to indicate missing rate
    return null;
  };

  // Refresh function to pull current data
  const handleRefresh = async () => {
    await Promise.all([
      refetchAccounts(),
      refetchTransfers(),
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/transfers"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/exchange-rates"] })
    ]);
  };

  // Calculate overview stats with currency conversion
  const stats = useMemo(() => {
    const activeAccounts = accounts.filter(acc => acc.status === 'active');
    const baseCurrency = financeSettings?.baseCurrency || 'BDT';
    
    // Track accounts with missing rates
    let accountsWithMissingRates: string[] = [];
    let transfersWithMissingRates: string[] = [];
    
    // Convert all account balances to base currency
    const totalBalance = activeAccounts.reduce((sum, acc) => {
      const accountBalance = parseFloat(acc.currentBalance);
      const accountCurrency = acc.currency || 'BDT';
      const convertedBalance = convertToBaseCurrency(accountBalance, accountCurrency, baseCurrency);
      
      if (convertedBalance === null) {
        accountsWithMissingRates.push(`${acc.name} (${accountCurrency})`);
        return sum; // Don't include accounts with missing rates in total
      }
      
      return sum + convertedBalance;
    }, 0);
    
    // This month transfers - convert to base currency
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthTransfers = transfers.filter(t => t.createdAt && new Date(t.createdAt) >= startOfMonth);
    const thisMonthAmount = thisMonthTransfers.reduce((sum, t) => {
      const transferAmount = parseFloat(t.amount);
      const transferCurrency = t.currency || 'BDT';
      const convertedAmount = convertToBaseCurrency(transferAmount, transferCurrency, baseCurrency);
      
      if (convertedAmount === null) {
        transfersWithMissingRates.push(transferCurrency);
        return sum; // Don't include transfers with missing rates in total
      }
      
      return sum + convertedAmount;
    }, 0);
    
    return {
      totalAccounts: activeAccounts.length,
      totalBalance,
      thisMonthTransfers: thisMonthTransfers.length,
      thisMonthAmount,
      baseCurrency,
      accountsWithMissingRates,
      transfersWithMissingRates,
      hasMissingRates: accountsWithMissingRates.length > 0 || transfersWithMissingRates.length > 0,
    };
  }, [accounts, transfers, exchangeRates, financeSettings]);

  // Enhanced currency formatting
  const formatCurrency = (amount: number, currency: string = 'BDT') => {
    const symbols = {
      'BDT': '৳',
      'USD': '$',
      'USDT': 'USDT',
      'EUR': '€',
      'GBP': '£',
      'INR': '₹',
      'JPY': '¥',
      'CNY': '¥',
      'CAD': 'C$',
      'AUD': 'A$'
    };
    
    const symbol = symbols[currency as keyof typeof symbols] || currency;
    return `${symbol} ${amount.toLocaleString()}`;
  };

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

  // Get transaction icon and color based on transaction type
  const getTransactionIcon = (txType: string) => {
    switch (txType) {
      case 'opening_balance':
        return { icon: <Plus className="h-4 w-4" />, color: 'text-blue-600', bg: 'bg-blue-100' };
      case 'income':
        return { icon: <ArrowUpRight className="h-4 w-4" />, color: 'text-green-600', bg: 'bg-green-100' };
      case 'expense':
        return { icon: <ArrowDownLeft className="h-4 w-4" />, color: 'text-red-600', bg: 'bg-red-100' };
      case 'transfer_in':
        return { icon: <ArrowRightLeft className="h-4 w-4" />, color: 'text-green-600', bg: 'bg-green-100' };
      case 'transfer_out':
        return { icon: <ArrowRightLeft className="h-4 w-4" />, color: 'text-red-600', bg: 'bg-red-100' };
      case 'deposit':
        return { icon: <Plus className="h-4 w-4" />, color: 'text-green-600', bg: 'bg-green-100' };
      case 'withdrawal':
        return { icon: <Minus className="h-4 w-4" />, color: 'text-red-600', bg: 'bg-red-100' };
      case 'adjustment':
        return { icon: <RotateCcw className="h-4 w-4" />, color: 'text-orange-600', bg: 'bg-orange-100' };
      default:
        return { icon: <Wallet className="h-4 w-4" />, color: 'text-gray-600', bg: 'bg-gray-100' };
    }
  };

  const getTransactionDescription = (txType: string) => {
    const descriptions = {
      opening_balance: 'Opening Balance',
      income: 'Income',
      expense: 'Expense', 
      transfer_in: 'Transfer In',
      transfer_out: 'Transfer Out',
      deposit: 'Deposit',
      withdrawal: 'Withdrawal',
      adjustment: 'Balance Adjustment'
    };
    return descriptions[txType as keyof typeof descriptions] || 'Transaction';
  };

  if (accountsLoading || transfersLoading || ratesLoading) {
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
                  {showBalances ? (
                    <>
                      {formatCurrency(stats.totalBalance, stats.baseCurrency)}
                      {stats.hasMissingRates && (
                        <span className="text-xs text-orange-600 ml-1">*</span>
                      )}
                    </>
                  ) : formatCurrency(0, stats.baseCurrency).replace(/[0-9]/g, '•')}
                </p>
                {stats.hasMissingRates && (
                  <p className="text-xs text-orange-600 mt-1">
                    * Total excludes accounts with missing exchange rates
                  </p>
                )}
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
                  {showBalances ? formatCurrency(stats.thisMonthAmount, stats.baseCurrency) : formatCurrency(0, stats.baseCurrency).replace(/[0-9]/g, '•')}
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
                <Dialog key={account.id}>
                  <DialogTrigger asChild>
                    <div
                      className={`${getAccountColor(account.type, index)} text-white rounded-lg p-4 hover:shadow-lg transition-all cursor-pointer hover:scale-105`}
                      data-testid={`account-card-${account.id}`}
                      onClick={() => setSelectedAccount(account)}
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
                          {showBalances ? formatCurrency(parseFloat(account.currentBalance), account.currency || 'BDT') : '••••••'}
                        </p>
                        {account.paymentMethodKey && (
                          <p className="text-sm opacity-75 mt-1" data-testid={`text-payment-method-${account.id}`}>
                            {account.paymentMethodKey}
                          </p>
                        )}
                      </div>
                    </div>
                  </DialogTrigger>
                  
                  {/* Account History Modal */}
                  <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
                    <DialogHeader>
                      <DialogTitle className="flex items-center space-x-3">
                        <div className={`w-10 h-10 ${getAccountColor(account.type, index)} rounded-lg flex items-center justify-center`}>
                          <Wallet className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h2 className="text-xl font-bold">{account.name}</h2>
                          <p className="text-sm text-muted-foreground">
                            Current Balance: {formatCurrency(parseFloat(account.currentBalance), account.currency || 'BDT')}
                          </p>
                        </div>
                      </DialogTitle>
                    </DialogHeader>
                    
                    <div className="mt-4 overflow-y-auto">
                      <h3 className="text-lg font-semibold mb-4">Account History</h3>
                      {ledgerLoading ? (
                        <div className="space-y-3">
                          {[...Array(5)].map((_, i) => (
                            <div key={i} className="animate-pulse flex items-center space-x-3 p-3">
                              <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                              <div className="flex-1">
                                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                              </div>
                              <div className="h-4 bg-gray-200 rounded w-20"></div>
                            </div>
                          ))}
                        </div>
                      ) : accountLedger.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">
                          No transaction history found
                        </p>
                      ) : (
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                          {accountLedger.map((entry) => {
                            const { icon, color, bg } = getTransactionIcon(entry.txType);
                            const amount = parseFloat(entry.amount);
                            
                            return (
                              <div
                                key={entry.id}
                                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                                data-testid={`ledger-entry-${entry.id}`}
                              >
                                <div className="flex items-center space-x-3">
                                  <div className={`w-10 h-10 ${bg} rounded-full flex items-center justify-center`}>
                                    <span className={color}>{icon}</span>
                                  </div>
                                  <div>
                                    <p className="font-medium" data-testid={`text-transaction-type-${entry.id}`}>
                                      {getTransactionDescription(entry.txType)}
                                    </p>
                                    <p className="text-sm text-muted-foreground" data-testid={`text-transaction-note-${entry.id}`}>
                                      {entry.note || 'No description'}
                                    </p>
                                    <p className="text-xs text-muted-foreground" data-testid={`text-transaction-date-${entry.id}`}>
                                      {entry.createdAt ? new Date(entry.createdAt).toLocaleString() : 'N/A'}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p 
                                    className={`font-bold text-lg ${amount >= 0 ? 'text-green-600' : 'text-red-600'}`}
                                    data-testid={`text-transaction-amount-${entry.id}`}
                                  >
                                    {amount >= 0 ? '+' : ''}{formatCurrency(Math.abs(amount))}
                                  </p>
                                  <Badge variant="outline" className="text-xs">
                                    {entry.refType || 'system'}
                                  </Badge>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Account Balances Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Account Balances Transactions</span>
            <span className="text-sm font-normal text-muted-foreground">
              {allLedger.slice(0, 10).length} recent
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {allLedgerLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse flex items-center space-x-3 py-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                </div>
              ))}
            </div>
          ) : allLedger.length === 0 ? (
            <p className="text-center text-muted-foreground py-8" data-testid="text-no-ledger">
              No transactions found
            </p>
          ) : (
            <div className="space-y-3 max-h-[280px] overflow-y-auto pr-2" data-testid="scrollable-ledger-list">
              {allLedger.slice(0, 10).map((entry) => {
                const { icon, color, bg } = getTransactionIcon(entry.txType);
                const amount = parseFloat(entry.amount);
                const account = accounts.find(acc => acc.id === entry.accountId);
                
                return (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between py-3 border-b border-border last:border-b-0"
                    data-testid={`ledger-transaction-${entry.id}`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 ${bg} rounded-full flex items-center justify-center`}>
                        <span className={color}>{icon}</span>
                      </div>
                      <div>
                        <p className="font-medium" data-testid={`text-ledger-type-${entry.id}`}>
                          {getTransactionDescription(entry.txType)}
                        </p>
                        <p className="text-sm text-muted-foreground" data-testid={`text-ledger-account-${entry.id}`}>
                          {account?.name || 'Unknown Account'} • {entry.note || 'No description'}
                        </p>
                        <p className="text-xs text-muted-foreground" data-testid={`text-ledger-date-${entry.id}`}>
                          {entry.createdAt ? new Date(entry.createdAt).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`font-medium ${amount >= 0 ? 'text-green-600' : 'text-red-600'}`}
                        data-testid={`text-ledger-amount-${entry.id}`}
                      >
                        {amount >= 0 ? '+' : ''}{showBalances ? formatCurrency(Math.abs(amount)) : '••••••'}
                      </p>
                      <p className="text-xs text-muted-foreground" data-testid={`text-ledger-ref-${entry.id}`}>
                        {entry.refType || 'system'}
                      </p>
                    </div>
                  </div>
                );
              })}
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