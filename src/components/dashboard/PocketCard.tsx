import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, TrendingUp, TrendingDown, Edit, Trash, Star } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { formatCurrency, formatNumber } from "@/lib/utils";

interface PocketCardProps {
  pocket: {
    id: string;
    name: string;
    description?: string;
    budget_amount: number;
    current_amount: number;
    cycle_type: string;
    color: string;
    is_featured: boolean;
  };
  onEdit?: () => void;
  onDelete?: (id: string) => void;
  onToggleFeatured?: (id: string) => void;
  onClick?: () => void;
}

export function PocketCard({
  pocket,
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

  const { id, name, description, budget_amount, current_amount, cycle_type, color, is_featured } = pocket;
  const percentageUsed = budget_amount > 0 ? (current_amount / budget_amount) * 100 : 0;
  const remaining = budget_amount - current_amount;
  const isOverBudget = current_amount > budget_amount;

  const handleDelete = () => {
    onDelete?.(id);
    setShowDeleteDialog(false);
  };

  return (
    <>
      <Card 
        className="bg-gradient-card border-0 shadow-lg hover:shadow-xl transition-smooth cursor-pointer transform hover:scale-105"
        onClick={onClick}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div 
                className="w-4 h-4 rounded-full" 
                style={{ backgroundColor: color }}
              />
              <div>
                <CardTitle className="text-lg font-semibold">{name}</CardTitle>
                {description && (
                  <CardDescription className="text-sm text-muted-foreground">
                    {description}
                  </CardDescription>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {is_featured && (
                <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300 border-amber-200 dark:border-amber-800">
                  <Star className="h-3 w-3 mr-1 fill-current" />
                  Featured
                </Badge>
              )}
              <Badge variant="secondary" className="text-xs">
                {cycle_type}
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
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
        <CardContent className="space-y-4">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-2xl font-bold">
                {formatCurrency(current_amount)}
              </p>
              <p className="text-sm text-muted-foreground">
                of {formatCurrency(budget_amount)} budget
              </p>
            </div>
            <div className="text-right">
              <p className={`text-sm font-medium ${isOverBudget ? 'text-destructive' : remaining < budget_amount * 0.2 ? 'text-yellow-600' : 'text-success'}`}>
                {isOverBudget ? (
                  <>
                    <TrendingUp className="inline w-4 h-4 mr-1" />
                    {formatCurrency(Math.abs(remaining))} over
                  </>
                ) : (
                  <>
                    <TrendingDown className="inline w-4 h-4 mr-1" />
                    {formatCurrency(remaining)} left
                  </>
                )}
              </p>
            </div>
          </div>
          
          <div className="space-y-2">
            <Progress 
              value={Math.min(percentageUsed, 100)} 
              className={`h-2 ${isOverBudget ? 'bg-destructive/20' : ''}`}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0%</span>
              <span className={isOverBudget ? 'text-destructive font-medium' : ''}>
                {formatNumber(percentageUsed)}%
              </span>
              <span>100%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Pocket</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{name}"? This action cannot be undone and will remove all associated data.
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