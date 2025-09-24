import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Expense } from "@shared/schema";

interface ExpenseFiltersProps {
  filters: {
    dateRange: string;
    tag: string;
    paymentMethod: string;
    type: string;
  };
  onFilterChange: (key: string, value: string) => void;
  expenses: Expense[];
}

export default function ExpenseFilters({ filters, onFilterChange, expenses = [] }: ExpenseFiltersProps) {
  // Get unique tags and payment methods from expenses data
  const uniqueTags = Array.from(new Set(expenses.map(expense => expense.tag))).sort();
  const uniquePaymentMethods = Array.from(new Set(expenses.map(expense => expense.paymentMethod))).sort();
  return (
    <Card className="mb-4 md:mb-6">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg md:text-xl">Filters</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <div>
            <Label className="text-sm font-medium">Date Range</Label>
            <Select
              value={filters.dateRange}
              onValueChange={(value) => onFilterChange('dateRange', value)}
            >
              <SelectTrigger className="mt-1 h-10 md:h-11" data-testid="select-filter-date-range">
                <SelectValue placeholder="Select Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="this-month">This Month</SelectItem>
                <SelectItem value="last-month">Last Month</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label className="text-sm font-medium">Tag</Label>
            <Select
              value={filters.tag}
              onValueChange={(value) => onFilterChange('tag', value)}
            >
              <SelectTrigger className="mt-1 h-10 md:h-11" data-testid="select-filter-tag">
                <SelectValue placeholder="All Tags" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tags</SelectItem>
                {uniqueTags.map(tag => (
                  <SelectItem key={tag} value={tag}>
                    {tag.charAt(0).toUpperCase() + tag.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label className="text-sm font-medium">Payment Method</Label>
            <Select
              value={filters.paymentMethod}
              onValueChange={(value) => onFilterChange('paymentMethod', value)}
            >
              <SelectTrigger className="mt-1 h-10 md:h-11" data-testid="select-filter-payment-method">
                <SelectValue placeholder="All Methods" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Methods</SelectItem>
                {uniquePaymentMethods.map(method => (
                  <SelectItem key={method} value={method}>
                    {method.charAt(0).toUpperCase() + method.slice(1).replace(/([A-Z])/g, ' $1')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label className="text-sm font-medium">Type</Label>
            <Select
              value={filters.type}
              onValueChange={(value) => onFilterChange('type', value)}
            >
              <SelectTrigger className="mt-1 h-10 md:h-11" data-testid="select-filter-type">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
