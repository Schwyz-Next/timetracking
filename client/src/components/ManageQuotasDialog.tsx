import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface ManageQuotasDialogProps {
  projectId: number;
  projectName: string;
  totalQuotaHours: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ManageQuotasDialog({
  projectId,
  projectName,
  totalQuotaHours,
  open,
  onOpenChange,
}: ManageQuotasDialogProps) {
  const [quotas, setQuotas] = useState<Record<number, string>>({});
  
  const utils = trpc.useUtils();
  const { data: users, isLoading: usersLoading } = trpc.users.list.useQuery();
  const { data: existingQuotas, isLoading: quotasLoading } = trpc.userProjectQuotas.listByProject.useQuery(
    { projectId },
    { enabled: open }
  );

  const upsertQuota = trpc.userProjectQuotas.upsert.useMutation({
    onSuccess: () => {
      utils.projects.list.invalidate();
      utils.userProjectQuotas.listByProject.invalidate({ projectId });
    },
  });

  const deleteQuota = trpc.userProjectQuotas.delete.useMutation({
    onSuccess: () => {
      utils.projects.list.invalidate();
      utils.userProjectQuotas.listByProject.invalidate({ projectId });
    },
  });

  // Initialize quotas when dialog opens
  useEffect(() => {
    if (existingQuotas && users) {
      const initialQuotas: Record<number, string> = {};
      users.forEach((user) => {
        const existing = existingQuotas.find((q) => q.userId === user.id);
        initialQuotas[user.id] = existing ? existing.quotaHours.toString() : "";
      });
      setQuotas(initialQuotas);
    }
  }, [existingQuotas, users, open]);

  const handleSave = async () => {
    if (!users) return;

    try {
      const promises = users.map(async (user) => {
        const quotaValue = quotas[user.id];
        
        if (quotaValue && quotaValue.trim() !== "") {
          // Set or update quota
          const hours = parseInt(quotaValue);
          if (isNaN(hours) || hours < 0) {
            throw new Error(`Invalid quota for ${user.name}: must be a positive number`);
          }
          return upsertQuota.mutateAsync({
            userId: user.id,
            projectId,
            quotaHours: hours,
          });
        } else {
          // Delete quota if empty
          const existing = existingQuotas?.find((q) => q.userId === user.id);
          if (existing) {
            return deleteQuota.mutateAsync({
              userId: user.id,
              projectId,
            });
          }
        }
      });

      await Promise.all(promises);
      
      toast.success("Quotas updated successfully");
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to update quotas");
    }
  };

  const totalAllocated = Object.values(quotas).reduce((sum, value) => {
    const num = parseInt(value);
    return sum + (isNaN(num) ? 0 : num);
  }, 0);

  const isOverAllocated = totalAllocated > totalQuotaHours;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage User Quotas</DialogTitle>
          <DialogDescription>
            Set individual hour allocations for each user on "{projectName}".
            <br />
            Total project quota: {totalQuotaHours}h
          </DialogDescription>
        </DialogHeader>

        {usersLoading || quotasLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {users?.map((user) => (
              <div key={user.id} className="flex items-center gap-4">
                <Label htmlFor={`quota-${user.id}`} className="w-48 truncate">
                  {user.name || user.email || user.username || `User ${user.id}`}
                </Label>
                <div className="flex items-center gap-2 flex-1">
                  <Input
                    id={`quota-${user.id}`}
                    type="number"
                    min="0"
                    placeholder="Hours (leave empty for default)"
                    value={quotas[user.id] || ""}
                    onChange={(e) =>
                      setQuotas({ ...quotas, [user.id]: e.target.value })
                    }
                    className="w-32"
                  />
                  <span className="text-sm text-muted-foreground">hours</span>
                </div>
              </div>
            ))}

            <div className="border-t pt-4 mt-4">
              <div className="flex justify-between items-center">
                <span className="font-medium">Total Allocated:</span>
                <span className={isOverAllocated ? "text-destructive font-bold" : "font-medium"}>
                  {totalAllocated}h / {totalQuotaHours}h
                </span>
              </div>
              {isOverAllocated && (
                <p className="text-sm text-destructive mt-2">
                  Warning: Total allocated hours exceed project quota by {totalAllocated - totalQuotaHours}h
                </p>
              )}
              <p className="text-sm text-muted-foreground mt-2">
                Users without individual quotas will see the full project quota ({totalQuotaHours}h).
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={upsertQuota.isPending || deleteQuota.isPending}
          >
            {upsertQuota.isPending || deleteQuota.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Quotas"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
