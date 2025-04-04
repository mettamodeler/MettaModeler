import { Route, Switch } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import ModelEditor from "@/pages/ModelEditor";
import AuthPage from "@/pages/auth-page";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { useEffect, useState } from "react";

function Router() {
  const { isLoading, loginMutation, logoutMutation, registerMutation } = useAuth();
  const [showLoading, setShowLoading] = useState(false);
  
  // Show loading screen when auth operations are in progress
  useEffect(() => {
    const isAuthInProgress = 
      isLoading || 
      loginMutation.isPending || 
      logoutMutation.isPending || 
      registerMutation.isPending;
      
    if (isAuthInProgress) {
      setShowLoading(true);
    } else {
      // Keep loading screen visible for a moment to avoid flickering
      const timer = setTimeout(() => {
        setShowLoading(false);
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [isLoading, loginMutation.isPending, logoutMutation.isPending, registerMutation.isPending]);
  
  return (
    <>
      {showLoading && <LoadingScreen />}
      <Switch>
        <ProtectedRoute path="/" component={Home} />
        <ProtectedRoute path="/models/:modelId" component={ModelEditor} />
        <Route path="/auth" component={AuthPage} />
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router />
      <Toaster />
    </AuthProvider>
  );
}

export default App;
