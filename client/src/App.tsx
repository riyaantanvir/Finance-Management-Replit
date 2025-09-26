import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect, useState } from "react";
import { getAuthState, AuthState } from "./lib/auth";
import { useIsMobile } from "@/hooks/use-mobile";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Welcome from "@/pages/welcome";
import ExpenseEntry from "@/pages/expense-entry";
import AdminPanel from "@/pages/admin-panel";
import FundsOverviewPage from "@/pages/funds-overview";
import FundsAccountsPage from "@/pages/funds-accounts";
import FundsTransfersPage from "@/pages/funds-transfers";
import FundsReconcilePage from "@/pages/funds-reconcile";
import FundsSettingsPage from "@/pages/funds-settings";
import InvestmentsOverviewPage from "@/pages/investments-overview";
import InvestmentsProjectsPage from "@/pages/investments-projects";
import InvestmentsTransactionsPage from "@/pages/investments-transactions";
import InvestmentsPayoutsPage from "@/pages/investments-payouts";
import InvestmentsReportsPage from "@/pages/investments-reports";
import InvestmentsSettingsPage from "@/pages/investments-settings";
import SubscriptionsPage from "@/pages/subscriptions";
import WorkReportsPage from "@/pages/agency/work-reports";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";

function AuthenticatedApp({ user }: { user: AuthState['user'] }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-background">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} isMobile={isMobile} />
      
      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      <div className={`transition-all duration-300 ${
        isMobile ? 'ml-0' : sidebarOpen ? 'ml-60' : 'ml-[60px]'
      }`}>
        <Header 
          sidebarOpen={sidebarOpen} 
          setSidebarOpen={setSidebarOpen} 
          isMobile={isMobile} 
        />
        <main className="min-h-[calc(100vh-4rem)]">
          <Switch>
            <Route path="/" component={Welcome} />
            <Route path="/dashboard" component={Dashboard} />
            <Route path="/expense-entry" component={ExpenseEntry} />
            <Route path="/admin-panel" component={AdminPanel} />
            <Route path="/funds/overview" component={FundsOverviewPage} />
            <Route path="/funds/accounts" component={FundsAccountsPage} />
            <Route path="/funds/transfers" component={FundsTransfersPage} />
            <Route path="/funds/reconcile" component={FundsReconcilePage} />
            <Route path="/funds/settings" component={FundsSettingsPage} />
            <Route path="/investments/overview" component={InvestmentsOverviewPage} />
            <Route path="/investments/projects" component={InvestmentsProjectsPage} />
            <Route path="/investments/transactions" component={InvestmentsTransactionsPage} />
            <Route path="/investments/payouts" component={InvestmentsPayoutsPage} />
            <Route path="/investments/reports" component={InvestmentsReportsPage} />
            <Route path="/investments/settings" component={InvestmentsSettingsPage} />
            <Route path="/subscriptions" component={SubscriptionsPage} />
            <Route path="/agency/work-reports" component={WorkReportsPage} />
          </Switch>
        </main>
      </div>
    </div>
  );
}

function Router() {
  const [authState, setAuthState] = useState<AuthState>({ user: null, isAuthenticated: false });

  useEffect(() => {
    const state = getAuthState();
    setAuthState(state);
  }, []);

  if (!authState.isAuthenticated) {
    return <Login onLogin={setAuthState} />;
  }

  return <AuthenticatedApp user={authState.user} />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
