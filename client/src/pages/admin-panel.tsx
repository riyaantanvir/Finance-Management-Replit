import { useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";
import UserForm from "@/components/admin/user-form";
import UserTable from "@/components/admin/user-table";

export default function AdminPanel() {
  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  return (
    <div className="p-6" data-testid="admin-panel-page">
      <UserForm />
      <UserTable users={users} isLoading={isLoading} />
    </div>
  );
}
