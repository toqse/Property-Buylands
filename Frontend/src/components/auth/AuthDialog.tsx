import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useAuth } from "@/context/AuthContext";
import { accountsApi } from "@/lib/api/accounts";
import { getErrorMessage } from "@/lib/api/errors";
import { display_console_logs } from "@/lib/config";
import { toast } from "sonner";
import { Mail, KeyRound, User, Lock, Eye, EyeOff } from "lucide-react";
import { Logo } from "../Logo";
import { useNavigate } from "@/lib/router";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /**
   * Optional initial mode. Defaults to `login-password` so clicking the
   * "Login" button opens the password sign-in screen first.
   */
  initialMode?: AuthMode;
}

type AuthMode =
  | "login-password"
  | "login-otp"
  | "login-verify"
  | "register"
  | "register-verify"
  | "forgot-request"
  | "forgot-verify"
  | "forgot-reset";

const RESEND_COOLDOWN_SEC = 60;

const EMAIL_MAX = 48;
const NAME_MAX = 48;
const PHONE_MAX = 12;
const PASSWORD_MAX = 64;

const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const normalizeEmail = (v: string) => v.trim().slice(0, EMAIL_MAX);
const normalizeName = (v: string) =>
  v.replace(/[^a-zA-Z\s.'-]/g, "").replace(/\s{2,}/g, " ").slice(0, NAME_MAX);
const normalizeDigits = (v: string, max = PHONE_MAX) =>
  v.replace(/\D/g, "").slice(0, max);
const withCountryCode = (digits: string) => (digits ? `+91${digits}` : "");

export const AuthDialog = ({ open, onOpenChange, initialMode = "login-password" }: Props) => {
  const { loginFromApiResponse } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [otp, setOtp] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const phoneWarnAtRef = useRef(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setName("");
    setPhone("");
    setWhatsapp("");
    setAgreed(false);
    setOtp("");
  };

  const handleClose = (v: boolean) => {
    onOpenChange(v);
    if (!v) {
      resetForm();
      setMode(initialMode);
    }
  };

  // ----- Login (password) -----
  const submitPasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidEmail(email)) {
      toast.error("Please enter a valid email");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      const res = await accountsApi.login(normalizeEmail(email), password);
      if (res.user.is_staff) {
        toast.error("Use the admin login page for staff accounts");
        return;
      }
      loginFromApiResponse(res);
      toast.success("Welcome back!");
      handleClose(false);
      navigate("/dashboard");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidEmail(email)) {
      toast.error("Please enter a valid email");
      return;
    }
    setLoading(true);
    try {
      const res = await accountsApi.loginOtpRequest(normalizeEmail(email));
      if (display_console_logs && res.otp) {
        toast.message(`Dev OTP: ${res.otp}`);
      }
      toast.success(res.message || `Verification code sent to ${email}`);
      setOtp(res.otp ?? "");
      setMode("login-verify");
      setResendCooldown(RESEND_COOLDOWN_SEC);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const submitRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) {
      toast.error("Please enter your full name");
      return;
    }
    if (!isValidEmail(email)) {
      toast.error("Please enter a valid email");
      return;
    }
    const hasPhone = phone.length >= 10;
    const hasWhatsapp = whatsapp.length >= 10;
    if (!hasPhone && !hasWhatsapp) {
      toast.error("Enter at least one contact number (phone or WhatsApp)");
      return;
    }
    if (phone.length > 0 && (phone.length < 10 || phone.length > 12)) {
      toast.error("Phone must be 10–12 digits");
      return;
    }
    if (whatsapp.length > 0 && (whatsapp.length < 10 || whatsapp.length > 12)) {
      toast.error("WhatsApp must be 10–12 digits");
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
    if (!agreed) {
      toast.error("Please accept the Terms & Conditions");
      return;
    }
    setLoading(true);
    try {
      const res = await accountsApi.registerOwnerInit({
        full_name: name.trim(),
        email: normalizeEmail(email),
        phone: withCountryCode(phone),
        whatsapp_number: withCountryCode(whatsapp),
        password,
        password2: confirmPassword,
      });
      if (display_console_logs && res.otp) {
        toast.message(`Dev OTP: ${res.otp}`);
      }
      toast.success(res.message || `Verification code sent to ${email}`);
      setOtp(res.otp ?? "");
      setMode("register-verify");
      setResendCooldown(RESEND_COOLDOWN_SEC);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      toast.error("Enter the 6-digit code");
      return;
    }
    setLoading(true);
    try {
      const normalized = normalizeEmail(email);
      if (mode === "forgot-verify") {
        const res = await accountsApi.verifyOtp(normalized, otp);
        if (!res.success) {
          toast.error(res.message || "Invalid or expired code");
          return;
        }
        toast.success("Code verified — set your new password");
        setMode("forgot-reset");
        return;
      }
      const res =
        mode === "register-verify"
          ? await accountsApi.registerOwnerVerify(normalized, otp)
          : await accountsApi.loginOtpVerify(normalized, otp);
      if (!res.token || !res.user) {
        toast.error("Invalid verification response");
        return;
      }
      loginFromApiResponse({ token: res.token, user: res.user });
      toast.success(mode === "register-verify" ? "Account created — welcome!" : "Welcome back!");
      handleClose(false);
      navigate("/dashboard");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    if (resendCooldown > 0 || loading) return;
    setLoading(true);
    try {
      const normalized = normalizeEmail(email);
      if (mode === "register-verify") {
        const res = await accountsApi.registerOwnerInit({
          full_name: name.trim(),
          email: normalized,
          phone: withCountryCode(phone),
          whatsapp_number: withCountryCode(whatsapp),
          password,
          password2: confirmPassword,
        });
        if (display_console_logs && res.otp) toast.message(`Dev OTP: ${res.otp}`);
        toast.success(res.message || "Verification code resent");
        setOtp(res.otp ?? "");
      } else if (mode === "login-verify") {
        const res = await accountsApi.loginOtpRequest(normalized);
        if (display_console_logs && res.otp) toast.message(`Dev OTP: ${res.otp}`);
        toast.success(res.message || "Verification code resent");
        setOtp(res.otp ?? "");
      } else if (mode === "forgot-verify") {
        const res = await accountsApi.forgotPassword(normalized);
        if (display_console_logs && res.otp) toast.message(`Dev OTP: ${res.otp}`);
        toast.success(res.message || "Reset code resent");
        setOtp(res.otp ?? "");
      }
      setResendCooldown(RESEND_COOLDOWN_SEC);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const submitForgotRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidEmail(email)) {
      toast.error("Please enter a valid email");
      return;
    }
    setLoading(true);
    try {
      const res = await accountsApi.forgotPassword(normalizeEmail(email));
      if (display_console_logs && res.otp) toast.message(`Dev OTP: ${res.otp}`);
      toast.success(res.message || `Reset code sent to ${email}`);
      setOtp(res.otp ?? "");
      setMode("forgot-verify");
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
        email: normalizeEmail(email),
        otp,
        new_password: password,
        confirm_password: confirmPassword,
      });
      toast.success("Password reset — you can sign in now");
      setPassword("");
      setConfirmPassword("");
      setOtp("");
      setMode("login-password");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const isCompactMode =
    mode.startsWith("login") || mode.startsWith("forgot");
  const isLoginMode = mode.startsWith("login");
  const headerTitle =
    mode === "forgot-request"
      ? "Reset password"
      : mode === "forgot-verify"
        ? "Verify reset code"
        : mode === "forgot-reset"
          ? "Set new password"
          : isLoginMode
            ? "Owner sign in"
            : "Property owner registration";
  const headerSubtitle =
    mode === "forgot-request"
      ? "We'll email a one-time code to reset your owner account password."
      : mode === "forgot-verify"
        ? "Enter the code we sent to your email."
        : mode === "forgot-reset"
          ? "Choose a strong new password for your account."
          : isLoginMode
            ? "Sign in to manage your listings and property enquiries."
            : "Create your owner account, then list from your dashboard.";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        onInteractOutside={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        className={cn(
          "flex max-h-[calc(100dvh-1rem)] flex-col overflow-hidden p-0 sm:max-h-[calc(100dvh-2rem)] border-gold/20 [&_.dialog-close]:text-background [&_.dialog-close]:opacity-90 [&_.dialog-close]:bg-black/30 [&_.dialog-close]:h-9 [&_.dialog-close]:w-9 [&_.dialog-close]:rounded-full [&_.dialog-close]:grid [&_.dialog-close]:place-items-center [&_.dialog-close]:top-3 [&_.dialog-close]:right-3",
          isCompactMode ? "sm:max-w-md" : "sm:max-w-2xl",
        )}
      >
        {/* Dark header — same for login & register screens */}
        <div
          className={cn(
            "shrink-0 bg-[hsl(30_14%_10%)] text-background",
            isCompactMode ? "p-6" : "px-6 py-4 sm:px-8",
          )}
        >
          <Logo variant="light" imgClassName={isCompactMode ? undefined : "h-10 md:h-10"} />
          <DialogHeader className={isCompactMode ? "mt-5" : "mt-3"}>
            <DialogTitle
              className={cn(
                "font-serif text-background",
                isCompactMode ? "text-3xl" : "text-2xl",
              )}
            >
              {headerTitle}
            </DialogTitle>
            <DialogDescription
              className={cn("text-background/70", isCompactMode ? undefined : "text-sm")}
            >
              {headerSubtitle}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div
          className={cn(
            "min-h-0 flex-1 overflow-y-auto overscroll-contain",
            isCompactMode ? "p-6" : "px-6 py-5 sm:px-8",
          )}
        >
          {/* ---------- Login: password ---------- */}
          {mode === "login-password" && (
            <form onSubmit={submitPasswordLogin} className="space-y-4 animate-fade-in">
              <div className="space-y-2">
                <Label>Email</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-10"
                    type="email"
                    value={email}
                    maxLength={EMAIL_MAX}
                    onChange={(e) => setEmail(normalizeEmail(e.target.value))}
                    placeholder="you@example.com"
                    autoFocus
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Password</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-10 pr-10"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    maxLength={PASSWORD_MAX}
                    onChange={(e) => setPassword(e.target.value.slice(0, PASSWORD_MAX))}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" variant="luxe" size="lg" className="w-full">
                Sign in
              </Button>

              <div className="flex flex-col items-center gap-2 text-sm">
                <button
                  type="button"
                  onClick={() => { setMode("forgot-request"); setPassword(""); setOtp(""); }}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Forgot password?
                </button>
                <button
                  type="button"
                  onClick={() => { setMode("login-otp"); setPassword(""); }}
                  className="font-medium text-gold hover:text-gold/80 transition-colors"
                >
                  Sign in with email code
                </button>
              </div>

              <div className="border-t border-border pt-4 text-center text-sm text-muted-foreground">
                New property owner?{" "}
                <button
                  type="button"
                  onClick={() => { setMode("register"); resetForm(); }}
                  className="font-semibold text-gold hover:text-gold/80 transition-colors"
                >
                  Register
                </button>
              </div>
            </form>
          )}

          {/* ---------- Login: email code (request) ---------- */}
          {mode === "login-otp" && (
            <form onSubmit={sendOtp} className="space-y-4 animate-fade-in">
              <p className="text-sm text-muted-foreground">
                We&apos;ll email a one-time code to sign in (property owner accounts).
              </p>

              <div className="space-y-2">
                <Label>Email</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-10"
                    type="email"
                    value={email}
                    maxLength={EMAIL_MAX}
                    onChange={(e) => setEmail(normalizeEmail(e.target.value))}
                    placeholder="you@example.com"
                    autoFocus
                  />
                </div>
              </div>

              <Button type="submit" variant="luxe" size="lg" className="w-full">
                Send code
              </Button>

              <button
                type="button"
                onClick={() => setMode("login-password")}
                className="block w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Back to password sign in
              </button>

              <div className="border-t border-border pt-4 text-center text-sm text-muted-foreground">
                New property owner?{" "}
                <button
                  type="button"
                  onClick={() => { setMode("register"); resetForm(); }}
                  className="font-semibold text-gold hover:text-gold/80 transition-colors"
                >
                  Register
                </button>
              </div>
            </form>
          )}

          {/* ---------- OTP verify (login, register, forgot) ---------- */}
          {(mode === "login-verify" || mode === "register-verify" || mode === "forgot-verify") && (
            <form onSubmit={verifyOtp} className="space-y-5 animate-scale-in">
              <div className="text-center">
                <KeyRound className="mx-auto h-10 w-10 text-gold animate-float" />
                <p className="mt-3 text-sm text-muted-foreground">
                  Enter the 6-digit code sent to <b>{email}</b>
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
                {mode === "register-verify"
                  ? "Activate account"
                  : mode === "forgot-verify"
                    ? "Verify code"
                    : "Verify & continue"}
              </Button>
              <button
                type="button"
                onClick={resendOtp}
                disabled={resendCooldown > 0 || loading}
                className="block w-full text-center text-sm text-gold hover:text-gold/80 disabled:text-muted-foreground disabled:cursor-not-allowed"
              >
                {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend code"}
              </button>
              <button
                type="button"
                onClick={() =>
                  setMode(
                    mode === "register-verify"
                      ? "register"
                      : mode === "forgot-verify"
                        ? "forgot-request"
                        : "login-otp",
                  )
                }
                className="block w-full text-center text-xs text-muted-foreground hover:text-gold"
              >
                ← Use a different email
              </button>
            </form>
          )}

          {/* ---------- Forgot: request code ---------- */}
          {mode === "forgot-request" && (
            <form onSubmit={submitForgotRequest} className="space-y-4 animate-fade-in">
              <div className="space-y-2">
                <Label>Email</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-10"
                    type="email"
                    value={email}
                    maxLength={EMAIL_MAX}
                    onChange={(e) => setEmail(normalizeEmail(e.target.value))}
                    placeholder="you@example.com"
                    autoFocus
                  />
                </div>
              </div>
              <Button type="submit" variant="luxe" size="lg" className="w-full" disabled={loading}>
                Send reset code
              </Button>
              <button
                type="button"
                onClick={() => setMode("login-password")}
                className="block w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Back to sign in
              </button>
            </form>
          )}

          {/* ---------- Forgot: set new password ---------- */}
          {mode === "forgot-reset" && (
            <form onSubmit={submitForgotReset} className="space-y-4 animate-fade-in">
              <div className="space-y-2">
                <Label>New password</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-10 pr-10"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    maxLength={PASSWORD_MAX}
                    onChange={(e) => setPassword(e.target.value.slice(0, PASSWORD_MAX))}
                    placeholder="••••••••"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Confirm new password</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-10 pr-10"
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    maxLength={PASSWORD_MAX}
                    onChange={(e) => setConfirmPassword(e.target.value.slice(0, PASSWORD_MAX))}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    tabIndex={-1}
                    aria-label={showConfirm ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
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
                onClick={() => setMode("forgot-verify")}
                className="block w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Back to code entry
              </button>
            </form>
          )}

          {/* ---------- Register ---------- */}
          {mode === "register" && (
            <form onSubmit={submitRegister} className="space-y-3 animate-fade-in">
              <div className="space-y-2">
                <Label>Full name</Label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-10"
                    value={name}
                    maxLength={NAME_MAX}
                    onChange={(e) => setName(normalizeName(e.target.value))}
                    placeholder="Your name"
                    autoFocus
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Email</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-10"
                    type="email"
                    value={email}
                    maxLength={EMAIL_MAX}
                    onChange={(e) => setEmail(normalizeEmail(e.target.value))}
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Phone (phone or WhatsApp required)</Label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                      +91
                    </span>
                    <Input
                      className="pl-12"
                      value={phone}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={PHONE_MAX}
                      onChange={(e) => {
                        const digits = normalizeDigits(e.target.value);
                        if (e.target.value.replace(/\D/g, "").length > PHONE_MAX) {
                          const now = Date.now();
                          if (now - phoneWarnAtRef.current > 1500) {
                            phoneWarnAtRef.current = now;
                            toast.error("Phone number can be maximum 12 digits");
                          }
                        }
                        setPhone(digits);
                      }}
                      placeholder="98765 43210"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>WhatsApp (optional if phone provided)</Label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                      +91
                    </span>
                    <Input
                      className="pl-12"
                      value={whatsapp}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={PHONE_MAX}
                      onChange={(e) => setWhatsapp(normalizeDigits(e.target.value))}
                      placeholder="98765 43210"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Password</Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      className="pl-10 pr-10"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      maxLength={PASSWORD_MAX}
                      onChange={(e) => setPassword(e.target.value.slice(0, PASSWORD_MAX))}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      tabIndex={-1}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Confirm password</Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      className="pl-10 pr-10"
                      type={showConfirm ? "text" : "password"}
                      value={confirmPassword}
                      maxLength={PASSWORD_MAX}
                      onChange={(e) => setConfirmPassword(e.target.value.slice(0, PASSWORD_MAX))}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      tabIndex={-1}
                      aria-label={showConfirm ? "Hide password" : "Show password"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <label
                htmlFor="auth-agree"
                className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground"
              >
                <Checkbox
                  id="auth-agree"
                  checked={agreed}
                  onCheckedChange={(v) => setAgreed(v === true)}
                  className="mt-0.5"
                />
                <span>
                  I have read and agree to the{" "}
                  <a
                    href="/terms-conditions"
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-gold hover:underline"
                  >
                    Terms &amp; Conditions
                  </a>
                  , including the brokerage and commission terms of Buylands India Properties LLP (Buylands&nbsp;India).
                </span>
              </label>

              <Button
                type="submit"
                variant="luxe"
                size="lg"
                className="w-full"
                disabled={!agreed}
              >
                Continue — verify email
              </Button>

              <div className="border-t border-border pt-4 text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => { setMode("login-password"); resetForm(); }}
                  className="font-semibold text-gold hover:text-gold/80 transition-colors"
                >
                  Sign in
                </button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
