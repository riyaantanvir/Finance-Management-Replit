import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { InsertUser } from "@shared/schema";

export default function UserForm() {
  const [formData, setFormData] = useState<InsertUser>({
    username: '',
    password: '',
    dashboardAccess: true,
    expenseEntryAccess: true,
    adminPanelAccess: false,
    advantixAgencyAccess: false,
    investmentManagementAccess: false,
    fundManagementAccess: false,
    subscriptionsAccess: false,
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createUserMutation = useMutation({
    mutationFn: (data: InsertUser) => apiRequest("POST", "/api/users", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Success",
        description: "User created successfully",
      });
      setFormData({
        username: '',
        password: '',
        dashboardAccess: true,
        expenseEntryAccess: true,
        adminPanelAccess: false,
        advantixAgencyAccess: false,
        investmentManagementAccess: false,
        fundManagementAccess: false,
        subscriptionsAccess: false,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createUserMutation.mutate(formData);
  };

  const handleInputChange = (field: keyof InsertUser, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Add New User</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4" data-testid="form-user">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter username"
                value={formData.username}
                onChange={(e) => handleInputChange('username', e.target.value)}
                required
                data-testid="input-username"
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                required
                data-testid="input-password"
              />
            </div>
          </div>
          
          <div>
            <Label className="text-base font-medium">Access Permissions</Label>
            <div className="space-y-3 mt-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="dashboardAccess"
                  checked={!!formData.dashboardAccess}
                  onCheckedChange={(checked) => handleInputChange('dashboardAccess', !!checked)}
                  data-testid="checkbox-dashboard-access"
                />
                <Label htmlFor="dashboardAccess" className="text-sm font-normal">
                  Dashboard Access
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="expenseEntryAccess"
                  checked={!!formData.expenseEntryAccess}
                  onCheckedChange={(checked) => handleInputChange('expenseEntryAccess', !!checked)}
                  data-testid="checkbox-expense-entry-access"
                />
                <Label htmlFor="expenseEntryAccess" className="text-sm font-normal">
                  Expense Entry Access
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="adminPanelAccess"
                  checked={!!formData.adminPanelAccess}
                  onCheckedChange={(checked) => handleInputChange('adminPanelAccess', !!checked)}
                  data-testid="checkbox-admin-panel-access"
                />
                <Label htmlFor="adminPanelAccess" className="text-sm font-normal">
                  Admin Panel Access
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="advantixAgencyAccess"
                  checked={!!formData.advantixAgencyAccess}
                  onCheckedChange={(checked) => handleInputChange('advantixAgencyAccess', !!checked)}
                  data-testid="checkbox-advantix-agency-access"
                />
                <Label htmlFor="advantixAgencyAccess" className="text-sm font-normal">
                  Advantix Agency Access
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="investmentManagementAccess"
                  checked={!!formData.investmentManagementAccess}
                  onCheckedChange={(checked) => handleInputChange('investmentManagementAccess', !!checked)}
                  data-testid="checkbox-investment-management-access"
                />
                <Label htmlFor="investmentManagementAccess" className="text-sm font-normal">
                  Investment Management Access
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="fundManagementAccess"
                  checked={!!formData.fundManagementAccess}
                  onCheckedChange={(checked) => handleInputChange('fundManagementAccess', !!checked)}
                  data-testid="checkbox-fund-management-access"
                />
                <Label htmlFor="fundManagementAccess" className="text-sm font-normal">
                  Fund Management Access
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="subscriptionsAccess"
                  checked={!!formData.subscriptionsAccess}
                  onCheckedChange={(checked) => handleInputChange('subscriptionsAccess', !!checked)}
                  data-testid="checkbox-subscriptions-access"
                />
                <Label htmlFor="subscriptionsAccess" className="text-sm font-normal">
                  Subscriptions Access
                </Label>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end">
            <Button
              type="submit"
              className="bg-black hover:bg-gray-800 text-white"
              disabled={createUserMutation.isPending}
              data-testid="button-add-user"
            >
              {createUserMutation.isPending ? "Adding..." : "Add User"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
