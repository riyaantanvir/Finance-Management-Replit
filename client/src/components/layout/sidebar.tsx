import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { BarChart, Plus, Users, X, Wallet, ChevronDown, ChevronRight, TrendingUp, CreditCard, Building2, UserCircle, LogOut, Settings, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { getAuthState, clearAuthState } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

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
  
  const authState = getAuthState();
  const user = authState.user;

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

  const mainNavigationItems = [
    { name: "Dashboard", href: "/dashboard", icon: BarChart, permission: user?.dashboardAccess },
    { name: "Expense Entry", href: "/expense-entry", icon: Plus, permission: user?.expenseEntryAccess },
    { name: "Planned Payments", href: "/planned-payments", icon: Calendar, permission: user?.dashboardAccess },
    { name: "Subscriptions", href: "/subscriptions", icon: CreditCard, permission: user?.subscriptionsAccess },
  ];
  
  const navigation = mainNavigationItems.filter(item => item.permission);

  const handleLogout = () => {
    clearAuthState();
    window.location.href = "/login";
  };

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
        "fixed left-0 top-0 h-full bg-sidebar border-r border-sidebar-border transition-all duration-300 z-50 flex flex-col shadow-lg",
        isMobile 
          ? isOpen 
            ? "w-64 translate-x-0" 
            : "w-64 -translate-x-full"
          : isOpen 
            ? "w-64" 
            : "w-[60px]"
      )}
      data-testid="sidebar"
    >
      {/* Header section */}
      <div className="p-3 border-b border-sidebar-border bg-gradient-to-r from-primary/10 to-sidebar">
        {isMobile && isOpen && (
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-bold text-primary">Finance CRM</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="h-8 w-8 hover:bg-primary/10"
              data-testid="button-sidebar-close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 py-2 px-2">
        {navigation.map((item) => {
          const isActive = location === item.href || (location === "/" && item.href === "/dashboard");
          return (
            <Link 
              key={item.name} 
              href={item.href}
              onClick={handleLinkClick}
              className={cn(
                "flex items-center px-3 py-2.5 text-sm font-medium transition-all rounded-lg mb-1 group",
                isActive
                  ? "text-sidebar-primary-foreground bg-sidebar-primary shadow-md"
                  : "text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/50"
              )}
              data-testid={`link-${item.name.toLowerCase().replace(' ', '-')}`}
            >
              <item.icon className="h-5 w-5 min-w-[1.25rem]" />
              {(isOpen || isMobile) && <span className="ml-3 truncate">{item.name}</span>}
            </Link>
          );
        })}

        {/* Fund Management Section */}
        {user?.fundManagementAccess && (
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
        )}

        {/* Investment Management Section */}
        {user?.investmentManagementAccess && (
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
        )}

        {/* Advantix Agency Section */}
        {user?.advantixAgencyAccess && (
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
        )}

        {/* Admin Panel Section - Moved to bottom */}
        {user?.adminPanelAccess && (
          <>
            <div className="my-4 mx-4 border-t border-border" />
            <Link 
              href="/admin-panel"
              onClick={handleLinkClick}
              className={cn(
                "flex items-center px-4 py-3 text-sm font-medium transition-colors mx-2 rounded-lg",
                location === "/admin-panel"
                  ? "text-primary bg-accent border-l-4 border-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
              data-testid="link-admin-panel"
            >
              <Users className="h-5 w-5 min-w-[1.25rem]" />
              {(isOpen || isMobile) && <span className="ml-3 truncate">Admin Panel</span>}
            </Link>
          </>
        )}
      </nav>

      {/* User Profile Section */}
      <div className="border-t border-border p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <UserCircle className="h-6 w-6 text-primary" />
          </div>
          {(isOpen || isMobile) && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate" data-testid="text-username">
                {user?.username || "User"}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user?.adminPanelAccess ? "Administrator" : "User"}
              </p>
            </div>
          )}
          {(isOpen || isMobile) && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="h-8 w-8 flex-shrink-0"
              title="Logout"
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
