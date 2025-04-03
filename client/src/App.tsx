import { Route, Switch } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import ModelEditor from "@/pages/ModelEditor";

function App() {
  return (
    <>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/models/:modelId" component={ModelEditor} />
        <Route component={NotFound} />
      </Switch>
      <Toaster />
    </>
  );
}

export default App;
