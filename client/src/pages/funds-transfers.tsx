import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowRightLeft, Plus } from "lucide-react";
import TransferForm from "@/components/funds/transfer-form";
import { Transfer, Account } from "@shared/schema";

export default function FundsTransfersPage() {
  const [showForm, setShowForm] = useState(false);

  const { data: transfers = [], isLoading: transfersLoading } = useQuery<Transfer[]>({
    queryKey: ["/api/transfers"],
  });

  const { data: accounts = [] } = useQuery<Account[]>({
    queryKey: ["/api/accounts"],
  });

  // Create account lookup map
  const accountMap = accounts.reduce((map, account) => {
    map[account.id] = account;
    return map;
  }, {} as Record<string, Account>);

  const formatCurrency = (amount: string) => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) return '৳ 0';
    return `৳ ${numAmount.toLocaleString()}`;
  };

  return (
    <div className="p-4 md:p-6 space-y-6" data-testid="funds-transfers-page">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold mb-1">Transfer Management</h1>
          <p className="text-muted-foreground text-sm">
            Create and manage transfers between accounts
          </p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          data-testid="button-toggle-transfer-form"
        >
          <Plus className="h-4 w-4 mr-2" />
          {showForm ? "Hide Form" : "New Transfer"}
        </Button>
      </div>

      {showForm && (
        <TransferForm onSuccess={() => setShowForm(false)} />
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Transfer History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {transfersLoading ? (
            <div className="animate-pulse space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-200 rounded"></div>
              ))}
            </div>
          ) : transfers.length === 0 ? (
            <p className="text-center text-muted-foreground py-8" data-testid="text-no-transfers">
              No transfers found
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>From Account</TableHead>
                    <TableHead>To Account</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Fee</TableHead>
                    <TableHead>Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transfers.map((transfer) => (
                    <TableRow key={transfer.id} data-testid={`row-transfer-${transfer.id}`}>
                      <TableCell data-testid={`text-transfer-date-${transfer.id}`}>
                        {transfer.createdAt ? new Date(transfer.createdAt).toLocaleDateString() : 'N/A'}
                      </TableCell>
                      <TableCell data-testid={`text-from-account-${transfer.id}`}>
                        {accountMap[transfer.fromAccountId]?.name || 'Unknown Account'}
                      </TableCell>
                      <TableCell data-testid={`text-to-account-${transfer.id}`}>
                        {accountMap[transfer.toAccountId]?.name || 'Unknown Account'}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-blue-600" data-testid={`text-amount-${transfer.id}`}>
                          {formatCurrency(transfer.amount)}
                        </span>
                      </TableCell>
                      <TableCell data-testid={`text-fee-${transfer.id}`}>
                        {formatCurrency(transfer.fee)}
                      </TableCell>
                      <TableCell data-testid={`text-note-${transfer.id}`}>
                        {transfer.note || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}