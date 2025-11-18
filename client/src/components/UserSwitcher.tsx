import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User } from "lucide-react";

interface UserSwitcherProps {
  selectedUserId: number | null;
  onUserChange: (userId: number | null) => void;
}

export function UserSwitcher({ selectedUserId, onUserChange }: UserSwitcherProps) {
  const { user } = useAuth();
  const { data: users, isLoading } = trpc.users.list.useQuery();

  // Only show for admin users
  if (user?.role !== "admin") {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <User className="h-4 w-4" />
        <span>Loading users...</span>
      </div>
    );
  }

  const currentViewUser = selectedUserId
    ? users?.find((u) => u.id === selectedUserId)
    : user;

  return (
    <div className="flex items-center gap-2">
      <User className="h-4 w-4 text-muted-foreground" />
      <Select
        value={selectedUserId?.toString() || user?.id.toString()}
        onValueChange={(value) => {
          const userId = value === user?.id.toString() ? null : parseInt(value);
          onUserChange(userId);
        }}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue>
            {currentViewUser?.name || currentViewUser?.email || "Select user"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={user?.id.toString() || ""}>
            {user?.name || user?.email} (You)
          </SelectItem>
          {users
            ?.filter((u) => u.id !== user?.id)
            .map((u) => (
              <SelectItem key={u.id} value={u.id.toString()}>
                {u.name || u.email}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
      {selectedUserId && selectedUserId !== user?.id && (
        <span className="text-xs text-muted-foreground">
          Viewing as: <strong>{currentViewUser?.name || currentViewUser?.email}</strong>
        </span>
      )}
    </div>
  );
}
