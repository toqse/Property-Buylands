"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "@/lib/router";
import { useAuth } from "@/context/AuthContext";
import { accountsApi } from "@/lib/api/accounts";
import { getErrorMessage } from "@/lib/api/errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Logo } from "@/components/Logo";
import { Mail, Lock, KeyRound, Eye, EyeOff, Briefcase } from "lucide-react";
import { toast } from "sonner";

type ForgotStep = null | "request" | "verify" | "reset";

const RESEND_COOLDOWN_SEC = 60;

const StaffLogin = () => {
  const { loginFromApiResponse, user, hydrated } = useAuth();
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
  const [otpStep, setOtpStep] = useState<"request" | "verify">("request");

  useEffect(() => {
    if (!hydrated) return;
    if (user?.role === "staff") navigate("/staff");
    if (user?.role === "admin") navigate("/admin");
  }, [hydrated, user, navigate]);

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
      if (res.user.is_superuser) {
        toast.error("Use the admin login page for administrator accounts");
        return;
      }
      if (!res.user.is_staff) {
        toast.error("This account is not a staff account");
        return;
      }
      loginFromApiResponse(res);
      toast.success("Welcome to the Staff Portal");
      navigate("/staff");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const requestLoginOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await accountsApi.loginOtpRequest(email.trim());
      toast.success(res.message || "Login code sent to your email");
      setOtp("");
      setOtpStep("verify");
      setResendCooldown(RESEND_COOLDOWN_SEC);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const verifyLoginOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      toast.error("Enter the 6-digit code");
      return;
    }
    setLoading(true);
    try {
      const res = await accountsApi.loginOtpVerify(email.trim(), otp);
      if (res.user?.is_superuser) {
        toast.error("Use the admin login page for administrator accounts");
        return;
      }
      if (!res.user?.is_staff) {
        toast.error("This account is not a staff account");
        return;
      }
      loginFromApiResponse(res);
      toast.success("Welcome to the Staff Portal");
      navigate("/staff");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const resendLoginOtp = async () => {
    if (resendCooldown > 0 || loading) return;
    setLoading(true);
    try {
      const res = await accountsApi.loginOtpRequest(email.trim());
      toast.success(res.message || "Login code resent");
      setOtp("");
      setResendCooldown(RESEND_COOLDOWN_SEC);
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-emerald-50/40 to-slate-100 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-background shadow-lg p-6 sm:p-8 space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <Logo />
          <div className="flex items-center gap-2 text-emerald-700">
            <Briefcase className="h-5 w-5" />
            <h1 className="text-xl font-semibold tracking-tight">Staff Portal</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Sign in with your staff email and password, or a one-time code.
          </p>
        </div>

        {forgotStep ? (
          <div className="space-y-4">
            {forgotStep === "request" && (
              <form onSubmit={submitForgotRequest} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="forgot-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="forgot-email"
                      type="email"
                      className="pl-9"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Sending…" : "Send reset code"}
                </Button>
                <Button type="button" variant="ghost" className="w-full" onClick={cancelForgot}>
                  Back to sign in
                </Button>
              </form>
            )}
            {forgotStep === "verify" && (
              <form onSubmit={submitForgotVerify} className="space-y-4">
                <div className="space-y-2">
                  <Label>Verification code</Label>
                  <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                    <InputOTPGroup>
                      {Array.from({ length: 6 }).map((_, i) => (
                        <InputOTPSlot key={i} index={i} />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Verifying…" : "Verify code"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={resendCooldown > 0 || loading}
                  onClick={resendForgotOtp}
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
                </Button>
                <Button type="button" variant="ghost" className="w-full" onClick={cancelForgot}>
                  Cancel
                </Button>
              </form>
            )}
            {forgotStep === "reset" && (
              <form onSubmit={submitForgotReset} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">New password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="new-password"
                      type={showPassword ? "text" : "password"}
                      className="pl-9 pr-10"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      onClick={() => setShowPassword((v) => !v)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirm-password"
                      type={showConfirm ? "text" : "password"}
                      className="pl-9 pr-10"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      onClick={() => setShowConfirm((v) => !v)}
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Saving…" : "Reset password"}
                </Button>
              </form>
            )}
          </div>
        ) : (
          <Tabs defaultValue="password" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="password">Password</TabsTrigger>
              <TabsTrigger value="otp">Email OTP</TabsTrigger>
            </TabsList>
            <TabsContent value="password" className="space-y-4 pt-4">
              <form onSubmit={passwordLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      className="pl-9"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      className="pl-9 pr-10"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      onClick={() => setShowPassword((v) => !v)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing in…" : "Sign in"}
                </Button>
              </form>
              <button
                type="button"
                className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline w-full text-center"
                onClick={() => setForgotStep("request")}
              >
                Forgot password?
              </button>
            </TabsContent>
            <TabsContent value="otp" className="space-y-4 pt-4">
              {otpStep === "request" ? (
                <form onSubmit={requestLoginOtp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="otp-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="otp-email"
                        type="email"
                        className="pl-9"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Sending…" : "Send login code"}
                  </Button>
                </form>
              ) : (
                <form onSubmit={verifyLoginOtp} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Login code</Label>
                    <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                      <InputOTPGroup>
                        {Array.from({ length: 6 }).map((_, i) => (
                          <InputOTPSlot key={i} index={i} />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    <KeyRound className="h-4 w-4 mr-2" />
                    {loading ? "Verifying…" : "Verify & sign in"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled={resendCooldown > 0 || loading}
                    onClick={resendLoginOtp}
                  >
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => {
                      setOtpStep("request");
                      setOtp("");
                    }}
                  >
                    Change email
                  </Button>
                </form>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
};

export default StaffLogin;
