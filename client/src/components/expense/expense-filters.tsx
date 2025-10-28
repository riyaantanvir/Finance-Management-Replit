import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Expense } from "@shared/schema";
import { Calendar, CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";

interface ExpenseFiltersProps {
  filters: {
    dateRange: string;
    tag: string;
    paymentMethod: string;
    type: string;
    startDate?: string;
    endDate?: string;
  };
  onFilterChange: (key: string, value: string) => void;
  onDateRangeChange?: (startDate: string, endDate: string) => void;
  expenses: Expense[];
}

export default function ExpenseFilters({ filters, onFilterChange, onDateRangeChange, expenses = [] }: ExpenseFiltersProps) {
  const [startDate, setStartDate] = useState(filters.startDate || '');
  const [endDate, setEndDate] = useState(filters.endDate || '');

  // Get unique tags and payment methods from expenses data, filtering out empty values
  const uniqueTags = Array.from(new Set(expenses.map(expense => expense.tag).filter(tag => tag && tag.trim() !== ''))).sort();
  const uniquePaymentMethods = Array.from(new Set(expenses.map(expense => expense.paymentMethod).filter(method => method && method.trim() !== ''))).sort();

  const handleCustomDateApply = () => {
    if (startDate && endDate && onDateRangeChange) {
      onDateRangeChange(startDate, endDate);
    }
  };
  return (
    <Card className="mb-2">
      <CardHeader className="pb-2 pt-3 px-3">
        <CardTitle className="text-sm font-semibold">Filters</CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          <div>
            <Label className="text-xs font-medium">Date Range</Label>
            <Select
              value={filters.dateRange}
              onValueChange={(value) => onFilterChange('dateRange', value)}
            >
              <SelectTrigger className="mt-1 h-8 text-xs" data-testid="select-filter-date-range">
                <SelectValue placeholder="Select Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="this-month">This Month</SelectItem>
                <SelectItem value="last-month">Last Month</SelectItem>
                <SelectItem value="custom">Custom Date Range</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label className="text-xs font-medium">Tag</Label>
            <Select
              value={filters.tag}
              onValueChange={(value) => onFilterChange('tag', value)}
            >
              <SelectTrigger className="mt-1 h-8 text-xs" data-testid="select-filter-tag">
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
            <Label className="text-xs font-medium">Payment Method</Label>
            <Select
              value={filters.paymentMethod}
              onValueChange={(value) => onFilterChange('paymentMethod', value)}
            >
              <SelectTrigger className="mt-1 h-8 text-xs" data-testid="select-filter-payment-method">
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
            <Label className="text-xs font-medium">Type</Label>
            <Select
              value={filters.type}
              onValueChange={(value) => onFilterChange('type', value)}
            >
              <SelectTrigger className="mt-1 h-8 text-xs" data-testid="select-filter-type">
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

        {/* Custom Date Range Section */}
        {filters.dateRange === 'custom' && (
          <div className="mt-6 pt-6 border-t border-border">
            <h4 className="text-sm font-medium mb-4">Custom Date Range</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
              <div>
                <Label className="text-sm font-medium">Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1"
                  data-testid="input-start-date"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">End Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-1"
                  data-testid="input-end-date"
                />
              </div>
              <div>
                <Button 
                  onClick={handleCustomDateApply}
                  disabled={!startDate || !endDate}
                  className="w-full"
                  data-testid="button-apply-custom-date"
                >
                  Apply Range
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
