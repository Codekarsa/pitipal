import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { MoreHorizontal, TrendingUp, Edit, Trash, Star } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { CompactAmount } from "@/components/ui/compact-amount";

interface PocketCardProps {
  pocket: {
    id?: string;
    pocketId?: string;
    name?: string;
    pocketName?: string;
    description?: string;
    budget_amount?: number;
    budgetAmount?: number;
    baseBudgetAmount?: number;
    carriedOverAmount?: number;
    pocket_type?: string;
    current_amount?: number;
    currentAmount?: number;
    cycle_type?: string;
    budget_type?: string;
    color?: string;
    is_featured?: boolean;
  };
  currency?: string;
  onEdit?: () => void;
  onDelete?: (id: string) => void;
  onToggleFeatured?: (id: string) => void;
  onClick?: () => void;
}

export function PocketCard({
  pocket,
  currency = 'USD',
  onEdit,
  onDelete,
  onToggleFeatured,
  onClick,
}: PocketCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  // Add defensive check for undefined pocket
  if (!pocket) {
    return null;
  }

  // Support both old and new data structures
  const id = pocket.id || pocket.pocketId || '';
  const name = pocket.name || pocket.pocketName || '';
  const description = pocket.description;
  const budget_amount = pocket.budget_amount || pocket.budgetAmount || 0;
  const current_amount = pocket.current_amount || pocket.currentAmount || 0;
  const color = pocket.color || '#3B82F6';
  const is_featured = pocket.is_featured || false;
  const percentageUsed = budget_amount > 0 ? (current_amount / budget_amount) * 100 : 0;
  const remaining = budget_amount - current_amount;
  const isOverBudget = current_amount > budget_amount;

  const handleDelete = () => {
    onDelete?.(id);
    setShowDeleteDialog(false);
  };

  return (
    <>
      <Card className="relative rounded-[1.5rem] border-border/60 bg-card shadow-none transition-colors hover:border-primary/40">
        <CardHeader className="p-5 pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-start gap-3">
              <div 
                className="mt-1.5 h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: color }}
              />
              <div className="min-w-0">
                <CardTitle className="text-base font-medium leading-snug break-words"><button onClick={onClick} className="text-left after:absolute after:inset-0 after:rounded-[1.5rem] hover:text-primary focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring" aria-label={`View transactions for ${name}`}>{name}</button></CardTitle>
                {description && (
                  <CardDescription className="text-sm text-muted-foreground">
                    {description}
                  </CardDescription>
                )}
              </div>
            </div>
            <div className="relative z-10 flex shrink-0 items-center gap-1">
              {is_featured && (
                <span title="Featured"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" /><span className="sr-only">Featured</span></span>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label={`Actions for ${name}`} onClick={e => e.stopPropagation()}>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onToggleFeatured?.(id); }}>
                    <Star className="mr-2 h-4 w-4" />
                    {is_featured ? 'Unfeature' : 'Feature'}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit?.(); }}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      setShowDeleteDialog(true);
                    }}
                    className="text-destructive"
                  >
                    <Trash className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-5 pt-0">
          <div className="grid gap-3">
            <div>
              <p className="text-xs text-muted-foreground">{pocket.pocket_type === 'income' ? 'Received' : 'Spent'}</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">
                <CompactAmount amount={current_amount} currency={currency} label={`${name} spent`} />
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                of <CompactAmount amount={budget_amount} currency={currency} label={`${name} budget`} /> budget
              </p>
            </div>
            <div>
              <p className={`text-sm font-medium ${isOverBudget ? 'text-destructive' : remaining < budget_amount * 0.2 ? 'text-yellow-600' : 'text-success'}`}>
                {isOverBudget ? (
                  <>
                    <TrendingUp className="inline w-4 h-4 mr-1" />
                    <CompactAmount amount={Math.abs(remaining)} currency={currency} label={`${name} over budget`} /> over
                  </>
                ) : (
                  <>
                    <CompactAmount amount={remaining} currency={currency} label={`${name} remaining`} /> left
                  </>
                )}
              </p>
            </div>
          </div>
          
          <div className="space-y-2">
            <Progress 
              value={Math.max(0, Math.min(percentageUsed, 100))}
              aria-label={`${name} budget used`}
              className={`h-1.5 bg-muted ${isOverBudget ? '[&>div]:bg-destructive' : percentageUsed >= 80 ? '[&>div]:bg-amber-500' : '[&>div]:bg-primary/70'}`}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span className={isOverBudget ? 'text-destructive font-medium' : ''}>
                {formatNumber(percentageUsed)}% {pocket.pocket_type === 'income' ? 'received' : 'used'}
              </span>
            </div>
          </div>
          {(pocket.carriedOverAmount ?? 0) > 0 && <p className="border-t pt-3 text-xs text-muted-foreground break-words">Includes {formatCurrency(pocket.carriedOverAmount!, currency)} carried from last month</p>}
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Pocket</AlertDialogTitle>
            <AlertDialogDescription>
              Hide "{name}" from your active budgets? Existing transactions are kept. Their expenses remain in your monthly totals.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Pocket
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
