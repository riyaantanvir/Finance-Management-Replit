import { useQuery } from "@tanstack/react-query";
import AccountsTable from "@/components/funds/accounts-table";
import { Account } from "@shared/schema";

export default function FundsAccountsPage() {
  const { data: accounts = [], isLoading } = useQuery<Account[]>({
    queryKey: ["/api/accounts"],
  });

  return (
    <div className="p-4 md:p-6 space-y-6" data-testid="funds-accounts-page">
      <div>
        <h1 className="text-2xl font-bold mb-1">Account Management</h1>
        <p className="text-muted-foreground text-sm">
          Manage your financial accounts and balances
        </p>
      </div>
      
      <AccountsTable accounts={accounts} isLoading={isLoading} />
    </div>
  );
}