import type { ApiTestimonial } from "@/lib/api/types";

export type UiTestimonial = {
  id: number;
  name: string;
  role: string;
  content: string;
  rating: number;
  avatar: string | null;
  published: boolean;
  order: number;
};

export function mapApiTestimonialToUi(t: ApiTestimonial): UiTestimonial {
  return {
    id: t.id,
    name: t.client_name,
    role: t.client_role ?? "",
    content: t.testimonial_text,
    rating: t.rating ?? 5,
    avatar: t.avatar ?? null,
    published: t.is_published ?? true,
    order: t.display_order ?? 0,
  };
}

export function buildTestimonialFormData(
  data: {
    name: string;
    role: string;
    quote: string;
    rating: number;
    published: boolean;
    order: number;
    avatarFile?: File | null;
  },
): FormData {
  const fd = new FormData();
  fd.append("client_name", data.name.trim());
  fd.append("client_role", data.role.trim());
  fd.append("testimonial_text", data.quote.trim());
  fd.append("rating", String(data.rating));
  fd.append("is_published", data.published ? "true" : "false");
  fd.append("display_order", String(data.order));
  if (data.avatarFile) fd.append("avatar", data.avatarFile);
  return fd;
}
