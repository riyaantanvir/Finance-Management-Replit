import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, Calculator } from "lucide-react";
import { Account, Ledger } from "@shared/schema";

export default function FundsReconcilePage() {
  const { data: accounts = [], isLoading: accountsLoading } = useQuery<Account[]>({
    queryKey: ["/api/accounts"],
  });

  const { data: ledgerEntries = [], isLoading: ledgerLoading } = useQuery<Ledger[]>({
    queryKey: ["/api/ledger"],
  });

  // Calculate reconciliation data
  const reconciliationData = useMemo(() => {
    return accounts.map(account => {
      // Calculate balance from ledger entries
      const accountLedger = ledgerEntries.filter(entry => entry.accountId === account.id);
      const calculatedBalance = accountLedger.reduce((sum, entry) => {
        const amount = parseFloat(entry.amountBase);
        // Different transaction types affect balance differently
        switch (entry.txType) {
          case 'opening_balance':
          case 'deposit':
          case 'income':
          case 'transfer_in':
            return sum + amount;
          case 'withdrawal':
          case 'expense':
          case 'transfer_out':
            return sum - amount;
          case 'adjustment':
            return sum + amount; // Adjustments can be positive or negative
          default:
            return sum;
        }
      }, 0);

      const currentBalance = parseFloat(account.currentBalance);
      const difference = Math.abs(currentBalance - calculatedBalance);
      const isReconciled = difference < 0.01; // Allow for small rounding differences

      return {
        account,
        currentBalance,
        calculatedBalance,
        difference,
        isReconciled,
        ledgerEntryCount: accountLedger.length
      };
    });
  }, [accounts, ledgerEntries]);

  const formatCurrency = (amount: number) => {
    if (isNaN(amount)) return '৳ 0';
    return `৳ ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const totalAccounts = reconciliationData.length;
  const reconciledAccounts = reconciliationData.filter(data => data.isReconciled).length;
  const totalDifference = reconciliationData.reduce((sum, data) => sum + data.difference, 0);

  if (accountsLoading || ledgerLoading) {
    return (
      <div className="p-4 md:p-6 space-y-6" data-testid="funds-reconcile-loading">
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-24 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6" data-testid="funds-reconcile-page">
      <div>
        <h1 className="text-2xl font-bold mb-1">Account Reconciliation</h1>
        <p className="text-muted-foreground text-sm">
          Verify account balances against ledger calculations
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Accounts</p>
                <p className="text-2xl font-bold" data-testid="text-total-accounts">
                  {totalAccounts}
                </p>
              </div>
              <Calculator className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Reconciled</p>
                <p className="text-2xl font-bold text-green-600" data-testid="text-reconciled-accounts">
                  {reconciledAccounts}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Difference</p>
                <p className="text-2xl font-bold text-red-600" data-testid="text-total-difference">
                  {formatCurrency(totalDifference)}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reconciliation Details */}
      <Card>
        <CardHeader>
          <CardTitle>Account Reconciliation Details</CardTitle>
        </CardHeader>
        <CardContent>
          {reconciliationData.length === 0 ? (
            <p className="text-center text-muted-foreground py-8" data-testid="text-no-accounts">
              No accounts found
            </p>
          ) : (
            <div className="space-y-4">
              {reconciliationData.map((data) => (
                <div
                  key={data.account.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                  data-testid={`reconcile-item-${data.account.id}`}
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100">
                      {data.isReconciled ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-600" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium" data-testid={`text-account-name-${data.account.id}`}>
                        {data.account.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {data.ledgerEntryCount} ledger {data.ledgerEntryCount === 1 ? 'entry' : 'entries'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right space-y-1">
                    <div>
                      <span className="text-sm text-muted-foreground">Current: </span>
                      <span className="font-medium" data-testid={`text-current-balance-${data.account.id}`}>
                        {formatCurrency(data.currentBalance)}
                      </span>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Calculated: </span>
                      <span className="font-medium" data-testid={`text-calculated-balance-${data.account.id}`}>
                        {formatCurrency(data.calculatedBalance)}
                      </span>
                    </div>
                    {!data.isReconciled && (
                      <div>
                        <span className="text-sm text-muted-foreground">Difference: </span>
                        <span className="font-medium text-red-600" data-testid={`text-difference-${data.account.id}`}>
                          {formatCurrency(data.difference)}
                        </span>
                      </div>
                    )}
                  </div>

                  <Badge
                    variant={data.isReconciled ? "default" : "destructive"}
                    className={
                      data.isReconciled
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }
                    data-testid={`badge-status-${data.account.id}`}
                  >
                    {data.isReconciled ? "Reconciled" : "Mismatch"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}