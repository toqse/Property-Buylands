import type { Metadata } from "next";
import DeleteMyAccount from "@/views/DeleteMyAccount";

export const metadata: Metadata = {
  title: "Delete My Account | Buy Lands India",
  description:
    "Request permanent deletion of your Buy Lands India property owner account and associated personal data.",
};

export default function Page() {
  return <DeleteMyAccount />;
}
