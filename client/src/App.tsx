import { Route, Switch } from "wouter";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import ModelEditor from "@/pages/ModelEditor";
import AuthPage from "@/pages/auth-page";
import { ProtectedRoute } from "@/lib/protected-route";

function App() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={Home} />
      <ProtectedRoute path="/models/:modelId" component={ModelEditor} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default App;
