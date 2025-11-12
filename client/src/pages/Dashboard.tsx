import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { AlertCircle, Plus, Clock, TrendingUp } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import DashboardLayout from "@/components/DashboardLayout";

export default function Dashboard() {
  const { data: user } = trpc.auth.me.useQuery();
  const { data: projects, isLoading } = trpc.projects.list.useQuery({
    status: "active",
  });
  const { data: summary } = trpc.timeEntries.getSummary.useQuery({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  });

  const currentMonth = new Date().toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const totalHoursThisMonth = summary?.reduce((sum, item) => sum + item.totalHours, 0) || 0;

  const warningProjects = projects?.filter((p) => p.isWarning) || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Time Tracker Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.name || "User"}
          </p>
        </div>

        {/* Warnings */}
        {warningProjects.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Quota Warnings</AlertTitle>
            <AlertDescription>
              {warningProjects.length} project(s) have reached their warning threshold
            </AlertDescription>
          </Alert>
        )}

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Hours This Month
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalHoursThisMonth.toFixed(2)}h</div>
              <p className="text-xs text-muted-foreground">{currentMonth}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Projects
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{projects?.length || 0}</div>
              <p className="text-xs text-muted-foreground">Currently tracking</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Entries This Month
              </CardTitle>
              <Plus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summary?.reduce((sum, item) => sum + item.entryCount, 0) || 0}
              </div>
              <p className="text-xs text-muted-foreground">Time entries logged</p>
            </CardContent>
          </Card>
        </div>

        {/* Project Quotas */}
        <Card>
          <CardHeader>
            <CardTitle>Project Quotas</CardTitle>
            <CardDescription>
              Track your progress against project hour allocations
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading projects...
              </div>
            ) : projects && projects.length > 0 ? (
              <div className="space-y-6">
                {projects.map((project) => (
                  <div key={project.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{project.name}</h4>
                          {project.isWarning && (
                            <AlertCircle className="h-4 w-4 text-destructive" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {project.usedHours.toFixed(2)}h / {project.totalQuotaHours}h
                          ({project.usagePercentage.toFixed(1)}%)
                        </p>
                      </div>
                      <div className="text-right text-sm">
                        <div className="font-medium">
                          CHF {project.hourlyRate}/h
                        </div>
                        <div className="text-muted-foreground">
                          {project.vatType === "inclusive" ? "incl." : "excl."} VAT
                        </div>
                      </div>
                    </div>
                    <Progress
                      value={Math.min(project.usagePercentage, 100)}
                      className={
                        project.isWarning
                          ? "bg-destructive/20 [&>div]:bg-destructive"
                          : ""
                      }
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  No active projects yet
                </p>
                <Link href="/projects">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Project
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/time-entries/new">
                <Button className="w-full" size="lg">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Time Entry
                </Button>
              </Link>
              <Link href="/time-entries">
                <Button variant="outline" className="w-full">
                  View All Entries
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>This Month Summary</CardTitle>
            </CardHeader>
            <CardContent>
              {summary && summary.length > 0 ? (
                <div className="space-y-2">
                  {summary.slice(0, 5).map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {item.projectName} ({item.categoryCode})
                      </span>
                      <span className="font-medium">
                        {item.totalHours.toFixed(2)}h
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No entries this month yet
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
