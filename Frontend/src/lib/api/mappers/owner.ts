import type { ApiOwner } from "@/lib/api/types";
import type { AppUser } from "@/data/mockData";

export function mapApiOwnerToAppUser(o: ApiOwner): AppUser {
  const name =
    [o.first_name, o.last_name].filter(Boolean).join(" ").trim() || o.email.split("@")[0];
  return {
    id: String(o.id),
    name,
    email: o.email,
    phone: o.phone || "",
    joinedAt: o.date_joined?.slice(0, 10) || "",
    active: o.is_active ?? true,
    propertyCount: o.properties_count ?? 0,
  };
}
