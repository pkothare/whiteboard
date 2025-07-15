import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { ErrorBoundary } from "@/components/error-boundary";
import Whiteboard from "@/pages/whiteboard";
import LoginPage from "@/components/auth/login-page";
import DemoLogin from "@/components/auth/demo-login";
import Landing from "@/components/auth/landing";
import Home from "@/components/auth/home";
import NotFound from "@/pages/not-found";

function Router() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Switch>
        {!user ? (
          <>
            <Route path="/" component={Landing} />
            <Route path="/sessions/:sessionId">
              {(params) => {
                // Store session ID in localStorage and redirect to login
                if (params.sessionId) {
                  // Store the intended session in localStorage for after auth
                  localStorage.setItem('pendingSessionId', params.sessionId);
                  window.location.href = '/api/login';
                  return <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>;
                }
                return <Landing />;
              }}
            </Route>
          </>
        ) : (
          <>
            <Route path="/" component={Home} />
            <Route path="/sessions" component={Whiteboard} />
            <Route path="/sessions/:sessionId" component={Whiteboard} />
          </>
        )}
        <Route component={NotFound} />
      </Switch>
    </ErrorBoundary>
  );
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
