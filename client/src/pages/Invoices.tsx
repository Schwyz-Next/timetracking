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
import { Plus, FileText, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { format } from "date-fns";

export default function Invoices() {
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    month: (new Date().getMonth() + 1).toString(),
    year: new Date().getFullYear().toString(),
    recipientName: "",
    recipientAddress: "",
  });

  const utils = trpc.useUtils();
  const { data: invoices, isLoading } = trpc.invoices.list.useQuery({});
  const { data: previewData } = trpc.invoices.preview.useQuery(
    {
      month: parseInt(formData.month),
      year: parseInt(formData.year),
    },
    {
      enabled: isGenerateDialogOpen,
    }
  );

  const { data: selectedInvoice } = trpc.invoices.getById.useQuery(
    { id: selectedInvoiceId! },
    { enabled: !!selectedInvoiceId }
  );

  const generateInvoice = trpc.invoices.generate.useMutation({
    onSuccess: () => {
      utils.invoices.list.invalidate();
      setIsGenerateDialogOpen(false);
      resetForm();
      toast.success("Invoice generated successfully");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateStatus = trpc.invoices.updateStatus.useMutation({
    onSuccess: () => {
      utils.invoices.list.invalidate();
      utils.invoices.getById.invalidate();
      toast.success("Invoice status updated");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteInvoice = trpc.invoices.delete.useMutation({
    onSuccess: () => {
      utils.invoices.list.invalidate();
      toast.success("Invoice deleted successfully");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      month: (new Date().getMonth() + 1).toString(),
      year: new Date().getFullYear().toString(),
      recipientName: "",
      recipientAddress: "",
    });
  };

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();

    generateInvoice.mutate({
      month: parseInt(formData.month),
      year: parseInt(formData.year),
      recipientName: formData.recipientName,
      recipientAddress: formData.recipientAddress || undefined,
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this invoice?")) {
      deleteInvoice.mutate({ id });
    }
  };

  const handleViewDetails = (id: number) => {
    setSelectedInvoiceId(id);
    setIsPreviewDialogOpen(true);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "paid":
        return "default";
      case "sent":
        return "secondary";
      default:
        return "outline";
    }
  };

  const months = [
    { value: "1", label: "January" },
    { value: "2", label: "February" },
    { value: "3", label: "March" },
    { value: "4", label: "April" },
    { value: "5", label: "May" },
    { value: "6", label: "June" },
    { value: "7", label: "July" },
    { value: "8", label: "August" },
    { value: "9", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ];

  const years = Array.from({ length: 10 }, (_, i) => {
    const year = new Date().getFullYear() - 5 + i;
    return { value: year.toString(), label: year.toString() };
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Invoices</h1>
            <p className="text-muted-foreground">
              Generate and manage your monthly invoices
            </p>
          </div>
          <Button
            onClick={() => {
              resetForm();
              setIsGenerateDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Generate Invoice
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Invoice History</CardTitle>
            <CardDescription>All generated invoices</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading invoices...
              </div>
            ) : invoices && invoices.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-mono">
                          {invoice.invoiceNumber}
                        </TableCell>
                        <TableCell>
                          {months.find((m) => m.value === invoice.month.toString())
                            ?.label || invoice.month}{" "}
                          {invoice.year}
                        </TableCell>
                        <TableCell>{invoice.recipientName}</TableCell>
                        <TableCell className="font-medium">
                          CHF {(invoice.totalAmount / 100).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={invoice.status}
                            onValueChange={(value: "draft" | "sent" | "paid") =>
                              updateStatus.mutate({
                                id: invoice.id,
                                status: value,
                              })
                            }
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="draft">Draft</SelectItem>
                              <SelectItem value="sent">Sent</SelectItem>
                              <SelectItem value="paid">Paid</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDetails(invoice.id)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(invoice.id)}
                              disabled={invoice.status === "paid"}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">No invoices yet</p>
                <Button
                  onClick={() => {
                    resetForm();
                    setIsGenerateDialogOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Generate Your First Invoice
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Generate Invoice Dialog */}
        <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
          <DialogContent className="max-w-2xl">
            <form onSubmit={handleGenerate}>
              <DialogHeader>
                <DialogTitle>Generate Invoice</DialogTitle>
                <DialogDescription>
                  Create an invoice from your time entries for a specific month
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="month">Month</Label>
                    <Select
                      value={formData.month}
                      onValueChange={(value) =>
                        setFormData({ ...formData, month: value })
                      }
                    >
                      <SelectTrigger id="month">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {months.map((month) => (
                          <SelectItem key={month.value} value={month.value}>
                            {month.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="year">Year</Label>
                    <Select
                      value={formData.year}
                      onValueChange={(value) =>
                        setFormData({ ...formData, year: value })
                      }
                    >
                      <SelectTrigger id="year">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {years.map((year) => (
                          <SelectItem key={year.value} value={year.value}>
                            {year.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Preview */}
                {previewData && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Preview</CardTitle>
                      <CardDescription>
                        {previewData.entryCount} time entries found
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {previewData.items.length > 0 ? (
                        <div className="space-y-3">
                          {previewData.items.map((item, idx) => (
                            <div
                              key={idx}
                              className="flex justify-between text-sm border-b pb-2"
                            >
                              <div>
                                <div className="font-medium">{item.projectName}</div>
                                <div className="text-muted-foreground">
                                  {item.totalHours.toFixed(2)}h × CHF{" "}
                                  {item.hourlyRate}/h ({item.vatType})
                                </div>
                              </div>
                              <div className="font-medium">
                                CHF {item.amount.toFixed(2)}
                              </div>
                            </div>
                          ))}
                          <div className="flex justify-between text-lg font-bold pt-2">
                            <span>Total</span>
                            <span>CHF {previewData.totalAmount.toFixed(2)}</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No time entries for this period
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )}

                <div className="space-y-2">
                  <Label htmlFor="recipientName">Recipient Name</Label>
                  <Input
                    id="recipientName"
                    value={formData.recipientName}
                    onChange={(e) =>
                      setFormData({ ...formData, recipientName: e.target.value })
                    }
                    placeholder="Company or person name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="recipientAddress">
                    Recipient Address (optional)
                  </Label>
                  <Textarea
                    id="recipientAddress"
                    value={formData.recipientAddress}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        recipientAddress: e.target.value,
                      })
                    }
                    placeholder="Street, City, Postal Code"
                    rows={3}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsGenerateDialogOpen(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!previewData || previewData.items.length === 0}
                >
                  Generate Invoice
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Invoice Details Dialog */}
        <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Invoice Details</DialogTitle>
              <DialogDescription>
                {selectedInvoice?.invoice.invoiceNumber}
              </DialogDescription>
            </DialogHeader>

            {selectedInvoice && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Period</div>
                    <div className="font-medium">
                      {months.find(
                        (m) =>
                          m.value === selectedInvoice.invoice.month.toString()
                      )?.label || selectedInvoice.invoice.month}{" "}
                      {selectedInvoice.invoice.year}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Status</div>
                    <Badge variant={getStatusBadgeVariant(selectedInvoice.invoice.status)}>
                      {selectedInvoice.invoice.status}
                    </Badge>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Recipient</div>
                    <div className="font-medium">
                      {selectedInvoice.invoice.recipientName}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Total Amount</div>
                    <div className="font-medium text-lg">
                      CHF {(selectedInvoice.invoice.totalAmount / 100).toFixed(2)}
                    </div>
                  </div>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Line Items</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {selectedInvoice.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex justify-between text-sm border-b pb-2"
                        >
                          <div>
                            <div className="font-medium">
                              {item.project?.name || "Unknown Project"}
                            </div>
                            <div className="text-muted-foreground">
                              {(item.item.hours / 100).toFixed(2)}h × CHF{" "}
                              {item.item.rate}/h
                            </div>
                          </div>
                          <div className="font-medium">
                            CHF {(item.item.amount / 100).toFixed(2)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsPreviewDialogOpen(false);
                  setSelectedInvoiceId(null);
                }}
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
