import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Edit, Trash2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { User, UpdateUser } from "@shared/schema";

interface UserTableProps {
  users: User[];
  isLoading: boolean;
}

export default function UserTable({ users, isLoading }: UserTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<UpdateUser>({});

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUser }) =>
      apiRequest("PUT", `/api/users/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setEditingId(null);
      setEditData({});
      toast({
        title: "Success",
        description: "User updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update user",
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (user: User) => {
    setEditingId(user.id);
    setEditData({
      dashboardAccess: user.dashboardAccess,
      expenseEntryAccess: user.expenseEntryAccess,
      adminPanelAccess: user.adminPanelAccess,
    });
  };

  const handleSaveEdit = () => {
    if (editingId && editData) {
      updateUserMutation.mutate({ id: editingId, data: editData });
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const handleDelete = (id: string) => {
    deleteUserMutation.mutate(id);
  };

  const handlePermissionChange = (permission: keyof UpdateUser, value: boolean) => {
    setEditData(prev => ({ ...prev, [permission]: value }));
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Management</CardTitle>
      </CardHeader>
      <CardContent>
        {users.length === 0 ? (
          <p className="text-center text-muted-foreground py-8" data-testid="text-no-users">
            No users found
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Dashboard</TableHead>
                  <TableHead>Expense Entry</TableHead>
                  <TableHead>Admin Panel</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                    <TableCell className="font-medium" data-testid={`text-username-${user.id}`}>
                      {user.username}
                    </TableCell>
                    <TableCell>
                      {editingId === user.id ? (
                        <Checkbox
                          checked={!!editData.dashboardAccess}
                          onCheckedChange={(checked) => handlePermissionChange('dashboardAccess', !!checked)}
                          data-testid={`checkbox-edit-dashboard-${user.id}`}
                        />
                      ) : (
                        <Badge
                          variant={user.dashboardAccess ? 'default' : 'destructive'}
                          className={
                            user.dashboardAccess
                              ? 'bg-green-100 text-green-800 hover:bg-green-100'
                              : 'bg-red-100 text-red-800 hover:bg-red-100'
                          }
                          data-testid={`badge-dashboard-${user.id}`}
                        >
                          {user.dashboardAccess ? 'Yes' : 'No'}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === user.id ? (
                        <Checkbox
                          checked={!!editData.expenseEntryAccess}
                          onCheckedChange={(checked) => handlePermissionChange('expenseEntryAccess', !!checked)}
                          data-testid={`checkbox-edit-expense-${user.id}`}
                        />
                      ) : (
                        <Badge
                          variant={user.expenseEntryAccess ? 'default' : 'destructive'}
                          className={
                            user.expenseEntryAccess
                              ? 'bg-green-100 text-green-800 hover:bg-green-100'
                              : 'bg-red-100 text-red-800 hover:bg-red-100'
                          }
                          data-testid={`badge-expense-entry-${user.id}`}
                        >
                          {user.expenseEntryAccess ? 'Yes' : 'No'}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === user.id ? (
                        <Checkbox
                          checked={!!editData.adminPanelAccess}
                          onCheckedChange={(checked) => handlePermissionChange('adminPanelAccess', !!checked)}
                          data-testid={`checkbox-edit-admin-${user.id}`}
                        />
                      ) : (
                        <Badge
                          variant={user.adminPanelAccess ? 'default' : 'destructive'}
                          className={
                            user.adminPanelAccess
                              ? 'bg-green-100 text-green-800 hover:bg-green-100'
                              : 'bg-red-100 text-red-800 hover:bg-red-100'
                          }
                          data-testid={`badge-admin-panel-${user.id}`}
                        >
                          {user.adminPanelAccess ? 'Yes' : 'No'}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === user.id ? (
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            onClick={handleSaveEdit}
                            disabled={updateUserMutation.isPending}
                            data-testid={`button-save-user-${user.id}`}
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCancelEdit}
                            data-testid={`button-cancel-user-${user.id}`}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(user)}
                            data-testid={`button-edit-user-${user.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive hover:text-destructive"
                                data-testid={`button-delete-user-${user.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this user? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel data-testid={`button-cancel-delete-user-${user.id}`}>
                                  Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(user.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  data-testid={`button-confirm-delete-user-${user.id}`}
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
