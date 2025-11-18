import { useState } from "react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Calendar, Clock, Download } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { format } from "date-fns";
import { UserSwitcher } from "@/components/UserSwitcher";

export default function TimeEntries() {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<number | null>(null);
  const [useManualEntry, setUseManualEntry] = useState(false);
  const [formData, setFormData] = useState({
    projectId: "",
    categoryId: "",
    date: new Date().toISOString().split("T")[0],
    startTime: "",
    endTime: "",
    durationHours: "",
    description: "",
    kilometers: "",
  });

  const utils = trpc.useUtils();
  
  // Calculate start and end dates for the selected month (using UTC to avoid timezone issues)
  const startDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
  const lastDay = new Date(Date.UTC(selectedYear, selectedMonth, 0)).getUTCDate();
  const endDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  
  const { data: entries, isLoading } = trpc.timeEntries.list.useQuery({
    startDate,
    endDate,
    limit: 1000,
    userId: selectedUserId || undefined,
  });
  const { data: projects } = trpc.projects.list.useQuery({ 
    status: "active",
    userId: selectedUserId || undefined,
  });
  const { data: categories } = trpc.categories.list.useQuery();

  const createEntry = trpc.timeEntries.create.useMutation({
    onSuccess: () => {
      utils.timeEntries.list.invalidate();
      utils.timeEntries.getSummary.invalidate();
      utils.projects.list.invalidate();
      setIsCreateDialogOpen(false);
      resetForm();
      toast.success("Time entry created successfully");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateEntry = trpc.timeEntries.update.useMutation({
    onSuccess: () => {
      utils.timeEntries.list.invalidate();
      utils.timeEntries.getSummary.invalidate();
      utils.projects.list.invalidate();
      setEditingEntry(null);
      resetForm();
      toast.success("Time entry updated successfully");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteEntry = trpc.timeEntries.delete.useMutation({
    onSuccess: () => {
      utils.timeEntries.list.invalidate();
      utils.timeEntries.getSummary.invalidate();
      utils.projects.list.invalidate();
      toast.success("Time entry deleted successfully");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const exportPDF = trpc.timeReports.exportMonthlyPDF.useMutation({
    onSuccess: (data) => {
      // Convert base64 to blob and download
      const blob = new Blob(
        [Uint8Array.from(atob(data.pdf), c => c.charCodeAt(0))],
        { type: "application/pdf" }
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = data.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("PDF report generated successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to generate PDF");
    },
  });

  const handleExportPDF = () => {
    exportPDF.mutate({
      year: selectedYear,
      month: selectedMonth,
    });
  };

  const resetForm = () => {
    setFormData({
      projectId: "",
      categoryId: "",
      date: new Date().toISOString().split("T")[0],
      startTime: "",
      endTime: "",
      durationHours: "",
      description: "",
      kilometers: "",
    });
    setUseManualEntry(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const data: any = {
      projectId: parseInt(formData.projectId),
      categoryId: parseInt(formData.categoryId),
      date: formData.date,
      description: formData.description || undefined,
      kilometers: formData.kilometers ? parseFloat(formData.kilometers) : undefined,
    };

    if (useManualEntry) {
      data.durationHours = parseFloat(formData.durationHours);
    } else {
      data.startTime = formData.startTime;
      data.endTime = formData.endTime;
    }

    if (editingEntry) {
      updateEntry.mutate({ id: editingEntry, ...data });
    } else {
      createEntry.mutate(data);
    }
  };

  const handleEdit = (entry: any) => {
    setEditingEntry(entry.entry.id);
    const entryDate = new Date(entry.entry.date);
    setFormData({
      projectId: entry.entry.projectId.toString(),
      categoryId: entry.entry.categoryId.toString(),
      date: entryDate.toISOString().split("T")[0],
      startTime: entry.entry.startTime || "",
      endTime: entry.entry.endTime || "",
      durationHours: (entry.entry.durationHours / 100).toString(),
      description: entry.entry.description || "",
      kilometers: entry.entry.kilometers?.toString() || "",
    });
    setUseManualEntry(!entry.entry.startTime);
    setIsCreateDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this time entry?")) {
      deleteEntry.mutate({ id });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Time Entries</h1>
            <p className="text-muted-foreground">Track your working hours</p>
          </div>
          <div className="flex items-center gap-4">
            <UserSwitcher 
              selectedUserId={selectedUserId} 
              onUserChange={setSelectedUserId}
            />
            <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleExportPDF}
              disabled={exportPDF.isPending}
            >
              <Download className="h-4 w-4 mr-2" />
              {exportPDF.isPending ? "Generating..." : "Export PDF"}
            </Button>
            <Button
              onClick={() => {
                resetForm();
                setEditingEntry(null);
                setIsCreateDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Entry
            </Button>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Time Entries</CardTitle>
                <CardDescription>Your time tracking entries</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={selectedMonth.toString()}
                  onValueChange={(value) => setSelectedMonth(parseInt(value))}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">January</SelectItem>
                    <SelectItem value="2">February</SelectItem>
                    <SelectItem value="3">March</SelectItem>
                    <SelectItem value="4">April</SelectItem>
                    <SelectItem value="5">May</SelectItem>
                    <SelectItem value="6">June</SelectItem>
                    <SelectItem value="7">July</SelectItem>
                    <SelectItem value="8">August</SelectItem>
                    <SelectItem value="9">September</SelectItem>
                    <SelectItem value="10">October</SelectItem>
                    <SelectItem value="11">November</SelectItem>
                    <SelectItem value="12">December</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={selectedYear.toString()}
                  onValueChange={(value) => setSelectedYear(parseInt(value))}
                >
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2024">2024</SelectItem>
                    <SelectItem value="2025">2025</SelectItem>
                    <SelectItem value="2026">2026</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Monthly Summary by Project */}
            {entries && entries.length > 0 && (
              <div className="mb-6 p-4 bg-muted/50 rounded-lg">
                <h3 className="text-sm font-semibold mb-3">Monthly Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {(() => {
                    const projectSummary = entries.reduce((acc, entry) => {
                      const projectName = entry.project?.name || "Unknown";
                      const hours = entry.entry.durationHours / 100;
                      if (!acc[projectName]) {
                        acc[projectName] = 0;
                      }
                      acc[projectName] += hours;
                      return acc;
                    }, {} as Record<string, number>);
                    
                    return Object.entries(projectSummary)
                      .sort(([, a], [, b]) => b - a)
                      .map(([projectName, hours]) => (
                        <div key={projectName} className="flex justify-between items-center p-2 bg-background rounded border">
                          <span className="font-medium text-sm">{projectName}</span>
                          <span className="text-sm font-semibold">{hours.toFixed(2)}h</span>
                        </div>
                      ));
                  })()}
                </div>
                <div className="mt-3 pt-3 border-t flex justify-between items-center">
                  <span className="text-sm font-semibold">Total Hours</span>
                  <span className="text-lg font-bold">
                    {entries.reduce((sum, entry) => sum + (entry.entry.durationHours / 100), 0).toFixed(2)}h
                  </span>
                </div>
              </div>
            )}
            
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading entries...
              </div>
            ) : entries && entries.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((entry) => {
                      const entryDate = new Date(entry.entry.date);
                      const hours = entry.entry.durationHours / 100;
                      return (
                        <TableRow key={entry.entry.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              {format(entryDate, "MMM dd, yyyy")}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">
                              {entry.project?.name || "Unknown"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {entry.category?.code || "N/A"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              {hours.toFixed(2)}h
                              {entry.entry.startTime && entry.entry.endTime && (
                                <span className="text-xs text-muted-foreground">
                                  ({entry.entry.startTime} - {entry.entry.endTime})
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {entry.entry.description || "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(entry)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(entry.entry.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">No time entries yet</p>
                <Button
                  onClick={() => {
                    resetForm();
                    setIsCreateDialogOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Entry
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create/Edit Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editingEntry ? "Edit Time Entry" : "Add Time Entry"}
                </DialogTitle>
                <DialogDescription>
                  Record your working hours for a project
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) =>
                      setFormData({ ...formData, date: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="project">Project</Label>
                  <Select
                    value={formData.projectId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, projectId: value })
                    }
                    required
                  >
                    <SelectTrigger id="project">
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects?.map((project) => (
                        <SelectItem key={project.id} value={project.id.toString()}>
                          {project.name} (CHF {project.hourlyRate}/h)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formData.categoryId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, categoryId: value })
                    }
                    required
                  >
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories?.map((category) => (
                        <SelectItem
                          key={category.id}
                          value={category.id.toString()}
                        >
                          {category.code} - {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="useManualEntry"
                      checked={useManualEntry}
                      onChange={(e) => setUseManualEntry(e.target.checked)}
                      className="rounded"
                    />
                    <Label htmlFor="useManualEntry" className="cursor-pointer">
                      Enter hours manually
                    </Label>
                  </div>
                </div>

                {useManualEntry ? (
                  <div className="space-y-2">
                    <Label htmlFor="durationHours">Duration (hours)</Label>
                    <Input
                      id="durationHours"
                      type="number"
                      step="0.25"
                      min="0"
                      value={formData.durationHours}
                      onChange={(e) =>
                        setFormData({ ...formData, durationHours: e.target.value })
                      }
                      placeholder="e.g., 2.5"
                      required
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="startTime">Start Time</Label>
                      <Input
                        id="startTime"
                        type="time"
                        value={formData.startTime}
                        onChange={(e) =>
                          setFormData({ ...formData, startTime: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="endTime">End Time</Label>
                      <Input
                        id="endTime"
                        type="time"
                        value={formData.endTime}
                        onChange={(e) =>
                          setFormData({ ...formData, endTime: e.target.value })
                        }
                        required
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="What did you work on?"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="kilometers">Kilometers (optional)</Label>
                  <Input
                    id="kilometers"
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.kilometers}
                    onChange={(e) =>
                      setFormData({ ...formData, kilometers: e.target.value })
                    }
                    placeholder="e.g., 25.5"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    setEditingEntry(null);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingEntry ? "Update" : "Create"} Entry
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
