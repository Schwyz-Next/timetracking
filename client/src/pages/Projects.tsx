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
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Archive, Copy, Users } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { Progress } from "@/components/ui/progress";
import ManageQuotasDialog from "@/components/ManageQuotasDialog";

export default function Projects() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<number | null>(null);
  const [managingQuotasProject, setManagingQuotasProject] = useState<{ id: number; name: string; totalQuotaHours: number } | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    hourlyRate: "",
    vatType: "inclusive" as "inclusive" | "exclusive",
    totalQuotaHours: "",
    warningThreshold: "80",
    year: new Date().getFullYear().toString(),
    status: "active" as "active" | "archived",
  });

  const utils = trpc.useUtils();
  const { data: projects, isLoading } = trpc.projects.list.useQuery({});
  const createProject = trpc.projects.create.useMutation({
    onSuccess: () => {
      utils.projects.list.invalidate();
      setIsCreateDialogOpen(false);
      resetForm();
      toast.success("Project created successfully");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateProject = trpc.projects.update.useMutation({
    onSuccess: () => {
      utils.projects.list.invalidate();
      setEditingProject(null);
      resetForm();
      toast.success("Project updated successfully");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const cloneProject = trpc.projects.clone.useMutation({
    onSuccess: () => {
      utils.projects.list.invalidate();
      toast.success("Project cloned successfully");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      hourlyRate: "",
      vatType: "inclusive",
      totalQuotaHours: "",
      warningThreshold: "80",
      year: new Date().getFullYear().toString(),
      status: "active",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const data = {
      name: formData.name,
      hourlyRate: parseFloat(formData.hourlyRate),
      vatType: formData.vatType,
      totalQuotaHours: parseInt(formData.totalQuotaHours),
      warningThreshold: parseInt(formData.warningThreshold),
      year: parseInt(formData.year),
      status: formData.status,
    };

    if (editingProject) {
      updateProject.mutate({ id: editingProject, ...data });
    } else {
      createProject.mutate(data);
    }
  };

  const handleEdit = (project: any) => {
    setEditingProject(project.id);
    setFormData({
      name: project.name,
      hourlyRate: project.hourlyRate.toString(),
      vatType: project.vatType,
      totalQuotaHours: project.totalQuotaHours.toString(),
      warningThreshold: project.warningThreshold.toString(),
      year: project.year.toString(),
      status: project.status,
    });
    setIsCreateDialogOpen(true);
  };

  const handleClone = (projectId: number) => {
    const newYear = prompt("Enter the year for the cloned project:");
    if (newYear && !isNaN(parseInt(newYear))) {
      cloneProject.mutate({ id: projectId, newYear: parseInt(newYear) });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Projects</h1>
            <p className="text-muted-foreground">
              Manage your projects and hour quotas
            </p>
          </div>
          <Button
            onClick={() => {
              resetForm();
              setEditingProject(null);
              setIsCreateDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">
            Loading projects...
          </div>
        ) : projects && projects.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Card key={project.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{project.name}</CardTitle>
                      <CardDescription>Year {project.year}</CardDescription>
                    </div>
                    <Badge variant={project.status === "active" ? "default" : "secondary"}>
                      {project.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Rate</span>
                      <span className="font-medium">
                        CHF {project.hourlyRate}/h{" "}
                        <span className="text-xs text-muted-foreground">
                          ({project.vatType === "inclusive" ? "incl." : "excl."} VAT)
                        </span>
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Quota</span>
                      <span className="font-medium">
                        {project.usedHours.toFixed(1)}h / {project.userQuotaHours}h
                      </span>
                    </div>
                    <Progress
                      value={Math.min(project.usagePercentage, 100)}
                      className={
                        project.isWarning
                          ? "bg-destructive/20 [&>div]:bg-destructive"
                          : ""
                      }
                    />
                    <div className="text-xs text-muted-foreground text-right">
                      {project.usagePercentage.toFixed(1)}% used
                      {project.isWarning && (
                        <span className="text-destructive ml-1">
                          (Warning: ≥{project.warningThreshold}%)
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(project)}
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setManagingQuotasProject({ id: project.id, name: project.name, totalQuotaHours: project.totalQuotaHours })}
                      title="Manage User Quotas"
                    >
                      <Users className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleClone(project.id)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground mb-4">No projects yet</p>
              <Button
                onClick={() => {
                  resetForm();
                  setIsCreateDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Project
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-md">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editingProject ? "Edit Project" : "Create New Project"}
                </DialogTitle>
                <DialogDescription>
                  Set up a project with hourly rate and quota limits
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Project Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="hourlyRate">Hourly Rate (CHF)</Label>
                    <Input
                      id="hourlyRate"
                      type="number"
                      step="0.01"
                      value={formData.hourlyRate}
                      onChange={(e) =>
                        setFormData({ ...formData, hourlyRate: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="vatType">VAT Type</Label>
                    <Select
                      value={formData.vatType}
                      onValueChange={(value: "inclusive" | "exclusive") =>
                        setFormData({ ...formData, vatType: value })
                      }
                    >
                      <SelectTrigger id="vatType">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="inclusive">Inclusive</SelectItem>
                        <SelectItem value="exclusive">Exclusive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="totalQuotaHours">Total Quota (hours)</Label>
                    <Input
                      id="totalQuotaHours"
                      type="number"
                      value={formData.totalQuotaHours}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          totalQuotaHours: e.target.value,
                        })
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="warningThreshold">Warning (%)</Label>
                    <Input
                      id="warningThreshold"
                      type="number"
                      min="0"
                      max="100"
                      value={formData.warningThreshold}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          warningThreshold: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="year">Year</Label>
                    <Input
                      id="year"
                      type="number"
                      min="2020"
                      max="2100"
                      value={formData.year}
                      onChange={(e) =>
                        setFormData({ ...formData, year: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value: "active" | "archived") =>
                        setFormData({ ...formData, status: value })
                      }
                    >
                      <SelectTrigger id="status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    setEditingProject(null);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingProject ? "Update" : "Create"} Project
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Manage Quotas Dialog */}
        {managingQuotasProject && (
          <ManageQuotasDialog
            projectId={managingQuotasProject.id}
            projectName={managingQuotasProject.name}
            totalQuotaHours={managingQuotasProject.totalQuotaHours}
            open={!!managingQuotasProject}
            onOpenChange={(open) => !open && setManagingQuotasProject(null)}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
