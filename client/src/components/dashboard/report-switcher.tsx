import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type ReportType = "expense-breakdown" | "plan-vs-actual";

interface ReportSwitcherProps {
  value: ReportType;
  onChange: (value: ReportType) => void;
}

export default function ReportSwitcher({ value, onChange }: ReportSwitcherProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-muted-foreground">Report Type:</span>
      <Select 
        value={value} 
        onValueChange={(val) => onChange(val as ReportType)}
      >
        <SelectTrigger className="w-[220px]" data-testid="select-report-type">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="expense-breakdown" data-testid="option-expense-breakdown">
            Expense Breakdown
          </SelectItem>
          <SelectItem value="plan-vs-actual" data-testid="option-plan-vs-actual">
            Plan Vs Actual
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
