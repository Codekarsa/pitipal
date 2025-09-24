import * as React from "react";
import { cn } from "@/lib/utils";

interface CurrencyInputProps extends Omit<React.ComponentProps<"input">, "onChange"> {
  value: string;
  onChange: (value: string) => void;
  allowNegative?: boolean;
}

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ className, value, onChange, allowNegative = false, ...props }, ref) => {
    const formatNumber = (num: string) => {
      // Remove all non-numeric characters except decimal point and negative sign
      let cleaned = num.replace(/[^\d.-]/g, '');
      
      // Handle negative sign
      if (!allowNegative) {
        cleaned = cleaned.replace(/-/g, '');
      } else {
        // Ensure only one negative sign at the beginning
        const hasNegative = cleaned.startsWith('-');
        cleaned = cleaned.replace(/-/g, '');
        if (hasNegative) cleaned = '-' + cleaned;
      }
      
      // Ensure only one decimal point
      const parts = cleaned.split('.');
      if (parts.length > 2) {
        cleaned = parts[0] + '.' + parts.slice(1).join('');
      }
      
      // Limit decimal places to 2
      if (parts.length === 2) {
        cleaned = parts[0] + '.' + parts[1].slice(0, 2);
      }
      
      return cleaned;
    };

    const formatDisplay = (num: string) => {
      if (!num || num === '' || num === '-') return num;
      
      const parts = num.split('.');
      const integerPart = parts[0];
      const decimalPart = parts[1];
      
      // Add thousand separators to integer part
      const formatted = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      
      return decimalPart !== undefined ? formatted + '.' + decimalPart : formatted;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value;
      const cleaned = formatNumber(rawValue);
      onChange(cleaned);
    };

    const displayValue = formatDisplay(value);

    return (
      <input
        type="text"
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        ref={ref}
        value={displayValue}
        onChange={handleChange}
        {...props}
      />
    );
  },
);
CurrencyInput.displayName = "CurrencyInput";

export { CurrencyInput };