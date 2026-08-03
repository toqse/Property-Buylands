import type { ApiUser } from "@/lib/api/types";
import type { SessionUser } from "@/context/AuthContext";

export function mapApiUserToSession(user: ApiUser): SessionUser {
  const name =
    [user.first_name, user.last_name].filter(Boolean).join(" ").trim() ||
    user.username ||
    user.email.split("@")[0];

  let role: SessionUser["role"] = "user";
  if (user.is_superuser) role = "admin";
  else if (user.is_staff) role = "staff";

  return {
    id: String(user.id),
    name,
    email: user.email,
    phone: user.phone || "",
    whatsapp: user.whatsapp_number || undefined,
    address: user.address || undefined,
    role,
    roleLabel: user.role_label || undefined,
    permissions: {
      can_manage_properties: user.permissions?.can_manage_properties ?? role !== "user",
      can_manage_advertisements: user.permissions?.can_manage_advertisements ?? role !== "user",
    },
  };
}

export function homePathForRole(role: SessionUser["role"]): string {
  if (role === "admin") return "/admin";
  if (role === "staff") return "/staff";
  return "/dashboard";
}
