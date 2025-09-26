import { useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";
import UserForm from "@/components/admin/user-form";
import UserTable from "@/components/admin/user-table";
import { TagsManagement } from '@/components/admin/tags-management';
import { PaymentMethodsManagement } from '@/components/admin/payment-methods-management';
import { ExchangeRatesManagement } from '@/components/admin/exchange-rates-management';
import { TelegramManagement } from '@/components/admin/telegram-management';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Tags, CreditCard, Send } from 'lucide-react';

export default function AdminPanel() {
  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  return (
    <div className="p-4 sm:p-6 space-y-6" data-testid="admin-panel-page">
      <div className="flex items-center gap-4 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Users className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Admin Panel</h1>
          <p className="text-muted-foreground">Manage users, tags, payment methods, exchange rates, and telegram settings</p>
        </div>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="users" data-testid="tab-users">
            <Users className="h-4 w-4 mr-2" />
            Users
          </TabsTrigger>
          <TabsTrigger value="tags" data-testid="tab-tags">
            <Tags className="h-4 w-4 mr-2" />
            Tags
          </TabsTrigger>
          <TabsTrigger value="payment-methods" data-testid="tab-payment-methods">
            <CreditCard className="h-4 w-4 mr-2" />
            Payment Methods
          </TabsTrigger>
          <TabsTrigger value="telegram-management" data-testid="tab-telegram-management">
            <Send className="h-4 w-4 mr-2" />
            Telegram Management
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6">
          <UserForm />
          <UserTable users={users} isLoading={isLoading} />
        </TabsContent>

        <TabsContent value="tags" className="space-y-6">
          <TagsManagement />
        </TabsContent>

        <TabsContent value="payment-methods" className="space-y-6">
          <PaymentMethodsManagement />
          <ExchangeRatesManagement />
        </TabsContent>

        <TabsContent value="telegram-management" className="space-y-6">
          <TelegramManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}
