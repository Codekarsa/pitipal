import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, CreditCard, ArrowUpDown, PiggyBank } from "lucide-react";
import { TransactionDialog } from "./TransactionDialog";
import { CreatePocketDialog } from "./CreatePocketDialog";

interface BudgetPocket {
  id: string;
  name: string;
  color: string;
  pocket_type: string;
}

interface QuickActionsCardProps {
  pockets: BudgetPocket[];
  onTransactionAdded: () => void;
  onPocketCreated: () => void;
}

export function QuickActionsCard({ pockets, onTransactionAdded, onPocketCreated }: QuickActionsCardProps) {
  const [showTransactionDialog, setShowTransactionDialog] = useState(false);
  const [showCreatePocket, setShowCreatePocket] = useState(false);
  const [transactionType, setTransactionType] = useState<"income" | "expense" | "investment">("expense");

  const handleQuickTransaction = (type: "income" | "expense" | "investment") => {
    setTransactionType(type);
    setShowTransactionDialog(true);
  };

  const handleTransactionSuccess = () => {
    setShowTransactionDialog(false);
    onTransactionAdded();
  };

  const handlePocketSuccess = () => {
    setShowCreatePocket(false);
    onPocketCreated();
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowUpDown className="h-5 w-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button 
            variant="outline" 
            className="w-full justify-start"
            onClick={() => handleQuickTransaction("expense")}
          >
            <CreditCard className="h-4 w-4 mr-2" />
            Add Expense
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full justify-start"
            onClick={() => handleQuickTransaction("income")}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Income
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full justify-start"
            onClick={() => setShowCreatePocket(true)}
          >
            <PiggyBank className="h-4 w-4 mr-2" />
            Create Pocket
          </Button>
        </CardContent>
      </Card>

      <TransactionDialog
        open={showTransactionDialog}
        onOpenChange={setShowTransactionDialog}
        onSuccess={handleTransactionSuccess}
        pockets={pockets}
      />
      
      <CreatePocketDialog
        open={showCreatePocket}
        onOpenChange={setShowCreatePocket}
        onSuccess={handlePocketSuccess}
      />
    </>
  );
}