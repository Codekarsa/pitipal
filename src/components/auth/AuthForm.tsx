import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { analytics } from "@/lib/analytics";
import { Chrome, Mail, Lock, ArrowLeft, Check, Wallet } from "lucide-react";

interface AuthFormProps {
  onSuccess: () => void;
  initialMode?: "landing" | "signin";
}

export function AuthForm({
  onSuccess,
  initialMode = "landing",
}: AuthFormProps) {
  const [mode, setMode] = useState<
    "landing" | "signup" | "signin" | "forgot" | "confirmation"
  >(initialMode);
  const [isLoading, setIsLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const { toast } = useToast();
  const primaryButton =
    "w-full rounded-lg bg-[hsl(0_0%_8%)] text-white shadow-sm hover:bg-[hsl(0_0%_20%)] focus-visible:ring-[hsl(15_75%_45%)]";
  const secondaryButton =
    "rounded-lg border-black/15 bg-white text-[hsl(0_0%_8%)] hover:bg-[hsl(30_20%_96%)] hover:text-black focus-visible:ring-[hsl(15_75%_45%)]";
  const textLink =
    "h-auto whitespace-normal p-0 text-[hsl(0_0%_20%)] underline decoration-black/25 underline-offset-4 hover:decoration-black focus-visible:ring-[hsl(15_75%_45%)]";
  const inputClass =
    "h-12 rounded-lg border-black/15 bg-[hsl(30_20%_99%)] text-[hsl(0_0%_8%)] placeholder:text-[hsl(0_0%_48%)] focus-visible:ring-[hsl(15_75%_55%)]";

  const handleGoogleAuth = async () => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
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
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        toast({
          title: "Sign Up Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        analytics.trackSignUp("email");
        setPassword("");
        if (data.session) {
          onSuccess();
        } else {
          setResendMessage("");
          setMode("confirmation");
        }
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

  const handleResendConfirmation = async () => {
    setIsLoading(true);
    setResendMessage("");
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: `${window.location.origin}/` },
      });
      setResendMessage(
        error
          ? error.message
          : "Confirmation requested. Check your inbox and spam folder; delivery may take a few minutes.",
      );
    } catch {
      setResendMessage("Could not request another email. Please try again.");
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
      } else {
        analytics.trackLogin("email");
        onSuccess();
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
        setMode("signin");
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
        variant="outline"
        size="lg"
        className={`w-full px-4 text-sm ${secondaryButton}`}
      >
        <Chrome className="mr-2 h-5 w-5" />
        {isLoading ? "Signing in..." : "Continue with Google"}
      </Button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-black/10" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-3 text-[hsl(0_0%_40%)]">
            Or continue with email
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button
          onClick={() => {
            resetForm();
            setMode("signup");
          }}
          size="lg"
          className={`${primaryButton} px-3 text-sm`}
        >
          <Mail className="mr-2 h-4 w-4" />
          Sign Up
        </Button>
        <Button
          onClick={() => {
            resetForm();
            setMode("signin");
          }}
          variant="outline"
          size="lg"
          className={`${secondaryButton} px-3 text-sm`}
        >
          <Lock className="mr-2 h-4 w-4" />
          Sign In
        </Button>
      </div>
    </CardContent>
  );

  const renderSignUpMode = () => (
    <CardContent className="space-y-6">
      <form onSubmit={handleEmailSignUp} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="fullName">Full Name</Label>
          <Input
            id="fullName"
            type="text"
            autoComplete="name"
            className={inputClass}
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
            autoComplete="email"
            className={inputClass}
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
            autoComplete="new-password"
            className={inputClass}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Create a password"
            minLength={6}
            aria-describedby="password-help"
            required
          />
          <p
            id="password-help"
            className="text-xs leading-relaxed text-[hsl(0_0%_40%)]"
          >
            Use at least 6 characters. This deployment may require a stronger
            password.
          </p>
        </div>

        <Button
          type="submit"
          size="lg"
          className={`${primaryButton} text-sm`}
          disabled={isLoading || !email || !password || !fullName}
        >
          {isLoading ? "Creating Account..." : "Create Account"}
        </Button>
      </form>

      <p className="text-center text-sm text-[hsl(0_0%_40%)]">
        Already have an account?{" "}
        <Button
          variant="link"
          className={textLink}
          onClick={() => {
            resetForm();
            setMode("signin");
          }}
        >
          Sign in here
        </Button>
      </p>
    </CardContent>
  );

  const renderSignInMode = () => (
    <CardContent className="space-y-6">
      <form onSubmit={handleEmailSignIn} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            className={inputClass}
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
            autoComplete="current-password"
            className={inputClass}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
          />
        </div>

        <Button
          type="submit"
          size="lg"
          className={`${primaryButton} text-sm`}
          disabled={isLoading || !email || !password}
        >
          {isLoading ? "Signing In..." : "Sign In"}
        </Button>
      </form>

      <div className="flex flex-col space-y-3 text-center">
        <Button
          variant="link"
          className={`${textLink} self-center text-sm`}
          onClick={() => {
            resetForm();
            setMode("forgot");
          }}
        >
          Forgot your password?
        </Button>

        <p className="text-sm text-[hsl(0_0%_40%)]">
          Don't have an account?{" "}
          <Button
            variant="link"
            className={textLink}
            onClick={() => {
              resetForm();
              setMode("signup");
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
      <form onSubmit={handleForgotPassword} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            className={inputClass}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
          />
        </div>

        <Button
          type="submit"
          size="lg"
          className={`${primaryButton} text-sm`}
          disabled={isLoading || !email}
        >
          {isLoading ? "Sending..." : "Send Reset Link"}
        </Button>
      </form>
    </CardContent>
  );

  const getTitle = () => {
    switch (mode) {
      case "signup":
        return "Create Your Account";
      case "signin":
        return "Welcome Back";
      case "forgot":
        return "Reset Password";
      case "confirmation":
        return "Check your email";
      default:
        return "Welcome to Pitipal";
    }
  };

  const getDescription = () => {
    switch (mode) {
      case "signup":
        return "Create pockets and keep track of your spending";
      case "signin":
        return "Sign in to continue to your dashboard";
      case "forgot":
        return "Enter your email and we’ll send a link to reset your password";
      case "confirmation":
        return "Finish confirming your email before signing in";
      default:
        return "Plan your budget with pockets and recorded transactions";
    }
  };

  return (
    <div className="relative isolate flex min-h-screen flex-col overflow-hidden bg-[hsl(30_20%_96%)] text-[hsl(0_0%_8%)] selection:bg-[hsl(15_90%_86%)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_0%_35%,hsl(20_90%_85%_/_0.55),transparent_55%),radial-gradient(ellipse_at_100%_65%,hsl(275_80%_91%_/_0.6),transparent_55%),radial-gradient(ellipse_at_60%_90%,hsl(335_80%_89%_/_0.5),transparent_50%)]"
      />
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
        <a
          href="/"
          aria-label="Pitipal home"
          className="flex items-center gap-2 rounded-sm text-lg font-semibold tracking-tight focus-visible:outline-offset-4"
        >
          <img
            src="/pitipal_square.png"
            alt=""
            width="32"
            height="32"
            className="rounded-lg"
          />
          Pitipal
        </a>
        <a
          href="/"
          className="inline-flex min-h-10 items-center gap-2 rounded-sm text-xs text-[hsl(0_0%_35%)] hover:text-black focus-visible:outline-offset-4 sm:text-sm"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Back to home
        </a>
      </header>
      <main className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 items-center gap-12 px-4 pb-8 pt-3 sm:px-6 sm:py-10 lg:grid-cols-2 lg:gap-20 lg:px-8">
        <aside aria-label="About Pitipal" className="hidden lg:block">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/60 px-3 py-1.5 text-xs text-[hsl(0_0%_35%)]">
            <Wallet
              aria-hidden="true"
              className="h-3.5 w-3.5 text-[hsl(15_75%_45%)]"
            />
            A little clarity for your everyday money
          </span>
          <h2 className="mt-6 text-5xl font-semibold leading-[1.08] tracking-[-0.045em]">
            Small steps.
            <br />
            Clearer spending.
          </h2>
          <p className="mt-5 max-w-sm text-base leading-relaxed text-[hsl(0_0%_38%)]">
            Give your priorities their own pockets. See what’s left, and make
            room for what matters.
          </p>
          <div className="mt-8 rounded-3xl bg-[linear-gradient(135deg,hsl(22_85%_88%),hsl(340_60%_91%),hsl(272_60%_87%))] p-5">
            <div className="rounded-2xl border border-white/80 bg-white/85 p-6">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium">Groceries pocket</span>
                <span className="rounded-full bg-[hsl(145_30%_94%)] px-2.5 py-1 text-xs text-[hsl(155_35%_28%)]">
                  Example
                </span>
              </div>
              <p className="mt-5 text-xs text-[hsl(0_0%_40%)]">Left to spend</p>
              <p className="mt-1 text-3xl font-semibold tracking-tight">
                IDR 2,750,000
              </p>
              <div
                aria-hidden="true"
                className="mt-5 h-2 overflow-hidden rounded-full bg-[hsl(270_30%_92%)]"
              >
                <div className="h-full w-[8.3333%] rounded-full bg-[hsl(15_75%_65%)]" />
              </div>
              <p className="mt-4 text-xs leading-relaxed text-[hsl(0_0%_40%)]">
                3M budget − 250k spending = 2.75M left.
                <br />
                Illustrative data, not a bank balance.
              </p>
            </div>
          </div>
          <p className="mt-6 flex items-center gap-2 text-xs text-[hsl(0_0%_40%)]">
            <Check
              aria-hidden="true"
              className="h-4 w-4 text-[hsl(155_35%_36%)]"
            />
            No credit card. No bank connection required.
          </p>
        </aside>
        <div className="mx-auto w-full min-w-0 max-w-md rounded-3xl bg-[linear-gradient(135deg,hsl(15_80%_77%),hsl(335_65%_85%),hsl(275_70%_79%))] p-[1px] shadow-[0_20px_60px_-35px_hsl(310_30%_45%_/_0.35)]">
          <Card className="w-full rounded-[calc(1.5rem-1px)] border-0 bg-white text-[hsl(0_0%_8%)] shadow-none">
            <CardHeader className="space-y-3 pb-6 pt-7 sm:px-8 sm:pt-8">
              {mode !== "landing" && mode !== "confirmation" && (
                <Button
                  onClick={() =>
                    setMode(mode === "forgot" ? "signin" : "landing")
                  }
                  disabled={isLoading}
                  variant="ghost"
                  size="sm"
                  className="-ml-2 mb-1 w-fit gap-1.5 px-2 text-xs text-[hsl(0_0%_40%)] hover:bg-black/5 hover:text-black"
                >
                  <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
                  {mode === "forgot" ? "Back to Sign In" : "Back"}
                </Button>
              )}
              <span className="mb-1 flex h-11 w-11 items-center justify-center rounded-xl bg-[hsl(20_75%_94%)] text-[hsl(15_65%_40%)]">
                {mode === "confirmation" ? (
                  <Mail aria-hidden="true" className="h-5 w-5" />
                ) : (
                  <Wallet aria-hidden="true" className="h-5 w-5" />
                )}
              </span>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                {getTitle()}
              </h1>
              <CardDescription className="text-sm leading-relaxed text-[hsl(0_0%_40%)]">
                {getDescription()}
              </CardDescription>
            </CardHeader>
            <div className="[&>div]:sm:px-8">
              {mode === "landing" && renderLandingMode()}
              {mode === "signup" && renderSignUpMode()}
              {mode === "signin" && renderSignInMode()}
              {mode === "forgot" && renderForgotMode()}
              {mode === "confirmation" && (
                <CardContent className="space-y-4">
                  <p className="text-sm leading-relaxed">
                    A confirmation link was requested for{" "}
                    <strong className="mt-2 block break-all text-base font-medium">
                      {email}
                    </strong>
                  </p>
                  <p className="text-sm leading-relaxed">
                    Check your inbox and spam folder. Delivery may take a few
                    minutes.
                  </p>
                  <p className="text-xs leading-relaxed text-[hsl(0_0%_40%)]">
                    If this address already has an account, sign in instead. For
                    privacy, the signup response does not confirm whether an
                    account already exists.
                  </p>
                  <Button
                    className={`${primaryButton} min-h-12 whitespace-normal`}
                    onClick={handleResendConfirmation}
                    disabled={isLoading}
                  >
                    {isLoading ? "Requesting…" : "Resend confirmation email"}
                  </Button>
                  <p role="status" className="text-sm">
                    {resendMessage}
                  </p>
                  <Button
                    variant="outline"
                    className={`w-full min-h-11 ${secondaryButton}`}
                    disabled={isLoading}
                    onClick={() => {
                      setPassword("");
                      setMode("signup");
                    }}
                  >
                    Correct email address
                  </Button>
                  <Button
                    variant="link"
                    className={`w-full min-h-11 ${textLink}`}
                    disabled={isLoading}
                    onClick={() => setMode("signin")}
                  >
                    Back to Sign In
                  </Button>
                </CardContent>
              )}
            </div>
            <nav
              aria-label="Data and usage information"
              className="mx-6 space-y-3 border-t border-black/10 py-5 text-center text-xs leading-relaxed text-[hsl(0_0%_40%)] sm:mx-8"
            >
              <p>
                Before continuing, read how this app handles data and what using
                this deployment involves.
              </p>
              <p>
                <a
                  className="underline"
                  href="/privacy.html"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Privacy information (new tab)
                </a>
                {" · "}
                <a
                  className="underline"
                  href="/usage.html"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Usage information (new tab)
                </a>
              </p>
            </nav>
          </Card>
        </div>
      </main>
      <footer className="px-4 pb-6 text-center text-xs text-[hsl(0_0%_40%)]">
        A little more clarity. A little more control.
      </footer>
    </div>
  );
}
