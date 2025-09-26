import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CheckCircle, XCircle, Send, Clock, BarChart3 } from "lucide-react";
import { TelegramSettings, InsertTelegramSettings, UpdateTelegramSettings } from "@shared/schema";

export function TelegramManagement() {
  const [formData, setFormData] = useState({
    botToken: "",
    chatId: "",
    alertTime: "09:00",
    reportTime: "21:00",
    workReportNotification: true,
  });
  const [isEditing, setIsEditing] = useState(false);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Query to fetch telegram settings
  const { data: telegramSettings, isLoading } = useQuery<TelegramSettings>({
    queryKey: ["/api/telegram-settings"],
  });

  // Test connection mutation
  const testConnectionMutation = useMutation({
    mutationFn: async (data: { botToken: string; chatId: string }) => {
      const response = await apiRequest("POST", "/api/telegram-settings/test", data);
      return await response.json();
    },
    onSuccess: (result: { connected: boolean }) => {
      if (result.connected) {
        toast({
          title: "Connection Successful",
          description: "Telegram connection test passed! ✅",
        });
      } else {
        toast({
          title: "Connection Failed",
          description: "Unable to connect to Telegram. Please check your credentials.",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Test Failed",
        description: error.message || "Failed to test Telegram connection",
        variant: "destructive",
      });
    },
  });

  // Send daily report mutation
  const sendReportMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/telegram-settings/send-report", {});
      return await response.json();
    },
    onSuccess: (result: { message: string; success: boolean }) => {
      toast({
        title: "Report Sent",
        description: result.message,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Report Failed",
        description: error.message || "Failed to send daily report",
        variant: "destructive",
      });
    },
  });

  // Create settings mutation
  const createSettingsMutation = useMutation({
    mutationFn: (data: InsertTelegramSettings) =>
      apiRequest("POST", "/api/telegram-settings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/telegram-settings"] });
      setIsEditing(false);
      toast({
        title: "Success",
        description: "Telegram settings saved successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save Telegram settings",
        variant: "destructive",
      });
    },
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTelegramSettings }) =>
      apiRequest("PUT", `/api/telegram-settings/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/telegram-settings"] });
      setIsEditing(false);
      toast({
        title: "Success",
        description: "Telegram settings updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update Telegram settings",
        variant: "destructive",
      });
    },
  });

  const handleEdit = () => {
    if (telegramSettings) {
      setFormData({
        botToken: telegramSettings.botToken || "",
        chatId: telegramSettings.chatId || "",
        alertTime: telegramSettings.alertTime,
        reportTime: telegramSettings.reportTime || "21:00",
        workReportNotification: telegramSettings.workReportNotification ?? true,
      });
    }
    setIsEditing(true);
  };

  const handleSave = () => {
    if (telegramSettings) {
      updateSettingsMutation.mutate({
        id: telegramSettings.id,
        data: formData,
      });
    } else {
      createSettingsMutation.mutate(formData);
    }
  };

  const handleTestConnection = () => {
    if (!formData.botToken || !formData.chatId) {
      toast({
        title: "Missing Information",
        description: "Please enter both Bot Token and Chat ID before testing",
        variant: "destructive",
      });
      return;
    }

    testConnectionMutation.mutate({
      botToken: formData.botToken,
      chatId: formData.chatId,
    });
  };

  const handleSendReport = () => {
    if (!isConnected) {
      toast({
        title: "Configuration Required",
        description: "Please configure and save Telegram settings first",
        variant: "destructive",
      });
      return;
    }
    sendReportMutation.mutate();
  };

  const isConnected = telegramSettings?.botToken && telegramSettings?.chatId;
  const isFormComplete = formData.botToken && formData.chatId;

  if (isLoading) {
    return <div>Loading Telegram settings...</div>;
  }

  return (
    <div className="space-y-6">
      <Card data-testid="telegram-settings-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Telegram Management
          </CardTitle>
          <CardDescription>
            Configure Telegram bot settings for subscription alerts and notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Connection Status */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                {isConnected ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                <span className="font-medium">Connection Status</span>
              </div>
              <Badge variant={isConnected ? "default" : "destructive"} data-testid="connection-status">
                {isConnected ? "✅ Successfully Connected" : "❌ Disconnected"}
              </Badge>
            </div>
            {!isEditing && (
              <Button
                variant="outline"
                onClick={handleEdit}
                data-testid="button-edit-settings"
              >
                {telegramSettings ? "Edit Settings" : "Add Settings"}
              </Button>
            )}
          </div>

          {/* Settings Form */}
          {(isEditing || !telegramSettings) && (
            <div className="space-y-4" data-testid="telegram-form">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="botToken">Telegram Bot Token</Label>
                  <Input
                    id="botToken"
                    type="password"
                    placeholder="Enter your bot token"
                    value={formData.botToken}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, botToken: e.target.value }))
                    }
                    data-testid="input-bot-token"
                  />
                </div>
                <div>
                  <Label htmlFor="chatId">Chat ID</Label>
                  <Input
                    id="chatId"
                    type="text"
                    placeholder="Enter your chat ID"
                    value={formData.chatId}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, chatId: e.target.value }))
                    }
                    data-testid="input-chat-id"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
                <div>
                  <Label htmlFor="alertTime" className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Alert Time (24-hour format)
                  </Label>
                  <Input
                    id="alertTime"
                    type="time"
                    value={formData.alertTime}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, alertTime: e.target.value }))
                    }
                    data-testid="input-alert-time"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Time when subscription alerts will be sent (Asia/Dhaka timezone)
                  </p>
                </div>
                <div>
                  <Label htmlFor="reportTime" className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Daily Report Time (24-hour format)
                  </Label>
                  <Input
                    id="reportTime"
                    type="time"
                    value={formData.reportTime}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, reportTime: e.target.value }))
                    }
                    data-testid="input-report-time"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Time when daily reports will be sent (Asia/Dhaka timezone)
                  </p>
                </div>
              </div>

              {/* Work Report Notification Toggle */}
              <div className="flex items-center justify-between p-4 border rounded-lg bg-slate-50 dark:bg-slate-900">
                <div className="space-y-0.5">
                  <Label className="text-base font-medium">Work Report Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Send Telegram notifications when new work reports are submitted
                  </p>
                </div>
                <Switch
                  checked={formData.workReportNotification}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, workReportNotification: checked }))
                  }
                  data-testid="switch-work-report-notification"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleSave}
                  disabled={!isFormComplete || createSettingsMutation.isPending || updateSettingsMutation.isPending}
                  data-testid="button-save-settings"
                >
                  {createSettingsMutation.isPending || updateSettingsMutation.isPending
                    ? "Saving..."
                    : "Save Settings"}
                </Button>
                {isEditing && (
                  <Button
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                    data-testid="button-cancel-settings"
                  >
                    Cancel
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={handleTestConnection}
                  disabled={!isFormComplete || testConnectionMutation.isPending}
                  data-testid="button-test-alert"
                >
                  {testConnectionMutation.isPending ? "Testing..." : "Send Test Alert"}
                </Button>
              </div>
            </div>
          )}

          {/* Current Settings Display */}
          {telegramSettings && !isEditing && (
            <div className="space-y-4" data-testid="current-settings">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 border rounded">
                  <Label className="text-sm font-medium">Bot Token</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {telegramSettings.botToken ? "••••••••••••••••" : "Not set"}
                  </p>
                </div>
                <div className="p-3 border rounded">
                  <Label className="text-sm font-medium">Chat ID</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {telegramSettings.chatId || "Not set"}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
                <div className="p-3 border rounded">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Alert Time
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {telegramSettings.alertTime} (Asia/Dhaka timezone)
                  </p>
                </div>
                <div className="p-3 border rounded">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Daily Report Time
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {telegramSettings.reportTime || "21:00"} (Asia/Dhaka timezone)
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Daily Reports Section */}
      {isConnected && (
        <Card data-testid="daily-reports-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Daily Reports
            </CardTitle>
            <CardDescription>
              Send today's financial summary report to Telegram
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-1">
                <p className="font-medium">Today's Report</p>
                <p className="text-sm text-muted-foreground">
                  Get instant summary of today's income, expenses, and transactions
                </p>
              </div>
              <Button
                onClick={handleSendReport}
                disabled={sendReportMutation.isPending}
                data-testid="button-send-report"
              >
                {sendReportMutation.isPending ? "Sending..." : "Report Now"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}