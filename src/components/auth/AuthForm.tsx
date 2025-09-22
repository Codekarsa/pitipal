import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Chrome, Mail, Lock, ArrowLeft } from "lucide-react";

interface AuthFormProps {
  onSuccess: () => void;
}

export function AuthForm({ onSuccess }: AuthFormProps) {
  const [mode, setMode] = useState<'landing' | 'signup' | 'signin' | 'forgot'>('landing');
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const { toast } = useToast();

  const handleGoogleAuth = async () => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });

      if (error) {
        toast({
          title: "Authentication Error",
          description: error.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Authentication Error", 
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !fullName) return;

    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: fullName,
          }
        }
      });

      if (error) {
        toast({
          title: "Sign Up Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Check your email",
          description: "We've sent you a confirmation link to complete your registration.",
        });
        setMode('signin');
      }
    } catch (error) {
      toast({
        title: "Sign Up Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          title: "Sign In Error",
          description: error.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Sign In Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    try {
      setIsLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/`,
      });

      if (error) {
        toast({
          title: "Reset Password Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Check your email",
          description: "We've sent you a password reset link.",
        });
        setMode('signin');
      }
    } catch (error) {
      toast({
        title: "Reset Password Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setFullName("");
  };

  const renderLandingMode = () => (
    <CardContent className="space-y-6">
      <Button
        onClick={handleGoogleAuth}
        disabled={isLoading}
        variant="hero"
        size="lg"
        className="w-full"
      >
        <Chrome className="mr-2 h-5 w-5" />
        {isLoading ? "Signing in..." : "Continue with Google"}
      </Button>
      
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Button
          onClick={() => {
            resetForm();
            setMode('signup');
          }}
          variant="outline"
          size="lg"
        >
          <Mail className="mr-2 h-4 w-4" />
          Sign Up
        </Button>
        <Button
          onClick={() => {
            resetForm();
            setMode('signin');
          }}
          variant="outline"
          size="lg"
        >
          <Lock className="mr-2 h-4 w-4" />
          Sign In
        </Button>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        By continuing, you agree to our Terms of Service and Privacy Policy
      </p>
    </CardContent>
  );

  const renderSignUpMode = () => (
    <CardContent className="space-y-6">
      <Button
        onClick={() => setMode('landing')}
        variant="ghost"
        size="sm"
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      <form onSubmit={handleEmailSignUp} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="fullName">Full Name</Label>
          <Input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Enter your full name"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Create a password"
            minLength={6}
            required
          />
        </div>

        <Button
          type="submit"
          variant="hero"
          size="lg"
          className="w-full"
          disabled={isLoading || !email || !password || !fullName}
        >
          {isLoading ? "Creating Account..." : "Create Account"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Button
          variant="link"
          className="p-0 h-auto"
          onClick={() => {
            resetForm();
            setMode('signin');
          }}
        >
          Sign in here
        </Button>
      </p>
    </CardContent>
  );

  const renderSignInMode = () => (
    <CardContent className="space-y-6">
      <Button
        onClick={() => setMode('landing')}
        variant="ghost"
        size="sm"
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      <form onSubmit={handleEmailSignIn} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
          />
        </div>

        <Button
          type="submit"
          variant="hero"
          size="lg"
          className="w-full"
          disabled={isLoading || !email || !password}
        >
          {isLoading ? "Signing In..." : "Sign In"}
        </Button>
      </form>

      <div className="flex flex-col space-y-3 text-center">
        <Button
          variant="link"
          className="p-0 h-auto text-sm"
          onClick={() => {
            resetForm();
            setMode('forgot');
          }}
        >
          Forgot your password?
        </Button>
        
        <p className="text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Button
            variant="link"
            className="p-0 h-auto"
            onClick={() => {
              resetForm();
              setMode('signup');
            }}
          >
            Sign up here
          </Button>
        </p>
      </div>
    </CardContent>
  );

  const renderForgotMode = () => (
    <CardContent className="space-y-6">
      <Button
        onClick={() => setMode('signin')}
        variant="ghost"
        size="sm"
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Sign In
      </Button>

      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold">Reset Your Password</h3>
        <p className="text-sm text-muted-foreground mt-2">
          Enter your email address and we'll send you a link to reset your password.
        </p>
      </div>

      <form onSubmit={handleForgotPassword} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
          />
        </div>

        <Button
          type="submit"
          variant="hero"
          size="lg"
          className="w-full"
          disabled={isLoading || !email}
        >
          {isLoading ? "Sending..." : "Send Reset Link"}
        </Button>
      </form>
    </CardContent>
  );

  const getTitle = () => {
    switch (mode) {
      case 'signup': return 'Create Your Account';
      case 'signin': return 'Welcome Back';
      case 'forgot': return 'Reset Password';
      default: return 'Welcome to ChromaBudget';
    }
  };

  const getDescription = () => {
    switch (mode) {
      case 'signup': return 'Start your journey to financial freedom';
      case 'signin': return 'Sign in to continue to your dashboard';
      case 'forgot': return 'We\'ll help you get back to your account';
      default: return 'Your smart budgeting companion with AI-powered insights';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-subtle p-4">
      <Card className="w-full max-w-md bg-gradient-card border-0 shadow-xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-glow">
            <span className="text-2xl font-bold text-primary-foreground">₿</span>
          </div>
          <CardTitle className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            {getTitle()}
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {getDescription()}
          </CardDescription>
        </CardHeader>
        
        {mode === 'landing' && renderLandingMode()}
        {mode === 'signup' && renderSignUpMode()}
        {mode === 'signin' && renderSignInMode()}
        {mode === 'forgot' && renderForgotMode()}
      </Card>
    </div>
  );
}