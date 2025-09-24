import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { LogOut, Menu } from "lucide-react";
import { clearAuthState } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/dashboard": "Dashboard",
  "/expense-entry": "Expense Entry",
  "/admin-panel": "Admin Panel",
};

interface HeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  isMobile: boolean;
}

export default function Header({ sidebarOpen, setSidebarOpen, isMobile }: HeaderProps) {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();

  const handleLogout = () => {
    clearAuthState();
    setLocation("/");
    window.location.reload();
    toast({
      title: "Logged out",
      description: "You have been successfully logged out",
    });
  };

  const title = pageTitles[location] || "Dashboard";

  return (
    <header className="bg-white border-b border-border p-4 sticky top-0 z-30" data-testid="header">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-muted-foreground hover:text-foreground"
              data-testid="button-mobile-menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
          {!isMobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-muted-foreground hover:text-foreground"
              data-testid="button-sidebar-toggle"
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
          <h1 className="text-xl md:text-2xl font-semibold text-foreground truncate" data-testid="text-page-title">
            {title}
          </h1>
        </div>
        <div className="flex items-center space-x-2 md:space-x-4">
          <span className="hidden sm:block text-sm text-muted-foreground" data-testid="text-welcome">
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
