import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { clearAuthState } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/dashboard": "Dashboard",
  "/expense-entry": "Expense Entry",
  "/admin-panel": "Admin Panel",
};

export default function Header() {
  const [location] = useLocation();
  const { toast } = useToast();

  const handleLogout = () => {
    clearAuthState();
    window.location.reload();
    toast({
      title: "Logged out",
      description: "You have been successfully logged out",
    });
  };

  const title = pageTitles[location] || "Dashboard";

  return (
    <header className="bg-white border-b border-border p-4" data-testid="header">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground" data-testid="text-page-title">
          {title}
        </h1>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-muted-foreground" data-testid="text-welcome">
            Welcome, Admin
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="text-muted-foreground hover:text-foreground"
            data-testid="button-logout"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
