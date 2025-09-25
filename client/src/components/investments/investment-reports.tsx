import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, BarChart3, PieChart, Calendar, Target } from "lucide-react";
import { InvProject, InvTx, InvPayout, ExchangeRate, SettingsFinance } from "@shared/schema";

export default function InvestmentReports() {
  const { data: projects = [] } = useQuery<InvProject[]>({
    queryKey: ["/api/investments/projects"],
  });

  const { data: transactions = [] } = useQuery<InvTx[]>({
    queryKey: ["/api/investments/transactions"],
  });

  const { data: payouts = [] } = useQuery<InvPayout[]>({
    queryKey: ["/api/investments/payouts"],
  });

  const { data: exchangeRates = [] } = useQuery<ExchangeRate[]>({
    queryKey: ["/api/exchange-rates"],
  });

  const { data: financeSettings } = useQuery<SettingsFinance>({
    queryKey: ["/api/settings/finance"],
    initialData: { id: '', baseCurrency: 'BDT', allowNegativeBalances: true, updatedAt: null }
  });

  const convertToBaseCurrency = (amount: number, fromCurrency: string, baseCurrency: string): number => {
    if (fromCurrency === baseCurrency) return amount;
    const rate = exchangeRates.find(r => r.fromCurrency === fromCurrency && r.toCurrency === baseCurrency);
    if (rate) return amount * parseFloat(rate.rate);
    const inverseRate = exchangeRates.find(r => r.fromCurrency === baseCurrency && r.toCurrency === fromCurrency);
    if (inverseRate) return amount / parseFloat(inverseRate.rate);
    return amount;
  };

  const reportData = useMemo(() => {
    const baseCurrency = financeSettings?.baseCurrency || 'BDT';
    
    // Calculate totals
    const totalInvested = transactions
      .filter(tx => tx.direction === 'cost')
      .reduce((sum, tx) => sum + convertToBaseCurrency(parseFloat(tx.amount), tx.currency, baseCurrency), 0);

    const totalReturns = transactions
      .filter(tx => tx.direction === 'income')
      .reduce((sum, tx) => sum + convertToBaseCurrency(parseFloat(tx.amount), tx.currency, baseCurrency), 0);

    const totalPayouts = payouts
      .reduce((sum, payout) => sum + convertToBaseCurrency(parseFloat(payout.amount), payout.currency, baseCurrency), 0);

    const netProfit = totalReturns - totalInvested;
    const roi = totalInvested > 0 ? (netProfit / totalInvested) * 100 : 0;

    // Project performance
    const projectPerformance = projects.map(project => {
      const projectTxs = transactions.filter(tx => tx.projectId === project.id);
      const projectPayouts = payouts.filter(p => p.projectId === project.id);
      
      const invested = projectTxs
        .filter(tx => tx.direction === 'cost')
        .reduce((sum, tx) => sum + convertToBaseCurrency(parseFloat(tx.amount), tx.currency, baseCurrency), 0);
      
      const returns = projectTxs
        .filter(tx => tx.direction === 'income')
        .reduce((sum, tx) => sum + convertToBaseCurrency(parseFloat(tx.amount), tx.currency, baseCurrency), 0);
      
      const payoutTotal = projectPayouts
        .reduce((sum, p) => sum + convertToBaseCurrency(parseFloat(p.amount), p.currency, baseCurrency), 0);

      const profit = returns - invested;
      const projectROI = invested > 0 ? (profit / invested) * 100 : 0;

      return {
        project,
        invested,
        returns,
        payouts: payoutTotal,
        profit,
        roi: projectROI,
      };
    }).sort((a, b) => b.roi - a.roi);

    // Monthly analysis
    const currentYear = new Date().getFullYear();
    const monthlyData = [];
    for (let month = 0; month < 12; month++) {
      const startOfMonth = new Date(currentYear, month, 1);
      const endOfMonth = new Date(currentYear, month + 1, 0);
      
      const monthlyInvested = transactions
        .filter(tx => tx.direction === 'cost' && tx.createdAt)
        .filter(tx => {
          const txDate = new Date(tx.createdAt!);
          return txDate >= startOfMonth && txDate <= endOfMonth;
        })
        .reduce((sum, tx) => sum + convertToBaseCurrency(parseFloat(tx.amount), tx.currency, baseCurrency), 0);

      const monthlyReturns = transactions
        .filter(tx => tx.direction === 'income' && tx.createdAt)
        .filter(tx => {
          const txDate = new Date(tx.createdAt!);
          return txDate >= startOfMonth && txDate <= endOfMonth;
        })
        .reduce((sum, tx) => sum + convertToBaseCurrency(parseFloat(tx.amount), tx.currency, baseCurrency), 0);

      monthlyData.push({
        month: startOfMonth.toLocaleDateString('en', { month: 'short' }),
        invested: monthlyInvested,
        returns: monthlyReturns,
        net: monthlyReturns - monthlyInvested,
      });
    }

    return {
      totalInvested,
      totalReturns,
      totalPayouts,
      netProfit,
      roi,
      projectPerformance,
      monthlyData,
      baseCurrency,
    };
  }, [projects, transactions, payouts, exchangeRates, financeSettings]);

  const formatCurrency = (amount: number, currency: string = reportData.baseCurrency) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency === 'BDT' ? 'USD' : currency,
      minimumFractionDigits: 2,
    }).format(amount).replace('$', currency === 'BDT' ? '৳' : '$');
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 p-4 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Investment Reports</h1>
        <p className="text-sm text-gray-600 mt-1">Analyze your investment portfolio performance</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-500">Total Invested</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(reportData.totalInvested)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-500">Total Returns</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(reportData.totalReturns)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-500">Total Payouts</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatCurrency(reportData.totalPayouts)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              {reportData.netProfit >= 0 ? 
                <TrendingUp className="h-5 w-5 text-green-600" /> :
                <TrendingDown className="h-5 w-5 text-red-600" />
              }
              <div>
                <p className="text-sm text-gray-500">Net P&L</p>
                <p className={`text-2xl font-bold ${reportData.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(reportData.netProfit)}
                </p>
                <p className="text-xs text-gray-500">ROI: {reportData.roi.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Project Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Project Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {reportData.projectPerformance.map((item, index) => (
              <div key={item.project.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                    index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-500' : 'bg-blue-500'
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium">{item.project.name}</p>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs">{item.project.type}</Badge>
                      <Badge variant="outline" className="text-xs">{item.project.currency}</Badge>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">Invested: {formatCurrency(item.invested)}</p>
                  <p className="text-sm text-gray-600">Returns: {formatCurrency(item.returns)}</p>
                  <p className={`text-sm font-medium ${item.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    P&L: {formatCurrency(item.profit)} ({item.roi.toFixed(1)}%)
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Monthly Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Monthly Trends ({new Date().getFullYear()})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {reportData.monthlyData.filter(m => m.invested > 0 || m.returns > 0).map((month) => (
              <div key={month.month} className="flex items-center justify-between py-2 border-b last:border-b-0">
                <span className="font-medium w-12">{month.month}</span>
                <div className="flex-1 mx-4">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Invested: </span>
                      <span className="text-blue-600 font-medium">{formatCurrency(month.invested)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Returns: </span>
                      <span className="text-green-600 font-medium">{formatCurrency(month.returns)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Net: </span>
                      <span className={`font-medium ${month.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(month.net)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}