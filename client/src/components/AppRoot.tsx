import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { useAuth } from "@/hooks/use-auth";
import { LoadingPage } from "@/components/ui/loading-page";
import App from "@/App";

export default function AppRoot() {
  const [isInitializing, setIsInitializing] = useState(true);
  const { isLoading } = useAuth();

  // Handle initial load
  useEffect(() => {
    // Hide the initializing screen once hydration is complete
    if (!isLoading) {
      // Give React a moment to prepare content
      setTimeout(() => {
        setIsInitializing(false);
      }, 300);
    }
  }, [isLoading]);

  // Always show the loading page during initialization
  if (isInitializing || isLoading) {
    return <LoadingPage />;
  }

  return (
    <>
      <App />
      <Toaster />
    </>
  );
}