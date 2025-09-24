import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { BarChart, Plus, Users, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  isMobile: boolean;
}

export default function Sidebar({ isOpen, setIsOpen, isMobile }: SidebarProps) {
  const [location] = useLocation();

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: BarChart },
    { name: "Expense Entry", href: "/expense-entry", icon: Plus },
    { name: "Admin Panel", href: "/admin-panel", icon: Users },
  ];

  const handleLinkClick = () => {
    if (isMobile) {
      setIsOpen(false);
    }
  };

  return (
    <div
      className={cn(
        "fixed left-0 top-0 h-full bg-white border-r border-border transition-all duration-300 z-50 flex flex-col",
        isMobile 
          ? isOpen 
            ? "w-60 translate-x-0" 
            : "w-60 -translate-x-full"
          : isOpen 
            ? "w-60" 
            : "w-[60px]"
      )}
      data-testid="sidebar"
    >
      {/* Header section */}
      <div className="p-4 border-b border-border">
        {isMobile && isOpen && (
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Finance CRM</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="h-8 w-8"
              data-testid="button-sidebar-close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 py-4">
        {navigation.map((item) => {
          const isActive = location === item.href || (location === "/" && item.href === "/dashboard");
          return (
            <Link 
              key={item.name} 
              href={item.href}
              onClick={handleLinkClick}
              className={cn(
                "flex items-center px-4 py-3 text-sm font-medium transition-colors mx-2 rounded-lg",
                isActive
                  ? "text-primary bg-accent border-l-4 border-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
              data-testid={`link-${item.name.toLowerCase().replace(' ', '-')}`}
            >
              <item.icon className="h-5 w-5 min-w-[1.25rem]" />
              {(isOpen || isMobile) && <span className="ml-3 truncate">{item.name}</span>}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
