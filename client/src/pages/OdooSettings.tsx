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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, XCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";

export default function OdooSettings() {
  const [formData, setFormData] = useState({
    odooUrl: "",
    username: "",
    apiKey: "",
    database: "",
  });
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");

  const utils = trpc.useUtils();
  const { data: config, isLoading } = trpc.odoo.getConfig.useQuery();

  const testConnection = trpc.odoo.testConnection.useMutation({
    onMutate: () => {
      setTestStatus("testing");
    },
    onSuccess: (data) => {
      if (data.success) {
        setTestStatus("success");
        toast.success("Connection successful!");
      } else {
        setTestStatus("error");
        toast.error(data.message);
      }
    },
    onError: (error) => {
      setTestStatus("error");
      toast.error(`Connection failed: ${error.message}`);
    },
  });

  const saveConfig = trpc.odoo.saveConfig.useMutation({
    onSuccess: () => {
      utils.odoo.getConfig.invalidate();
      toast.success("Configuration saved successfully");
      setTestStatus("idle");
    },
    onError: (error) => {
      toast.error(`Failed to save configuration: ${error.message}`);
    },
  });

  const deleteConfig = trpc.odoo.deleteConfig.useMutation({
    onSuccess: () => {
      utils.odoo.getConfig.invalidate();
      setFormData({ odooUrl: "", username: "", apiKey: "", database: "" });
      setTestStatus("idle");
      toast.success("Configuration deleted successfully");
    },
    onError: (error) => {
      toast.error(`Failed to delete configuration: ${error.message}`);
    },
  });

  // Load existing config into form
  useState(() => {
    if (config && formData.odooUrl === "") {
      setFormData({
        odooUrl: config.odooUrl,
        username: config.username || "",
        apiKey: "", // Don't pre-fill API key for security
        database: config.database,
      });
    }
  });

  const handleTestConnection = () => {
    if (!formData.odooUrl || !formData.username || !formData.apiKey || !formData.database) {
      toast.error("Please fill in all fields");
      return;
    }

    testConnection.mutate(formData);
  };

  const handleSave = () => {
    if (!formData.odooUrl || !formData.username || !formData.apiKey || !formData.database) {
      toast.error("Please fill in all fields");
      return;
    }

    saveConfig.mutate(formData);
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete your Odoo configuration?")) {
      deleteConfig.mutate();
      setFormData({ odooUrl: "", username: "", apiKey: "", database: "" });
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Odoo Integration</h1>
          <p className="text-muted-foreground">
            Configure your Odoo connection to automatically create invoices
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Odoo Configuration</CardTitle>
            <CardDescription>
              Enter your Odoo instance details. Invoices will be created automatically when set to "draft" status.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="odooUrl">Odoo URL</Label>
              <Input
                id="odooUrl"
                type="url"
                placeholder="https://your-instance.odoo.com"
                value={formData.odooUrl}
                onChange={(e) => setFormData({ ...formData, odooUrl: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="admin"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="database">Database Name</Label>
              <Input
                id="database"
                type="text"
                placeholder="your-database"
                value={formData.database}
                onChange={(e) => setFormData({ ...formData, database: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="Enter your Odoo API key"
                value={formData.apiKey}
                onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
              />
              <p className="text-sm text-muted-foreground">
                Your API key is stored securely and never exposed in responses
              </p>
            </div>

            <div className="flex items-center gap-4 pt-4">
              <Button
                variant="outline"
                onClick={handleTestConnection}
                disabled={testConnection.isPending}
              >
                {testConnection.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  "Test Connection"
                )}
              </Button>

              {testStatus === "success" && (
                <div className="flex items-center text-green-600">
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  <span className="text-sm">Connection successful</span>
                </div>
              )}

              {testStatus === "error" && (
                <div className="flex items-center text-red-600">
                  <XCircle className="mr-2 h-4 w-4" />
                  <span className="text-sm">Connection failed</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-4 pt-4 border-t">
              <Button
                onClick={handleSave}
                disabled={saveConfig.isPending || testStatus !== "success"}
              >
                {saveConfig.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Configuration"
                )}
              </Button>

              {config && (
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleteConfig.isPending}
                >
                  {deleteConfig.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Configuration
                    </>
                  )}
                </Button>
              )}
            </div>

            {config && config.lastTestedAt && (
              <p className="text-sm text-muted-foreground pt-4">
                Last tested: {new Date(config.lastTestedAt).toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How it works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>1. Configure your Odoo connection details above</p>
            <p>2. Test the connection to ensure it works</p>
            <p>3. Save the configuration</p>
            <p>4. When you create an invoice and set its status to "draft", it will automatically be created in Odoo</p>
            <p>5. The invoice will be created under the company "World Wide Services Group Ltd."</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
