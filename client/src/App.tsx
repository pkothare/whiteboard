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
            <Route path="/whiteboard/:sessionId">
              {(params) => {
                // Store session ID and redirect to login, then return to session
                if (params.sessionId) {
                  // Pass return URL as query parameter to login
                  const returnTo = encodeURIComponent(`/whiteboard/${params.sessionId}`);
                  window.location.href = `/api/login?returnTo=${returnTo}`;
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
            <Route path="/whiteboard" component={Whiteboard} />
            <Route path="/whiteboard/:sessionId" component={Whiteboard} />
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
