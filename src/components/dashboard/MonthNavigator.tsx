import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { format, addMonths, subMonths, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

interface MonthNavigatorProps {
  selectedMonth: string; // Format: "YYYY-MM"
  onMonthChange: (month: string) => void;
  className?: string;
}

export function MonthNavigator({ selectedMonth, onMonthChange, className }: MonthNavigatorProps) {
  const currentMonth = new Date();
  const selectedDate = parseISO(`${selectedMonth}-01`);
  
  const goToPreviousMonth = () => {
    const previousMonth = subMonths(selectedDate, 1);
    onMonthChange(format(previousMonth, "yyyy-MM"));
  };

  const goToNextMonth = () => {
    const nextMonth = addMonths(selectedDate, 1);
    onMonthChange(format(nextMonth, "yyyy-MM"));
  };

  const goToCurrentMonth = () => {
    onMonthChange(format(currentMonth, "yyyy-MM"));
  };

  const isCurrentMonth = selectedMonth === format(currentMonth, "yyyy-MM");

  return (
    <div className={cn("flex max-w-full flex-wrap items-center gap-1 rounded-lg border bg-card p-1", className)}>
      <Button
        variant="ghost"
        size="sm"
        onClick={goToPreviousMonth}
        aria-label="Previous month"
        className="h-9 w-9 shrink-0 p-0"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      
      <div className="flex items-center gap-2 min-w-0 px-1">
        <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <span className="font-medium text-sm">
          {format(selectedDate, "MMMM yyyy")}
        </span>
      </div>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={goToNextMonth}
        aria-label="Next month"
        className="h-9 w-9 shrink-0 p-0"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      {!isCurrentMonth && (
        <Button
          variant="ghost"
          size="sm"
          onClick={goToCurrentMonth}
          className="text-xs px-2 h-8"
        >
          Today
        </Button>
      )}
    </div>
  );
}
