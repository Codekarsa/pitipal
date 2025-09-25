import { useState } from "react";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";

interface DeleteConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  description: string;
  itemName: string;
}

export function DeleteConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  itemName,
}: DeleteConfirmationDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    try {
      setIsDeleting(true);
      await onConfirm();
      onOpenChange(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <ConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={`${description} "${itemName}". This action cannot be undone and will remove all associated data.`}
      confirmText="Delete"
      cancelText="Cancel"
      onConfirm={handleConfirm}
      variant="destructive"
      isLoading={isDeleting}
    />
  );
}