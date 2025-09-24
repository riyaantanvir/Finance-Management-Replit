import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { BarChart, Plus, Users, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Sidebar() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [location] = useLocation();

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: BarChart },
    { name: "Expense Entry", href: "/expense-entry", icon: Plus },
    { name: "Admin Panel", href: "/admin-panel", icon: Users },
  ];

  return (
    <div
      className={cn(
        "fixed left-0 top-0 h-full bg-white border-r border-border transition-all duration-300 z-50",
        isExpanded ? "w-60" : "w-[60px]"
      )}
      data-testid="sidebar"
    >
      <div className="p-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-center"
          data-testid="button-sidebar-toggle"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>
      
      <nav className="mt-8">
        {navigation.map((item) => {
          const isActive = location === item.href || (location === "/" && item.href === "/dashboard");
          return (
            <Link 
              key={item.name} 
              href={item.href}
              className={cn(
                "flex items-center px-4 py-3 text-sm font-medium transition-colors",
                isActive
                  ? "text-primary bg-accent border-r-2 border-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
              data-testid={`link-${item.name.toLowerCase().replace(' ', '-')}`}
            >
              <item.icon className="h-5 w-5" />
              {isExpanded && <span className="ml-3">{item.name}</span>}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
