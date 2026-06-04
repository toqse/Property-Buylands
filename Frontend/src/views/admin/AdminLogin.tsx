"use client";

import { useState } from "react";
import { useNavigate } from "@/lib/router";
import { useAuth } from "@/context/AuthContext";
import { accountsApi } from "@/lib/api/accounts";
import { getErrorMessage } from "@/lib/api/errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Logo } from "@/components/Logo";
import { Mail, Lock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

const AdminLogin = () => {
  const { loginFromApiResponse } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

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
          <h2 className="font-serif text-4xl mt-2">Sign in</h2>
          <p className="text-muted-foreground mt-2">Authenticate with your staff email and password.</p>

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
                      className="pl-10"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <Button type="submit" variant="luxe" size="lg" className="w-full" disabled={loading}>
                  {loading ? "Signing in…" : "Sign in"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
