import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { passwordSchema } from "@/hooks/use-auth";

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: passwordSchema,
});

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const [location, setLocation] = useLocation();
  const [token, setToken] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      token: "",
      password: "",
    },
  });

  useEffect(() => {
    // Get token from URL query parameter
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get("token");
    if (tokenParam) {
      setToken(tokenParam);
      form.setValue("token", tokenParam);
    }
  }, [form]);

  const onSubmit = async (values: ResetPasswordFormValues) => {
    try {
      await apiRequest("POST", "/api/reset-password", values);
      toast({
        title: "Password reset successful",
        description: "Your password has been reset. You can now login with your new password.",
      });
      setLocation("/auth");
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reset password",
        variant: "destructive",
      });
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-background/80">
        <Card className="w-full max-w-md dark-glass border border-white/10">
          <CardHeader>
            <CardTitle>Invalid Reset Link</CardTitle>
            <CardDescription>
              This password reset link is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => setLocation("/forgot-password")} className="w-full">
              Request new reset link
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-background/80">
      <Card className="w-full max-w-md dark-glass border border-white/10">
        <CardHeader>
          <CardTitle>Reset Password</CardTitle>
          <CardDescription>
            Enter your new password below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => {
                  const password = field.value || '';
                  const hasMinLength = password.length >= 12;
                  const hasUppercase = /[A-Z]/.test(password);
                  const hasLowercase = /[a-z]/.test(password);
                  const hasNumber = /[0-9]/.test(password);
                  const hasSpecial = /[^A-Za-z0-9]/.test(password);
                  
                  return (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <div className="mt-2 space-y-1">
                        <p className="text-xs text-muted-foreground mb-2">
                          Password must meet all of the following requirements:
                        </p>
                        <div className="space-y-1 text-xs">
                          <div className={`flex items-center gap-2 ${hasMinLength ? 'text-green-500' : 'text-muted-foreground'}`}>
                            <span>{hasMinLength ? '✓' : '○'}</span>
                            <span>At least 12 characters</span>
                          </div>
                          <div className={`flex items-center gap-2 ${hasUppercase ? 'text-green-500' : 'text-muted-foreground'}`}>
                            <span>{hasUppercase ? '✓' : '○'}</span>
                            <span>One uppercase letter (A-Z)</span>
                          </div>
                          <div className={`flex items-center gap-2 ${hasLowercase ? 'text-green-500' : 'text-muted-foreground'}`}>
                            <span>{hasLowercase ? '✓' : '○'}</span>
                            <span>One lowercase letter (a-z)</span>
                          </div>
                          <div className={`flex items-center gap-2 ${hasNumber ? 'text-green-500' : 'text-muted-foreground'}`}>
                            <span>{hasNumber ? '✓' : '○'}</span>
                            <span>One number (0-9)</span>
                          </div>
                          <div className={`flex items-center gap-2 ${hasSpecial ? 'text-green-500' : 'text-muted-foreground'}`}>
                            <span>{hasSpecial ? '✓' : '○'}</span>
                            <span>One special character (!@#$%^&*...)</span>
                          </div>
                        </div>
                      </div>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  "Reset Password"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter>
          <Button variant="ghost" onClick={() => setLocation("/auth")} className="w-full">
            Back to login
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}


