import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { format, addMonths, subMonths, parseISO } from "date-fns";

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
    <div className={`flex items-center gap-2 ${className}`}>
      <Button
        variant="outline"
        size="sm"
        onClick={goToPreviousMonth}
        className="h-8 w-8 p-0"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      
      <div className="flex items-center gap-2 min-w-0">
        <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <span className="font-medium text-sm">
          {format(selectedDate, "MMMM yyyy")}
        </span>
      </div>
      
      <Button
        variant="outline"
        size="sm"
        onClick={goToNextMonth}
        className="h-8 w-8 p-0"
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