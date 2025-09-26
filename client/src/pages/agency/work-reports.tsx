import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { insertWorkReportSchema } from "@shared/schema";
import { z } from "zod";
import { Plus, Calendar, Clock, User, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getAuthState } from "@/lib/auth";

type WorkReportFormData = z.infer<typeof insertWorkReportSchema>;

interface User {
  id: string;
  username: string;
  adminPanelAccess: boolean;
}

interface WorkReport {
  id: string;
  userId: string;
  date: string;
  taskDetails: string;
  hours: number;
  status: "submitted" | "approved" | "rejected";
  comments: string | null;
}

export default function WorkReportsPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const authState = getAuthState();
  const currentUser = authState.user;
  
  // Check for sessionId in localStorage
  const sessionId = localStorage.getItem('sessionId');

  const form = useForm<WorkReportFormData>({
    resolver: zodResolver(insertWorkReportSchema),
    defaultValues: {
      userId: currentUser?.id || "",
      date: new Date().toISOString().split('T')[0],
      taskDetails: "",
      hours: "0",
      status: "submitted",
      comments: "",
    },
  });

  // Fetch users for admin dropdown
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: currentUser?.adminPanelAccess || false,
  });

  // Fetch work reports with sessionId parameter
  const { data: workReports = [], isLoading } = useQuery<WorkReport[]>({
    queryKey: ["/api/work-reports", sessionId],
    queryFn: async () => {
      if (!sessionId) return [];
      
      const params = new URLSearchParams();
      params.append('sessionId', sessionId);
      
      // Non-admins only see their own reports
      if (!currentUser?.adminPanelAccess && currentUser?.id) {
        params.append('userId', currentUser.id);
      }
      
      const response = await fetch(`/api/work-reports?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch work reports');
      }
      return response.json();
    },
    enabled: !!sessionId,
  });

  // Create work report mutation
  const createWorkReport = useMutation({
    mutationFn: async (data: WorkReportFormData) => {
      if (!sessionId) {
        throw new Error('Session required');
      }
      
      const response = await fetch('/api/work-reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          sessionId,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create work report');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-reports"] });
      toast({
        title: "Success",
        description: "Work report created successfully",
      });
      setIsDialogOpen(false);
      form.reset({
        userId: currentUser?.id || "",
        date: new Date().toISOString().split('T')[0],
        taskDetails: "",
        hours: "0",
        status: "submitted",
        comments: "",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: WorkReportFormData) => {
    createWorkReport.mutate(data);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge variant="default" className="bg-green-100 text-green-800">Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">Submitted</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user?.username || userId;
  };

  if (!sessionId) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>
              Please log out and log back in to access work reports.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">Work Reports</h1>
          <p className="text-muted-foreground">Manage time tracking and project work reports</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-report">
              <Plus className="h-4 w-4 mr-2" />
              Add Report
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Create Work Report</DialogTitle>
              <DialogDescription>
                Add a new work report entry for time tracking.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {currentUser?.adminPanelAccess && (
                  <FormField
                    control={form.control}
                    name="userId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>User</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-user">
                              <SelectValue placeholder="Select a user" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {users.map((user) => (
                              <SelectItem key={user.id} value={user.id}>
                                {user.username}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          {...field}
                          data-testid="input-date"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="taskDetails"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Task Details</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe the work performed..."
                          {...field}
                          data-testid="input-task-details"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hours Worked</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.25"
                          min="0"
                          max="24"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value || "0")}
                          data-testid="input-hours"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="comments"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Comments (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Additional notes or comments..."
                          {...field}
                          value={field.value || ""}
                          data-testid="input-comments"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button 
                    type="submit" 
                    disabled={createWorkReport.isPending}
                    data-testid="button-save-report"
                  >
                    {createWorkReport.isPending ? "Saving..." : "Save Report"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Work Reports
          </CardTitle>
          <CardDescription>
            {currentUser?.adminPanelAccess 
              ? "View and manage all work reports" 
              : "View your work reports"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="text-muted-foreground">Loading work reports...</div>
            </div>
          ) : workReports.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No work reports found</h3>
              <p className="text-muted-foreground mb-4">
                Get started by creating your first work report.
              </p>
              <Button onClick={() => setIsDialogOpen(true)} data-testid="button-create-first-report">
                <Plus className="h-4 w-4 mr-2" />
                Create First Report
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {currentUser?.adminPanelAccess && <TableHead>User</TableHead>}
                  <TableHead>Date</TableHead>
                  <TableHead>Task Details</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Comments</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workReports.map((report) => (
                  <TableRow key={report.id} data-testid={`row-report-${report.id}`}>
                    {currentUser?.adminPanelAccess && (
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          {getUserName(report.userId)}
                        </div>
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {formatDate(report.date)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate" title={report.taskDetails}>
                        {report.taskDetails}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        {report.hours}h
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(report.status)}</TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate" title={report.comments || ""}>
                        {report.comments || "-"}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}