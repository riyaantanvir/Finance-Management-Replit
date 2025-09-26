import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { setAuthState, AuthState } from "@/lib/auth";

interface LoginProps {
  onLogin: (authState: AuthState) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState("Admin");
  const [password, setPassword] = useState("Admin");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await apiRequest("POST", "/api/auth/login", {
        username,
        password,
      });

      const data = await response.json();
      
      // Store sessionId for work reports authentication
      if (data.sessionId) {
        localStorage.setItem('sessionId', data.sessionId);
      }
      
      const authState = { user: data.user, isAuthenticated: true };
      setAuthState(data.user);
      onLogin(authState);
      
      toast({
        title: "Login successful",
        description: "Welcome to Finance CRM",
      });
    } catch (error) {
      toast({
        title: "Login failed",
        description: "Invalid credentials",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50" data-testid="login-page">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-gray-900">Finance CRM</CardTitle>
          <CardDescription className="text-gray-600">Sign in to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6" data-testid="form-login">
            <div className="space-y-4">
              <div>
                <Label htmlFor="username" className="text-gray-700">Username</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="mt-1"
                  data-testid="input-username"
                />
              </div>
              <div>
                <Label htmlFor="password" className="text-gray-700">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1"
                  data-testid="input-password"
                />
              </div>
            </div>
            <Button
              type="submit"
              className="w-full bg-black hover:bg-gray-800 text-white"
              disabled={isLoading}
              data-testid="button-login"
            >
              {isLoading ? "Signing In..." : "Sign In"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
