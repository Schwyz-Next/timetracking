import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Search, RefreshCw, FileText } from "lucide-react";

export default function AuditLogs() {
  const [filters, setFilters] = useState({
    action: "all",
    entityType: "all",
    startDate: "",
    endDate: "",
  });
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const { data: logs, isLoading, refetch } = trpc.auditLogs.list.useQuery({
    action: filters.action === "all" ? "" : filters.action,
    entityType: filters.entityType === "all" ? "" : filters.entityType,
    startDate: filters.startDate,
    endDate: filters.endDate,
    limit: pageSize,
    offset: page * pageSize,
  });

  const { data: totalCount } = trpc.auditLogs.count.useQuery({
    action: filters.action === "all" ? "" : filters.action,
    entityType: filters.entityType === "all" ? "" : filters.entityType,
    startDate: filters.startDate,
    endDate: filters.endDate,
  });

  const handleFilterChange = (key: string, value: string) => {
    setFilters({ ...filters, [key]: value });
    setPage(0); // Reset to first page when filtering
  };

  const handleClearFilters = () => {
    setFilters({
      action: "all",
      entityType: "all",
      startDate: "",
      endDate: "",
    });
    setPage(0);
  };

  const getActionBadgeVariant = (action: string) => {
    if (action.includes("created")) return "default";
    if (action.includes("updated") || action.includes("changed")) return "secondary";
    if (action.includes("deleted")) return "destructive";
    if (action.includes("login")) return "outline";
    return "secondary";
  };

  const totalPages = totalCount ? Math.ceil(totalCount / pageSize) : 0;

  return (
    <DashboardLayout>
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Audit Logs</h1>
          <p className="text-muted-foreground mt-2">
            View all system activity and user actions
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Filters
            </CardTitle>
            <CardDescription>Filter audit logs by action, entity type, or date range</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Action</Label>
                <Select
                  value={filters.action}
                  onValueChange={(value) => handleFilterChange("action", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All actions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All actions</SelectItem>
                    <SelectItem value="user">User actions</SelectItem>
                    <SelectItem value="project">Project actions</SelectItem>
                    <SelectItem value="time_entry">Time entry actions</SelectItem>
                    <SelectItem value="invoice">Invoice actions</SelectItem>
                    <SelectItem value="login">Logins</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Entity Type</Label>
                <Select
                  value={filters.entityType}
                  onValueChange={(value) => handleFilterChange("entityType", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="project">Project</SelectItem>
                    <SelectItem value="time_entry">Time Entry</SelectItem>
                    <SelectItem value="invoice">Invoice</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange("startDate", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange("endDate", e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={handleClearFilters}>
                Clear Filters
              </Button>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Audit Logs Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Activity Log
            </CardTitle>
            <CardDescription>
              {totalCount ? `${totalCount} total entries` : "No entries found"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-muted-foreground">Loading audit logs...</div>
              </div>
            ) : !logs || logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No audit logs found</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Activity will appear here as users perform actions
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Entity</TableHead>
                        <TableHead>IP Address</TableHead>
                        <TableHead>Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="whitespace-nowrap">
                            {format(new Date(log.createdAt), "MMM d, yyyy HH:mm:ss")}
                          </TableCell>
                          <TableCell>
                            {log.userName || log.userId || "System"}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getActionBadgeVariant(log.action)}>
                              {log.action}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {log.entityType && log.entityId
                              ? `${log.entityType} #${log.entityId}`
                              : "-"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {log.ipAddress || "-"}
                          </TableCell>
                          <TableCell className="max-w-md">
                            {log.newValue && (
                              <details className="text-xs">
                                <summary className="cursor-pointer text-primary hover:underline">
                                  View changes
                                </summary>
                                <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-40">
                                  {JSON.stringify(JSON.parse(log.newValue), null, 2)}
                                </pre>
                              </details>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-muted-foreground">
                      Page {page + 1} of {totalPages}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(page - 1)}
                        disabled={page === 0}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(page + 1)}
                        disabled={page >= totalPages - 1}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
