import AdminPanel from "@/views/admin/AdminPanel";

const ADMIN_SUB_ROUTES: { section: string; sub: string }[] = [
  { section: "locations", sub: "states" },
  { section: "locations", sub: "districts" },
  { section: "locations", sub: "cities" },
];

export function generateStaticParams() {
  return ADMIN_SUB_ROUTES;
}

export default function Page() {
  return <AdminPanel />;
}
