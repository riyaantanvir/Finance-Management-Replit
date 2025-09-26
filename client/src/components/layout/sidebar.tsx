import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { BarChart, Plus, Users, X, Wallet, ChevronDown, ChevronRight, TrendingUp, CreditCard, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  isMobile: boolean;
}

export default function Sidebar({ isOpen, setIsOpen, isMobile }: SidebarProps) {
  const [location] = useLocation();
  const [fundsExpanded, setFundsExpanded] = useState(location.startsWith("/funds"));
  const [investmentsExpanded, setInvestmentsExpanded] = useState(location.startsWith("/investments"));
  const [agencyExpanded, setAgencyExpanded] = useState(location.startsWith("/agency"));

  // Keep expanded state synced with route changes
  useEffect(() => {
    if (location.startsWith("/funds")) {
      setFundsExpanded(true);
    }
    if (location.startsWith("/investments")) {
      setInvestmentsExpanded(true);
    }
    if (location.startsWith("/agency")) {
      setAgencyExpanded(true);
    }
  }, [location]);

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: BarChart },
    { name: "Expense Entry", href: "/expense-entry", icon: Plus },
    { name: "Subscriptions", href: "/subscriptions", icon: CreditCard },
    { name: "Admin Panel", href: "/admin-panel", icon: Users },
  ];

  const fundsNavigation = [
    { name: "Overview", href: "/funds/overview" },
    { name: "Accounts", href: "/funds/accounts" },
    { name: "Transfers", href: "/funds/transfers" },
    { name: "Reconcile", href: "/funds/reconcile" },
    { name: "Settings", href: "/funds/settings" },
  ];

  const investmentsNavigation = [
    { name: "Overview", href: "/investments/overview" },
    { name: "Projects", href: "/investments/projects" },
    { name: "Transactions", href: "/investments/transactions" },
    { name: "Payouts", href: "/investments/payouts" },
    { name: "Reports", href: "/investments/reports" },
    { name: "Settings", href: "/investments/settings" },
  ];

  const agencyNavigation = [
    { name: "Work Reports", href: "/agency/work-reports" },
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

        {/* Fund Management Section */}
        <div className="mt-4">
          <button
            onClick={() => setFundsExpanded(!fundsExpanded)}
            className={cn(
              "flex items-center justify-between w-full px-4 py-3 text-sm font-medium transition-colors mx-2 rounded-lg",
              location.startsWith("/funds")
                ? "text-primary bg-accent border-l-4 border-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            )}
            data-testid="button-funds-menu"
          >
            <div className="flex items-center">
              <Wallet className="h-5 w-5 min-w-[1.25rem]" />
              {(isOpen || isMobile) && <span className="ml-3 truncate">Fund Management</span>}
            </div>
            {(isOpen || isMobile) && (
              fundsExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )
            )}
          </button>

          {/* Fund Management Submenu */}
          {fundsExpanded && (isOpen || isMobile) && (
            <div className="ml-8 mt-2 space-y-1">
              {fundsNavigation.map((item) => {
                const isActive = location === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={handleLinkClick}
                    className={cn(
                      "flex items-center px-4 py-2 text-sm transition-colors rounded-lg",
                      isActive
                        ? "text-primary bg-accent/50 font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                    )}
                    data-testid={`link-funds-${item.name.toLowerCase()}`}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Investment Management Section */}
        <div className="mt-4">
          <button
            onClick={() => setInvestmentsExpanded(!investmentsExpanded)}
            className={cn(
              "flex items-center justify-between w-full px-4 py-3 text-sm font-medium transition-colors mx-2 rounded-lg",
              location.startsWith("/investments")
                ? "text-primary bg-accent border-l-4 border-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            )}
            data-testid="button-investments-menu"
          >
            <div className="flex items-center">
              <TrendingUp className="h-5 w-5 min-w-[1.25rem]" />
              {(isOpen || isMobile) && <span className="ml-3 truncate">Investment Management</span>}
            </div>
            {(isOpen || isMobile) && (
              investmentsExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )
            )}
          </button>

          {/* Investment Management Submenu */}
          {investmentsExpanded && (isOpen || isMobile) && (
            <div className="ml-8 mt-2 space-y-1">
              {investmentsNavigation.map((item) => {
                const isActive = location === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={handleLinkClick}
                    className={cn(
                      "flex items-center px-4 py-2 text-sm transition-colors rounded-lg",
                      isActive
                        ? "text-primary bg-accent/50 font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                    )}
                    data-testid={`link-investments-${item.name.toLowerCase()}`}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Advantix Agency Section */}
        <div className="mt-4">
          <button
            onClick={() => setAgencyExpanded(!agencyExpanded)}
            className={cn(
              "flex items-center justify-between w-full px-4 py-3 text-sm font-medium transition-colors mx-2 rounded-lg",
              location.startsWith("/agency")
                ? "text-primary bg-accent border-l-4 border-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            )}
            data-testid="button-agency-menu"
          >
            <div className="flex items-center">
              <Building2 className="h-5 w-5 min-w-[1.25rem]" />
              {(isOpen || isMobile) && <span className="ml-3 truncate">Advantix Agency</span>}
            </div>
            {(isOpen || isMobile) && (
              agencyExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )
            )}
          </button>

          {/* Advantix Agency Submenu */}
          {agencyExpanded && (isOpen || isMobile) && (
            <div className="ml-8 mt-2 space-y-1">
              {agencyNavigation.map((item) => {
                const isActive = location === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={handleLinkClick}
                    className={cn(
                      "flex items-center px-4 py-2 text-sm transition-colors rounded-lg",
                      isActive
                        ? "text-primary bg-accent/50 font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                    )}
                    data-testid={`link-agency-${item.name.toLowerCase().replace(' ', '-')}`}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </nav>
    </div>
  );
}
