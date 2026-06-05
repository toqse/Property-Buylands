import type { ApiContact } from "@/lib/api/types";
import type { Enquiry } from "@/data/mockData";

export function mapApiContactToEnquiry(c: ApiContact): Enquiry {
  return {
    id: String(c.id),
    fromName: c.name,
    fromEmail: c.email,
    fromPhone: c.phone_number || c.phone || "",
    message: c.message || "",
    propertyId: c.property != null ? String(c.property) : "",
    propertyTitle: c.property_title || c.subject || "General enquiry",
    createdAt: c.created_at?.slice(0, 10) || "",
    status: "New",
  };
}
