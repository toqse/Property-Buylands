import type { Metadata } from "next";
import "@/index.css";
import { AppProviders } from "@/components/AppProviders";

export const metadata: Metadata = {
  title: "Buy Lands India",
  description:
    "Buy Lands India — premium residential and commercial properties across the country. Browse verified homes, villas, apartments and land for sale or rent.",
  icons: {
    icon: "/logo%20new-Photoroom.png",
    shortcut: "/logo%20new-Photoroom.png",
    apple: "/logo%20new-Photoroom.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="pb-16 md:pb-0">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
