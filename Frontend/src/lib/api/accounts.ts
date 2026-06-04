import { apiRequest } from "@/lib/api/client";
import type { ApiUser, AuthTokenResponse, OtpInitResponse } from "@/lib/api/types";

export const accountsApi = {
  login(email: string, password: string) {
    return apiRequest<AuthTokenResponse>("accounts/login/", {
      method: "POST",
      body: { email, password },
    });
  },

  logout(token?: string) {
    return apiRequest<{ message: string }>("accounts/logout/", {
      method: "POST",
      auth: true,
      token,
    });
  },

  getProfile() {
    return apiRequest<ApiUser>("accounts/profile/", { auth: true });
  },

  patchProfile(body: Record<string, unknown>) {
    return apiRequest<ApiUser | OtpInitResponse & { user?: ApiUser }>("accounts/profile/", {
      method: "PATCH",
      auth: true,
      body,
    });
  },

  requestEmailChange(new_email: string) {
    return apiRequest<OtpInitResponse>("accounts/profile/email-change/request/", {
      method: "POST",
      auth: true,
      body: { new_email },
    });
  },

  registerOwnerInit(body: {
    full_name: string;
    email: string;
    phone: string;
    whatsapp_number: string;
    password: string;
    password2: string;
  }) {
    return apiRequest<OtpInitResponse>("accounts/register/owner/init/", {
      method: "POST",
      body,
    });
  },

  registerOwnerVerify(email: string, otp: string) {
    return apiRequest<AuthTokenResponse & OtpInitResponse>("accounts/register/owner/verify/", {
      method: "POST",
      body: { email, otp },
    });
  },

  loginOtpRequest(email: string) {
    return apiRequest<OtpInitResponse>("accounts/login/otp/request/", {
      method: "POST",
      body: { email },
    });
  },

  loginOtpVerify(email: string, otp: string) {
    return apiRequest<AuthTokenResponse & OtpInitResponse>("accounts/login/otp/verify/", {
      method: "POST",
      body: { email, otp },
    });
  },

  forgotPassword(email: string) {
    return apiRequest<OtpInitResponse>("accounts/forgot-password/", {
      method: "POST",
      body: { email },
    });
  },

  verifyOtp(email: string, otp: string) {
    return apiRequest<OtpInitResponse>("accounts/verify-otp/", {
      method: "POST",
      body: { email, otp },
    });
  },

  resetPassword(body: { email: string; otp: string; password: string; password2: string }) {
    return apiRequest<OtpInitResponse>("accounts/reset-password/", {
      method: "POST",
      body,
    });
  },

  listOwners(params?: Record<string, string | number>) {
    const qs = params
      ? "?" + new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString()
      : "";
    return apiRequest<import("@/lib/api/client").PaginatedResponse<import("@/lib/api/types").ApiOwner>>(
      `accounts/owners/${qs}`,
      { auth: true },
    );
  },

  getOwner(id: number | string) {
    return apiRequest<import("@/lib/api/types").ApiOwner>(`accounts/owners/${id}/`, { auth: true });
  },

  patchOwner(id: number | string, body: Record<string, unknown>) {
    return apiRequest<import("@/lib/api/types").ApiOwner>(`accounts/owners/${id}/`, {
      method: "PATCH",
      auth: true,
      body,
    });
  },

  deleteOwner(id: number | string) {
    return apiRequest<void>(`accounts/owners/${id}/`, { method: "DELETE", auth: true });
  },
};
