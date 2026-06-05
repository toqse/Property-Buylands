import { apiRequest, asList, toQueryString, type PaginatedResponse } from "@/lib/api/client";
import type { ApiContact } from "@/lib/api/types";

export const contactsApi = {
  submit(body: {
    name: string;
    email: string;
    phone_number?: string;
    subject?: string;
    message: string;
    budget_range?: string;
    property?: number;
  }) {
    return apiRequest<ApiContact>("properties/contacts/", { method: "POST", body });
  },

  list(params: Record<string, string | number> = {}) {
    return apiRequest<ApiContact[] | PaginatedResponse<ApiContact>>(
      `properties/contacts/${toQueryString(params)}`,
      { auth: true },
    ).then(asList);
  },

  delete(id: number | string) {
    return apiRequest<void>(`properties/contacts/${id}/`, {
      method: "DELETE",
      auth: true,
    });
  },
};
