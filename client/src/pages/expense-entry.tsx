import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Expense } from "@shared/schema";
import ExpenseForm from "@/components/expense/expense-form";
import CSVImport from "@/components/expense/csv-import";
import ExpenseFilters from "@/components/expense/expense-filters";
import ExpenseTable from "@/components/expense/expense-table";

export default function ExpenseEntry() {
  const [filters, setFilters] = useState({
    dateRange: 'all',
    tag: 'all',
    paymentMethod: 'all',
    type: 'all',
  });

  const { data: expenses = [], isLoading } = useQuery<Expense[]>({
    queryKey: ["/api/expenses/filtered", filters],
    queryFn: ({ queryKey }) => {
      const [, filterParams] = queryKey;
      const searchParams = new URLSearchParams();
      
      Object.entries(filterParams as typeof filters).forEach(([key, value]) => {
        if (value && value !== 'all') {
          searchParams.append(key, value);
        }
      });

      return fetch(`/api/expenses/filtered?${searchParams.toString()}`, {
        credentials: "include",
      }).then(res => {
        if (!res.ok) throw new Error('Failed to fetch expenses');
        return res.json();
      });
    },
  });

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6" data-testid="expense-entry-page">
      <ExpenseForm />
      <CSVImport />
      <ExpenseFilters filters={filters} onFilterChange={handleFilterChange} expenses={expenses} />
      <ExpenseTable expenses={expenses} isLoading={isLoading} />
    </div>
  );
}
