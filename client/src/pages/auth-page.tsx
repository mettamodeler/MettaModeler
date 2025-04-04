import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useAuth, loginSchema, registerSchema } from "@/hooks/use-auth";
import { LoadingPage } from "@/components/ui/loading-page";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Loader2 } from "lucide-react";

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState("login");
  const [location, setLocation] = useLocation();
  const { user, loginMutation, registerMutation, isLoading } = useAuth();
  const [redirecting, setRedirecting] = useState(false);

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      displayName: "",
    },
  });

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      setLocation("/");
    }
  }, [user, setLocation]);

  const onLoginSubmit = (values: LoginFormValues) => {
    loginMutation.mutate(values);
  };

  const onRegisterSubmit = (values: RegisterFormValues) => {
    registerMutation.mutate(values);
  };

  // Show loading page during authentication
  if (loginMutation.isPending || registerMutation.isPending) {
    return <LoadingPage />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-background/80">
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        {/* Auth Card */}
        <Card className="w-full max-w-md mx-auto dark-glass border border-white/10">
          <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <CardHeader>
                <CardTitle>Welcome Back</CardTitle>
                <CardDescription>
                  Login to your MettaModeler account to continue
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                    <FormField
                      control={loginForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input placeholder="username" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
                      {loginMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Signing in...
                        </>
                      ) : (
                        "Sign In"
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
              
              <CardFooter className="flex flex-col items-center">
                <p className="text-sm text-muted-foreground mt-2">
                  Don't have an account?{" "}
                  <button
                    className="text-primary underline-offset-4 hover:underline"
                    onClick={() => setActiveTab("register")}
                  >
                    Register
                  </button>
                </p>
              </CardFooter>
            </TabsContent>
            
            <TabsContent value="register">
              <CardHeader>
                <CardTitle>Create Account</CardTitle>
                <CardDescription>
                  Register to start creating your FCM models
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                    <FormField
                      control={registerForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input placeholder="username" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={registerForm.control}
                      name="displayName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Display Name (optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="Your name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={registerForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button type="submit" className="w-full" disabled={registerMutation.isPending}>
                      {registerMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating account...
                        </>
                      ) : (
                        "Create Account"
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
              
              <CardFooter className="flex flex-col items-center">
                <p className="text-sm text-muted-foreground mt-2">
                  Already have an account?{" "}
                  <button
                    className="text-primary underline-offset-4 hover:underline"
                    onClick={() => setActiveTab("login")}
                  >
                    Sign in
                  </button>
                </p>
              </CardFooter>
            </TabsContent>
          </Tabs>
        </Card>
        
        {/* Hero Section */}
        <div className="hidden md:flex flex-col space-y-4 text-center md:text-left">
          <h1 className="text-4xl font-bold tracking-tight">
            <span className="text-secondary">MettaModeler</span> 
            <br/>
            <span className="text-primary">FCM Platform</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-md">
            A powerful web-based platform for modeling complex systems using Fuzzy Cognitive Maps.
          </p>
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="glass p-4 rounded-lg border border-white/10">
              <h3 className="font-medium mb-2">Interactive Editor</h3>
              <p className="text-sm text-muted-foreground">
                Build models visually with our intuitive node-based editor.
              </p>
            </div>
            <div className="glass p-4 rounded-lg border border-white/10">
              <h3 className="font-medium mb-2">Powerful Simulation</h3>
              <p className="text-sm text-muted-foreground">
                Test scenarios and analyze system dynamics with advanced simulations.
              </p>
            </div>
            <div className="glass p-4 rounded-lg border border-white/10">
              <h3 className="font-medium mb-2">Insightful Analytics</h3>
              <p className="text-sm text-muted-foreground">
                Gain insights with detailed charts and network analysis.
              </p>
            </div>
            <div className="glass p-4 rounded-lg border border-white/10">
              <h3 className="font-medium mb-2">Team Collaboration</h3>
              <p className="text-sm text-muted-foreground">
                Share and collaborate on models with your team.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}