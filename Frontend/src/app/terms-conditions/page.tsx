import type { Metadata } from "next";
import TermsConditions from "@/views/TermsConditions";

export const metadata: Metadata = {
  title: "Terms & Conditions | Buy Lands India",
  description:
    "Terms of Service governing your use of the Buy Lands India property marketplace platform.",
};

export default function Page() {
  return <TermsConditions />;
}
