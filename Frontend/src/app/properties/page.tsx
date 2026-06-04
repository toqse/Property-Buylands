import { Suspense } from "react";
import Properties from "@/views/Properties";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Properties />
    </Suspense>
  );
}
