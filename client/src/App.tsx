import { Route, Switch } from "wouter";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import ModelEditor from "@/pages/ModelEditor";
import AuthPage from "@/pages/auth-page";
import ForgotPasswordPage from "@/pages/forgot-password";
import ForgotUsernamePage from "@/pages/forgot-username";
import ResetPasswordPage from "@/pages/reset-password";
import FeedbackPage from "@/pages/feedback-page";
import { ProtectedRoute } from "@/lib/protected-route";
import { BaselineProvider } from '@/contexts/BaselineContext';
import { Toaster } from '@/components/ui/toaster';

function App() {
  return (
    <BaselineProvider>
      <Switch>
        <ProtectedRoute path="/" component={Home} />
        <ProtectedRoute path="/project/:projectId" component={Home} />
        <ProtectedRoute path="/models/:modelId" component={ModelEditor} />
        <Route path="/auth" component={AuthPage} />
        <Route path="/forgot-password" component={ForgotPasswordPage} />
        <Route path="/forgot-username" component={ForgotUsernamePage} />
        <Route path="/reset-password" component={ResetPasswordPage} />
        <ProtectedRoute path="/feedback" component={FeedbackPage} />
        <Route component={NotFound} />
      </Switch>
      <Toaster />
    </BaselineProvider>
  );
}

export default App;
