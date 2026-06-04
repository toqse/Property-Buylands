import PropertyDetail from "@/views/PropertyDetail";
import { PROPERTIES } from "@/data/mockData";

export function generateStaticParams() {
  return PROPERTIES.map((p) => ({ id: p.id }));
}

export default function Page() {
  return <PropertyDetail />;
}
