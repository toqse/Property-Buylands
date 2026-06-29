"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "@/lib/router";
import { useAuth } from "@/context/AuthContext";
import { accountsApi } from "@/lib/api/accounts";
import { getErrorMessage } from "@/lib/api/errors";
import { display_console_logs } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Logo } from "@/components/Logo";
import { Mail, Lock, ShieldCheck, KeyRound, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

type ForgotStep = null | "request" | "verify" | "reset";

const RESEND_COOLDOWN_SEC = 60;

const AdminLogin = () => {
  const { loginFromApiResponse } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotStep, setForgotStep] = useState<ForgotStep>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const passwordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await accountsApi.login(email.trim(), password);
      if (!res.user.is_staff) {
        toast.error("This account is not an administrator");
        return;
      }
      loginFromApiResponse(res);
      toast.success("Welcome, Administrator");
      navigate("/admin");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const submitForgotRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await accountsApi.forgotPassword(email.trim());
      if (display_console_logs && res.otp) console.log(`Dev OTP: ${res.otp}`);
      toast.success(res.message || "Reset code sent to your email");
      setOtp("");
      setForgotStep("verify");
      setResendCooldown(RESEND_COOLDOWN_SEC);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const submitForgotVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      toast.error("Enter the 6-digit code");
      return;
    }
    setLoading(true);
    try {
      const res = await accountsApi.verifyOtp(email.trim(), otp);
      if (!res.success) {
        toast.error(res.message || "Invalid or expired code");
        return;
      }
      toast.success("Code verified — set your new password");
      setForgotStep("reset");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const resendForgotOtp = async () => {
    if (resendCooldown > 0 || loading) return;
    setLoading(true);
    try {
      const res = await accountsApi.forgotPassword(email.trim());
      if (display_console_logs && res.otp) console.log(`Dev OTP: ${res.otp}`);
      toast.success(res.message || "Reset code resent");
      setOtp("");
      setResendCooldown(RESEND_COOLDOWN_SEC);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const submitForgotReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      toast.error("Enter the 6-digit code");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await accountsApi.resetPassword({
        email: email.trim(),
        otp,
        new_password: password,
        confirm_password: confirmPassword,
      });
      toast.success("Password reset — sign in with your new password");
      setPassword("");
      setConfirmPassword("");
      setOtp("");
      setForgotStep(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const cancelForgot = () => {
    setForgotStep(null);
    setOtp("");
    setPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex bg-[hsl(30_14%_10%)] text-background p-14 flex-col justify-between relative overflow-hidden">
        <div className="absolute -top-20 -right-20 h-96 w-96 rounded-full bg-gold/10 blur-3xl animate-float" />
        <Logo variant="light" />
        <div className="relative animate-fade-in">
          <ShieldCheck className="h-12 w-12 text-gold mb-6" />
          <h1 className="font-serif text-5xl leading-tight">Admin Control Center</h1>
          <p className="mt-4 text-background/70 max-w-md">
            Manage properties, users, content and the entire experience from one elegant control panel.
          </p>
        </div>
        <div className="text-xs uppercase tracking-[0.25em] text-background/50">© Buylands India</div>
      </div>

      <div className="flex items-center justify-center p-8 bg-background animate-fade-in">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-6">
            <Logo />
          </div>
          <div className="text-xs uppercase tracking-[0.25em] text-gold">Admin access</div>
          <h2 className="font-serif text-4xl mt-2">
            {forgotStep === "request"
              ? "Reset password"
              : forgotStep === "verify"
                ? "Verify reset code"
                : forgotStep === "reset"
                  ? "Set new password"
                  : "Sign in"}
          </h2>
          <p className="text-muted-foreground mt-2">
            {forgotStep === "request"
              ? "We'll email a one-time code to your staff account."
              : forgotStep === "verify"
                ? "Enter the code sent to your email."
                : forgotStep === "reset"
                  ? "Choose a strong new password."
                  : "Authenticate with your staff email and password."}
          </p>

          {forgotStep === null && (
            <Tabs defaultValue="password" className="mt-8">
              <TabsList className="grid w-full grid-cols-1">
                <TabsTrigger value="password">Password</TabsTrigger>
              </TabsList>

              <TabsContent value="password" className="mt-6">
                <form onSubmit={passwordLogin} className="space-y-4">
                  <div>
                    <Label>Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        className="pl-10"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        className="pl-10 pr-10"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        tabIndex={-1}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <Button type="submit" variant="luxe" size="lg" className="w-full" disabled={loading}>
                    {loading ? "Signing in…" : "Sign in"}
                  </Button>
                  <button
                    type="button"
                    onClick={() => setForgotStep("request")}
                    className="block w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Forgot password?
                  </button>
                </form>
              </TabsContent>
            </Tabs>
          )}

          {forgotStep === "request" && (
            <form onSubmit={submitForgotRequest} className="mt-8 space-y-4">
              <div>
                <Label>Staff email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-10"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              </div>
              <Button type="submit" variant="luxe" size="lg" className="w-full" disabled={loading}>
                Send reset code
              </Button>
              <button
                type="button"
                onClick={cancelForgot}
                className="block w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Back to sign in
              </button>
            </form>
          )}

          {forgotStep === "verify" && (
            <form onSubmit={submitForgotVerify} className="mt-8 space-y-5">
              <div className="text-center">
                <KeyRound className="mx-auto h-10 w-10 text-gold" />
                <p className="mt-3 text-sm text-muted-foreground">
                  Enter the code sent to <b>{email}</b>
                </p>
              </div>
              <div className="flex justify-center">
                <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                  <InputOTPGroup>
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <InputOTPSlot key={i} index={i} />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <Button type="submit" variant="luxe" size="lg" className="w-full" disabled={loading}>
                Verify code
              </Button>
              <button
                type="button"
                onClick={resendForgotOtp}
                disabled={resendCooldown > 0 || loading}
                className="block w-full text-center text-sm text-gold hover:text-gold/80 disabled:text-muted-foreground disabled:cursor-not-allowed"
              >
                {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend code"}
              </button>
              <button
                type="button"
                onClick={cancelForgot}
                className="block w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Back to sign in
              </button>
            </form>
          )}

          {forgotStep === "reset" && (
            <form onSubmit={submitForgotReset} className="mt-8 space-y-4">
              <div>
                <Label>New password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-10 pr-10"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <Label>Confirm new password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-10 pr-10"
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    tabIndex={-1}
                    aria-label={showConfirm ? "Hide password" : "Show password"}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" variant="luxe" size="lg" className="w-full" disabled={loading}>
                Reset password
              </Button>
              <button
                type="button"
                onClick={() => setForgotStep("verify")}
                className="block w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Back to code entry
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
