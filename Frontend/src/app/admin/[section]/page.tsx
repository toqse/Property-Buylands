import AdminPanel from "@/views/admin/AdminPanel";

const ADMIN_SECTIONS = [
  "properties",
  "approvals",
  "users",
  "categories",
  "banners",
  "testimonials",
  "locations",
  "enquiry",
  "advertisements",
  "settings",
] as const;

export function generateStaticParams() {
  return ADMIN_SECTIONS.map((section) => ({ section }));
}

export default function Page() {
  return <AdminPanel />;
}
