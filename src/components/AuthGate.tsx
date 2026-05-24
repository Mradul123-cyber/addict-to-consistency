import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Lock, Mail, UserCheck, User, UserRound } from "lucide-react";

const GoogleIcon = () => (
  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      fill="#EA4335"
    />
  </svg>
);

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading, signInWithGoogle, signInWithEmail, signUpWithEmail, signInAsGuest } =
    useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [guestConfirmOpen, setGuestConfirmOpen] = useState(false);
  const [guestName, setGuestName] = useState("");

  if (loading) {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-background overflow-hidden">
        {/* Animated ambient background */}
        <div className="absolute top-1/4 left-1/4 -z-10 h-[40vw] w-[40vw] rounded-full bg-indigo-500/10 blur-[100px] animate-pulse duration-4000" />
        <div className="absolute bottom-1/4 right-1/4 -z-10 h-[40vw] w-[40vw] rounded-full bg-violet-500/10 blur-[100px] animate-pulse duration-6000" />
        <div className="flex flex-col items-center gap-4 text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground font-medium animate-pulse">
            Initializing JEE Console...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!email || !password) {
        toast.error("Please fill in all fields.");
        return;
      }
      if (isSignUp && !name.trim()) {
        toast.error("Please enter your username.");
        return;
      }
      if (isSignUp && password !== confirmPassword) {
        toast.error("Passwords do not match.");
        return;
      }

      setActionLoading(true);
      try {
        if (isSignUp) {
          await signUpWithEmail(email, password, name.trim());
          toast.success("Account created successfully!");
        } else {
          await signInWithEmail(email, password);
          toast.success("Signed in successfully!");
        }
      } catch (err: any) {
        console.error("Auth action failed:", err);
        const friendlyMessage = err.message
          ? err.message.replace("Firebase: ", "")
          : "Authentication failed. Please verify credentials.";
        toast.error(friendlyMessage);
      } finally {
        setActionLoading(false);
      }
    };

    const handleGoogleSignIn = async () => {
      setActionLoading(true);
      try {
        await signInWithGoogle();
        toast.success("Signed in with Google!");
      } catch (err: any) {
        console.error("Google Sign-In failed:", err);
        if (err.code !== "auth/popup-closed-by-user") {
          toast.error(err.message || "Google Authentication failed.");
        }
      } finally {
        setActionLoading(false);
      }
    };

    const handleGuestSignIn = async () => {
      if (!guestName.trim()) {
        toast.error("Please enter your name.");
        return;
      }

      setActionLoading(true);
      try {
        await signInAsGuest(guestName.trim());
        setGuestConfirmOpen(false);
        setGuestName("");
        toast.success(`Welcome, ${guestName.trim()}!`);
      } catch (err: any) {
        console.error("Guest sign-in failed:", err);
        const friendlyMessage = err.message
          ? err.message.replace("Firebase: ", "")
          : "Guest access is unavailable. Please try again or create an account.";
        toast.error(friendlyMessage);
      } finally {
        setActionLoading(false);
      }
    };

    return (
      <div className="relative flex min-h-screen items-center justify-center bg-background px-4 overflow-hidden">
        {/* Glow backdrop design */}
        <div className="absolute inset-0 -z-10 h-full w-full bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] dark:bg-[radial-gradient(#1f2937_1px,transparent_1px)]" />
        <div className="absolute top-1/4 left-1/4 -z-10 h-[50vw] w-[50vw] rounded-full bg-indigo-500/10 blur-[120px] animate-pulse duration-5000" />
        <div className="absolute bottom-1/4 right-1/4 -z-10 h-[50vw] w-[50vw] rounded-full bg-violet-500/10 blur-[120px] animate-pulse duration-7000" />

        <Card className="w-full max-w-md bg-card/65 backdrop-blur-xl border border-border/80 shadow-2xl transition-all duration-300">
          <CardHeader className="space-y-2 text-center pb-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-inner">
              <UserCheck className="h-6 w-6" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
              {isSignUp ? "Create Workspace" : "Console Lockscreen"}
            </CardTitle>
            <CardDescription className="text-muted-foreground text-sm">
              {isSignUp
                ? "Sign up to track your JEE study sessions and analytics"
                : "Authorize to unlock your JEE preparation control deck"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {isSignUp && (
                <div className="space-y-1.5 animate-fadeIn">
                  <Label htmlFor="name">Username</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="Username"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-9 h-10 border-input bg-background/50 hover:bg-background/80 focus-visible:ring-1"
                      disabled={actionLoading}
                      required
                    />
                  </div>
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email">Email address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@domain.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9 h-10 border-input bg-background/50 hover:bg-background/80 focus-visible:ring-1"
                    disabled={actionLoading}
                    required
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 h-10 border-input bg-background/50 hover:bg-background/80 focus-visible:ring-1"
                    disabled={actionLoading}
                    required
                  />
                </div>
              </div>

              {isSignUp && (
                <div className="space-y-1.5 animate-fadeIn">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-9 h-10 border-input bg-background/50 hover:bg-background/80 focus-visible:ring-1"
                      disabled={actionLoading}
                      required
                    />
                  </div>
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-10 font-medium transition-all shadow-md shadow-primary/20 hover:shadow-primary/30 hover:translate-y-[-1px] active:translate-y-[0px]"
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : isSignUp ? (
                  "Create Account"
                ) : (
                  "Access Console"
                )}
              </Button>
            </form>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-border/80"></div>
              <span className="flex-shrink mx-4 text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                Or Continue With
              </span>
              <div className="flex-grow border-t border-border/80"></div>
            </div>

            <Button
              variant="outline"
              type="button"
              className="w-full h-10 font-medium border-border/80 hover:bg-accent/60 transition-all hover:translate-y-[-1px] active:translate-y-[0px]"
              onClick={handleGoogleSignIn}
              disabled={actionLoading}
            >
              <GoogleIcon />
              Google Authentication
            </Button>

            <Button
              variant="ghost"
              type="button"
              className="w-full h-10 font-medium text-muted-foreground hover:text-foreground transition-all"
              onClick={() => setGuestConfirmOpen(true)}
              disabled={actionLoading}
            >
              <UserRound className="mr-2 h-4 w-4" />
              Continue as Guest
            </Button>
          </CardContent>
          <CardFooter className="flex justify-center border-t border-border/40 py-4 bg-accent/20 rounded-b-xl">
            <button
              type="button"
              className="text-xs font-semibold text-primary hover:underline transition-all"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setName("");
                setEmail("");
                setPassword("");
                setConfirmPassword("");
              }}
              disabled={actionLoading}
            >
              {isSignUp
                ? "Already have a console key? Access locks"
                : "Need access? Initialize a new user profile"}
            </button>
          </CardFooter>
        </Card>

        <AlertDialog
          open={guestConfirmOpen}
          onOpenChange={(open) => {
            if (!actionLoading) {
              setGuestConfirmOpen(open);
              if (!open) setGuestName("");
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Continue as Guest?</AlertDialogTitle>
              <AlertDialogDescription className="space-y-2 text-left">
                <span className="block">
                  You may explore JEE Console without creating an account. This is intended
                  for evaluation and short-term use only.
                </span>
                <span className="block">
                  Guest activity is tied to this browser session and is not linked to a registered
                  profile. Your progress, session logs, and preferences will not be saved in the
                  same way as a standard account and may be lost if you sign out, clear browser
                  data, or switch devices.
                </span>
                <span className="block">
                  To keep your data secure and accessible long term, create a full account at any
                  time.
                </span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-1.5 py-1">
              <Label htmlFor="guestName">Your name</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="guestName"
                  type="text"
                  placeholder="Enter your name"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="pl-9 h-10"
                  disabled={actionLoading}
                  autoFocus
                />
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  void handleGuestSignIn();
                }}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Starting guest session...
                  </>
                ) : (
                  "Continue as Guest"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  return <>{children}</>;
}
