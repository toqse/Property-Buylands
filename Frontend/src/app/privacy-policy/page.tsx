import type { Metadata } from "next";
import PrivacyPolicy from "@/views/PrivacyPolicy";

export const metadata: Metadata = {
  title: "Privacy Policy | Buy Lands India",
  description:
    "Read how Buy Lands India collects, uses, and protects your personal data on www.buylandsindia.com.",
};

export default function Page() {
  return <PrivacyPolicy />;
}
