import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { AlertCircle, Plus, Clock, TrendingUp, Calendar } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import DashboardLayout from "@/components/DashboardLayout";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useMemo, useState } from "react";
import { UserSwitcher } from "@/components/UserSwitcher";

export default function Dashboard() {
  const { data: user } = trpc.auth.me.useQuery();
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  
  const { data: projects, isLoading } = trpc.projects.list.useQuery({
    status: "active",
    userId: selectedUserId || undefined,
  });
  
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();
  
  const { data: summary } = trpc.timeEntries.getSummary.useQuery({
    month: currentMonth,
    year: currentYear,
    userId: selectedUserId || undefined,
  });

  // Get last 3 months data
  const last3Months = useMemo(() => {
    const months = [];
    for (let i = 2; i >= 0; i--) {
      const date = new Date(currentYear, currentMonth - 1 - i, 1);
      months.push({
        month: date.getMonth() + 1,
        year: date.getFullYear(),
        name: date.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
      });
    }
    return months;
  }, [currentMonth, currentYear]);

  const { data: month1Data } = trpc.timeEntries.getSummary.useQuery({
    month: last3Months[0].month,
    year: last3Months[0].year,
    userId: selectedUserId || undefined,
  });
  
  const { data: month2Data } = trpc.timeEntries.getSummary.useQuery({
    month: last3Months[1].month,
    year: last3Months[1].year,
    userId: selectedUserId || undefined,
  });
  
  const { data: month3Data } = trpc.timeEntries.getSummary.useQuery({
    month: last3Months[2].month,
    year: last3Months[2].year,
    userId: selectedUserId || undefined,
  });

  // Get annual data (current year)
  const { data: annualData } = trpc.timeEntries.getSummary.useQuery({
    month: 0, // 0 means all months
    year: currentYear,
    userId: selectedUserId || undefined,
  });

  const monthlyStats = useMemo(() => {
    return [
      {
        name: last3Months[0].name,
        hours: month1Data?.reduce((sum, item) => sum + item.totalHours, 0) || 0,
      },
      {
        name: last3Months[1].name,
        hours: month2Data?.reduce((sum, item) => sum + item.totalHours, 0) || 0,
      },
      {
        name: last3Months[2].name,
        hours: month3Data?.reduce((sum, item) => sum + item.totalHours, 0) || 0,
      },
    ];
  }, [month1Data, month2Data, month3Data, last3Months]);

  const currentMonthFormatted = currentDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const totalHoursThisMonth = summary?.reduce((sum, item) => sum + item.totalHours, 0) || 0;
  const totalHoursAnnual = annualData?.reduce((sum, item) => sum + item.totalHours, 0) || 0;

  const warningProjects = projects?.filter((p) => p.isWarning) || [];
  const overQuotaProjects = projects?.filter((p) => p.usagePercentage >= 100) || [];

  // Helper function to get quota status color and message
  const getQuotaStatus = (project: any) => {
    const percentage = project.usagePercentage;
    const warningThreshold = project.warningThreshold || 80;
    const overageHours = project.usedHours - project.totalQuotaHours;

    // Show red if at or above 100% quota
    if (percentage >= 100) {
      return {
        color: "text-red-600",
        bgColor: "bg-red-100",
        progressColor: "[&>div]:bg-red-600",
        message: overageHours > 0 ? `Over by ${overageHours.toFixed(2)}h` : `${(100 - percentage).toFixed(1)}% remaining`,
        icon: true,
      };
    } else if (percentage >= warningThreshold) {
      // Show orange only if at warning threshold AND still under quota
      return {
        color: "text-orange-600",
        bgColor: "bg-orange-100",
        progressColor: "[&>div]:bg-orange-500",
        message: `${(100 - percentage).toFixed(1)}% remaining`,
        icon: true,
      };
    } else {
      return {
        color: "text-green-600",
        bgColor: "bg-green-100",
        progressColor: "[&>div]:bg-green-600",
        message: `${(100 - percentage).toFixed(1)}% remaining`,
        icon: false,
      };
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Time Tracker Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back, {user?.name || "User"}
            </p>
          </div>
          <UserSwitcher 
            selectedUserId={selectedUserId} 
            onUserChange={setSelectedUserId}
          />
        </div>

        {/* Warnings */}
        {overQuotaProjects.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Quota Exceeded</AlertTitle>
            <AlertDescription>
              {overQuotaProjects.length} project(s) have exceeded their quota
            </AlertDescription>
          </Alert>
        )}
        
        {warningProjects.length > 0 && overQuotaProjects.length === 0 && (
          <Alert className="border-orange-500 bg-orange-50 text-orange-900">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Quota Warnings</AlertTitle>
            <AlertDescription>
              {warningProjects.length} project(s) have reached their warning threshold
            </AlertDescription>
          </Alert>
        )}

        {/* Monthly Overview - Last 3 Months */}
        <div className="grid gap-4 md:grid-cols-4">
          {monthlyStats.map((stat, idx) => (
            <Card key={idx}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.name}
                </CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.hours.toFixed(1)}h</div>
                <p className="text-xs text-muted-foreground">Total hours</p>
              </CardContent>
            </Card>
          ))}
          
          {/* Annual Overview */}
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {currentYear} Annual
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{totalHoursAnnual.toFixed(1)}h</div>
              <p className="text-xs text-muted-foreground">Year to date</p>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Last 3 Months Trend</CardTitle>
            <CardDescription>Hours worked per month</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={monthlyStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis label={{ value: "Hours", angle: -90, position: "insideLeft" }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="hours" fill="hsl(var(--primary))" name="Hours Worked" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

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
                {projects.map((project) => {
                  const status = getQuotaStatus(project);
                  return (
                    <div key={project.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{project.name}</h4>
                            {status.icon && (
                              <AlertCircle className={`h-4 w-4 ${status.color}`} />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Your: {project.usedHours.toFixed(2)}h / {project.userQuotaHours}h
                            ({project.usagePercentage.toFixed(1)}%)
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Total: {project.totalUsedHours.toFixed(2)}h / {project.totalQuotaHours}h
                            ({project.totalUsagePercentage.toFixed(1)}%)
                          </p>
                          <p className={`text-xs font-medium ${status.color}`}>
                            {status.message}
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
                        className={`${status.bgColor} ${status.progressColor}`}
                      />
                    </div>
                  );
                })}
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
                <p className="text-sm text-muted-foreground">No entries this month yet</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
