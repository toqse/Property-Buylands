"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/context/AuthContext";
import { accountsApi } from "@/lib/api/accounts";
import { getErrorMessage } from "@/lib/api/errors";
import { mapApiUserToSession } from "@/lib/api/mappers/user";
import type { ApiUser } from "@/lib/api/types";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer";

type AccountProfileSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AccountProfileSheet({ open, onOpenChange }: AccountProfileSheetProps) {
  const { user, loginWithToken, getToken } = useAuth();
  const isMobile = useIsMobile();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [passwordOpen, setPasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    setFullName(user.name || "");
    setPhone(user.phone || "");
  }, [open, user]);

  const resetPasswordForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  const syncSession = (updated: ApiUser | (Record<string, unknown> & { id?: number | string })) => {
    if (!("id" in updated) || updated.id == null) return;
    const token = getToken();
    if (!token) return;
    loginWithToken(token, mapApiUserToSession(updated as ApiUser));
  };

  const submitProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingProfile(true);
    try {
      const updated = await accountsApi.patchProfile({
        full_name: fullName.trim() || user.name,
        phone: phone.trim(),
      });
      if ("id" in updated) syncSession(updated as ApiUser);
      toast.success("Profile updated");
      onOpenChange(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSavingProfile(false);
    }
  };

  const submitPasswordChange = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentPassword.trim()) {
      toast.error("Enter your current password");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    setChangingPassword(true);
    try {
      const updated = await accountsApi.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
        new_password2: confirmPassword,
      });
      syncSession(updated);
      toast.success("Password updated successfully");
      setPasswordOpen(false);
      resetPasswordForm();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setChangingPassword(false);
    }
  };

  const profileForm = (
    <form onSubmit={(e) => void submitProfile(e)} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="portal-profile-name">Full name</Label>
        <Input
          id="portal-profile-name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          disabled={savingProfile}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="portal-profile-email">Email</Label>
        <Input id="portal-profile-email" value={user?.email ?? ""} disabled />
      </div>
      <div className="space-y-2">
        <Label htmlFor="portal-profile-phone">Phone</Label>
        <Input
          id="portal-profile-phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+91 ..."
          disabled={savingProfile}
        />
      </div>
      <div className="rounded-lg border border-dashed border-border px-4 py-3">
        <button
          type="button"
          onClick={() => setPasswordOpen(true)}
          className="text-sm font-medium text-[#1c5fa8] hover:underline"
        >
          Change Password
        </button>
      </div>
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={savingProfile}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={savingProfile}>
          {savingProfile ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );

  const passwordFields = (
    <form onSubmit={(e) => void submitPasswordChange(e)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="portal-current-password">Current password</Label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="portal-current-password"
            className="pl-10 pr-10"
            type={showCurrentPassword ? "text" : "password"}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
            autoFocus
          />
          <button
            type="button"
            onClick={() => setShowCurrentPassword((v) => !v)}
            tabIndex={-1}
            aria-label={showCurrentPassword ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="portal-new-password">New password</Label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="portal-new-password"
            className="pl-10 pr-10"
            type={showNewPassword ? "text" : "password"}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowNewPassword((v) => !v)}
            tabIndex={-1}
            aria-label={showNewPassword ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="portal-confirm-password">Confirm new password</Label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="portal-confirm-password"
            className="pl-10 pr-10"
            type={showConfirmPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword((v) => !v)}
            tabIndex={-1}
            aria-label={showConfirmPassword ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <DialogFooter className="gap-2 sm:gap-0 px-0">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setPasswordOpen(false);
            resetPasswordForm();
          }}
          disabled={changingPassword}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={changingPassword}>
          {changingPassword ? "Changing…" : "Change Password"}
        </Button>
      </DialogFooter>
    </form>
  );

  return (
    <>
      {isMobile ? (
        <Drawer
          open={open}
          onOpenChange={(v) => {
            onOpenChange(v);
            if (!v) {
              setPasswordOpen(false);
              resetPasswordForm();
            }
          }}
        >
          <DrawerContent className="max-h-[90dvh] rounded-t-3xl flex flex-col gap-0 overflow-hidden p-0">
            <div className="px-6 pt-4 pb-2 shrink-0">
              <DrawerTitle className="font-serif text-2xl">Profile</DrawerTitle>
              <DrawerDescription className="text-sm text-muted-foreground mt-1">
                Update your account details.
              </DrawerDescription>
            </div>
            <div className="overflow-y-auto px-6 pb-6 flex-1 min-h-0">{profileForm}</div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog
          open={open}
          onOpenChange={(v) => {
            onOpenChange(v);
            if (!v) {
              setPasswordOpen(false);
              resetPasswordForm();
            }
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="font-serif text-2xl">Profile</DialogTitle>
              <DialogDescription>Update your account details.</DialogDescription>
            </DialogHeader>
            {profileForm}
          </DialogContent>
        </Dialog>
      )}

      <Dialog
        open={passwordOpen}
        onOpenChange={(v) => {
          setPasswordOpen(v);
          if (!v) resetPasswordForm();
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Change Password</DialogTitle>
            <DialogDescription>
              Enter your current password, then choose a strong new password.
            </DialogDescription>
          </DialogHeader>
          {passwordFields}
        </DialogContent>
      </Dialog>
    </>
  );
}
