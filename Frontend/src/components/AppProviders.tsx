"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { getErrorMessage } from "@/lib/api/errors";
import { toast } from "sonner";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import { UserLocationProvider } from "@/context/UserLocationContext";
import { MobileBottomNav } from "@/components/MobileBottomNav";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1 },
          mutations: {
            onError: (error) => toast.error(getErrorMessage(error)),
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <UserLocationProvider>
          <AuthProvider>
            {children}
            <MobileBottomNav />
          </AuthProvider>
        </UserLocationProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
