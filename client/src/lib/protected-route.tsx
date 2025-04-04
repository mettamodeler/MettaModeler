import { useAuth } from "@/hooks/use-auth";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { Redirect, Route, useLocation } from "wouter";
import { useEffect } from "react";

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  // Handle redirect to auth page when user is not logged in
  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/auth");
    }
  }, [isLoading, user, setLocation]);

  if (isLoading) {
    return (
      <Route path={path}>
        <LoadingScreen />
      </Route>
    );
  }

  // Show loading screen instead of immediate redirect
  if (!user) {
    return (
      <Route path={path}>
        <LoadingScreen />
      </Route>
    );
  }

  return <Route path={path} component={Component} />;
}