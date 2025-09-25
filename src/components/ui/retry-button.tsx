import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface RetryButtonProps {
  onRetry: () => Promise<void> | void;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
  variant?: "default" | "outline" | "secondary" | "destructive" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

export function RetryButton({
  onRetry,
  disabled = false,
  className,
  children,
  variant = "outline",
  size = "sm",
}: RetryButtonProps) {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    if (disabled || isRetrying) return;
    
    try {
      setIsRetrying(true);
      await onRetry();
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <Button
      onClick={handleRetry}
      disabled={disabled || isRetrying}
      variant={variant}
      size={size}
      className={cn("gap-2", className)}
    >
      <RefreshCw className={cn("h-4 w-4", isRetrying && "animate-spin")} />
      {children || (isRetrying ? "Retrying..." : "Retry")}
    </Button>
  );
}