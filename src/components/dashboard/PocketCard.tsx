import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, TrendingUp, TrendingDown, Edit, Trash } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface PocketCardProps {
  id: string;
  name: string;
  description?: string;
  budgetAmount: number;
  currentAmount: number;
  cycleType: string;
  color: string;
  onEdit?: () => void;
  onDelete?: () => void;
  onClick?: () => void;
}

export function PocketCard({
  id,
  name,
  description,
  budgetAmount,
  currentAmount,
  cycleType,
  color,
  onEdit,
  onDelete,
  onClick,
}: PocketCardProps) {
  const percentageUsed = budgetAmount > 0 ? (currentAmount / budgetAmount) * 100 : 0;
  const remaining = budgetAmount - currentAmount;
  const isOverBudget = currentAmount > budgetAmount;

  return (
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
            <Badge variant="secondary" className="text-xs">
              {cycleType}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit?.(); }}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
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
              ${currentAmount.toFixed(2)}
            </p>
            <p className="text-sm text-muted-foreground">
              of ${budgetAmount.toFixed(2)} budget
            </p>
          </div>
          <div className="text-right">
            <p className={`text-sm font-medium ${isOverBudget ? 'text-destructive' : remaining < budgetAmount * 0.2 ? 'text-yellow-600' : 'text-success'}`}>
              {isOverBudget ? (
                <>
                  <TrendingUp className="inline w-4 h-4 mr-1" />
                  ${Math.abs(remaining).toFixed(2)} over
                </>
              ) : (
                <>
                  <TrendingDown className="inline w-4 h-4 mr-1" />
                  ${remaining.toFixed(2)} left
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
              {percentageUsed.toFixed(1)}%
            </span>
            <span>100%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}