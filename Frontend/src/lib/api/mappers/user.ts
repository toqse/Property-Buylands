import type { ApiUser } from "@/lib/api/types";
import type { SessionUser } from "@/context/AuthContext";

export function mapApiUserToSession(user: ApiUser): SessionUser {
  const name =
    [user.first_name, user.last_name].filter(Boolean).join(" ").trim() ||
    user.username ||
    user.email.split("@")[0];
  return {
    id: String(user.id),
    name,
    email: user.email,
    phone: user.phone || "",
    whatsapp: user.whatsapp_number || undefined,
    address: user.address || undefined,
    role: user.is_staff ? "admin" : "user",
  };
}
