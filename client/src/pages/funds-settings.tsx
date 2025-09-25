import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Settings } from "lucide-react";
import { insertSettingsFinanceSchema, SettingsFinance, InsertSettingsFinance } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type SettingsFormData = InsertSettingsFinance;

export default function FundsSettingsPage() {
  const [isEditing, setIsEditing] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: settings, isLoading } = useQuery<SettingsFinance>({
    queryKey: ["/api/settings/finance"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(insertSettingsFinanceSchema),
    defaultValues: {
      baseCurrency: 'BDT',
      allowNegativeBalances: true,
    },
  });

  // Update form when settings are loaded
  useEffect(() => {
    if (settings) {
      form.reset({
        baseCurrency: settings.baseCurrency,
        allowNegativeBalances: settings.allowNegativeBalances,
      });
    }
  }, [settings, form]);

  const createSettingsMutation = useMutation({
    mutationFn: (data: SettingsFormData) => apiRequest("POST", "/api/settings/finance", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/finance"] });
      setIsEditing(false);
      toast({
        title: "Success",
        description: "Settings created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create settings",
        variant: "destructive",
      });
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: (data: SettingsFormData) => apiRequest("PUT", "/api/settings/finance", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/finance"] });
      setIsEditing(false);
      toast({
        title: "Success",
        description: "Settings updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update settings",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: SettingsFormData) => {
    if (settings) {
      updateSettingsMutation.mutate(data);
    } else {
      createSettingsMutation.mutate(data);
    }
  };

  const handleCancel = () => {
    if (settings) {
      form.reset({
        baseCurrency: settings.baseCurrency,
        allowNegativeBalances: settings.allowNegativeBalances,
      });
    }
    setIsEditing(false);
  };

  const isPending = createSettingsMutation.isPending || updateSettingsMutation.isPending;

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-6" data-testid="funds-settings-loading">
        <div className="animate-pulse">
          <Card>
            <CardContent className="p-6">
              <div className="h-64 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6" data-testid="funds-settings-page">
      <div>
        <h1 className="text-2xl font-bold mb-1">Fund Settings</h1>
        <p className="text-muted-foreground text-sm">
          Configure your fund management preferences
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Financial Settings
            </CardTitle>
            {!isEditing && (
              <Button
                onClick={() => setIsEditing(true)}
                data-testid="button-edit-settings"
              >
                {settings ? "Edit Settings" : "Create Settings"}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="baseCurrency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Base Currency</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        disabled={!isEditing}
                        placeholder="BDT"
                        data-testid="input-base-currency"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="allowNegativeBalances"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Allow Negative Balances</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Allow accounts to have negative balances during transfers
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={!isEditing}
                        data-testid="switch-allow-negative"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {isEditing && (
                <div className="flex justify-end space-x-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    disabled={isPending}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isPending}
                    data-testid="button-save"
                  >
                    {isPending ? "Saving..." : settings ? "Update Settings" : "Create Settings"}
                  </Button>
                </div>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}