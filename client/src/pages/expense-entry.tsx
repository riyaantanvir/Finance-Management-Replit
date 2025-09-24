import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Expense } from "@shared/schema";
import ExpenseForm from "@/components/expense/expense-form";
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
    queryKey: ["/api/expenses", filters],
    queryFn: ({ queryKey }) => {
      const [, filterParams] = queryKey;
      const searchParams = new URLSearchParams();
      
      Object.entries(filterParams as typeof filters).forEach(([key, value]) => {
        if (value && value !== 'all') {
          searchParams.append(key, value);
        }
      });

      return fetch(`/api/expenses?${searchParams.toString()}`, {
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
    <div className="p-6" data-testid="expense-entry-page">
      <ExpenseForm />
      <ExpenseFilters filters={filters} onFilterChange={handleFilterChange} />
      <ExpenseTable expenses={expenses} isLoading={isLoading} />
    </div>
  );
}
