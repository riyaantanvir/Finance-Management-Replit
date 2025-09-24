import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect, useState } from "react";
import { getAuthState, AuthState } from "./lib/auth";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import ExpenseEntry from "@/pages/expense-entry";
import AdminPanel from "@/pages/admin-panel";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";

function AuthenticatedApp({ user }: { user: AuthState['user'] }) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="transition-all duration-300 ml-[60px]">
        <Header />
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/expense-entry" component={ExpenseEntry} />
          <Route path="/admin-panel" component={AdminPanel} />
        </Switch>
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
