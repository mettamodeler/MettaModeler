import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { useLocation } from "wouter";
import { z } from "zod";
import { User } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Validation schemas for login and registration
// These match the server-side validation in server/validation/auth.ts
export const usernameSchema = z.string()
  .min(3, "Username must be at least 3 characters")
  .max(30, "Username must be less than 30 characters")
  .regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, underscores, and hyphens")
  .transform(val => val.toLowerCase().trim());

export const passwordSchema = z.string()
  .min(12, "Password must be at least 12 characters")
  .max(128, "Password must be less than 128 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");

export const emailSchema = z.string()
  .email("Please enter a valid email address")
  .max(255, "Email must be less than 255 characters")
  .transform(val => val.toLowerCase().trim());

export const displayNameSchema = z.string()
  .max(100, "Display name must be less than 100 characters")
  .optional()
  .transform(val => val?.trim() || undefined);

export const loginSchema = z.object({
  username: usernameSchema,
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
  displayName: displayNameSchema,
});

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<User, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<User, Error, RegisterData>;
};

type RegisterData = z.infer<typeof registerSchema>;
type LoginData = Pick<User, "username"> & { password: string };

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [_, navigate] = useLocation();
  const {
    data: user,
    error,
    isLoading,
  } = useQuery({
    queryKey: ["/api/user"],
    queryFn: async () => {
      try {
        return await apiRequest("GET", "/api/user");
      } catch (error) {
        console.error("Error fetching user:", error);
        if (error instanceof Error && error.message.startsWith("401:")) {
          return null;
        }
        throw error;
      }
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      return await apiRequest("POST", "/api/login", credentials);
    },
    onSuccess: (user: User) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Login successful",
        description: `Welcome back, ${user.displayName || user.username}!`,
      });
      navigate("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message || "Incorrect username or password",
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: RegisterData) => {
      return await apiRequest("POST", "/api/register", credentials);
    },
    onSuccess: (user: User) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Registration successful",
        description: `Welcome, ${user.displayName || user.username}!`,
      });
      navigate("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message || "Could not create account",
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
      toast({
        title: "Logged out successfully",
      });
      navigate("/auth");
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}