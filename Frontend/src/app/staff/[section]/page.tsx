import StaffPortal from "@/views/staff/StaffPortal";

const STAFF_SECTIONS = ["properties", "advertisements"] as const;

export function generateStaticParams() {
  return STAFF_SECTIONS.map((section) => ({ section }));
}

export default function Page() {
  return <StaffPortal />;
}
