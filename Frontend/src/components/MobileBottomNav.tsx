"use client";

import { useState } from "react";
import { NavLink, useLocation } from "@/lib/router";
import { BadgeDollarSign, Building2, Home, KeyRound, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

declare global {
  interface WindowEventMap {
    "ethereal:mobile-menu-toggle": CustomEvent;
  }
}

export function MobileBottomNav() {
  const [visible, setVisible] = useState(true);
  const { pathname } = useLocation();

  // The admin panel has its own navigation; the public bottom bar should not
  // appear there (especially on mobile, where it overlaps admin controls).
  if (pathname.startsWith("/admin")) return null;

  if (!visible) return null;

  return (
    <nav className="md:hidden fixed inset-x-0 bottom-0 z-[60] border-t border-border/60 bg-white">
      <div className="mx-auto grid max-w-xl grid-cols-5 px-4 py-2">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            cn(
              "flex flex-col items-center justify-center gap-1 py-1 text-[11px] font-medium transition-colors",
              isActive ? "text-gold" : "text-foreground/70",
            )
          }
        >
          <Home className="h-5 w-5" />
          Home
        </NavLink>
        <NavLink
          to="/buy"
          className={({ isActive }) =>
            cn(
              "flex flex-col items-center justify-center gap-1 py-1 text-[11px] font-medium transition-colors",
              isActive ? "text-gold" : "text-foreground/70",
            )
          }
        >
          <Building2 className="h-5 w-5" />
          Buy
        </NavLink>
        <NavLink
          to="/rent"
          className={({ isActive }) =>
            cn(
              "flex flex-col items-center justify-center gap-1 py-1 text-[11px] font-medium transition-colors",
              isActive ? "text-gold" : "text-foreground/70",
            )
          }
        >
          <KeyRound className="h-5 w-5" />
          Rent
        </NavLink>
        <NavLink
          to="/sell"
          className={({ isActive }) =>
            cn(
              "flex flex-col items-center justify-center gap-1 py-1 text-[11px] font-medium transition-colors",
              isActive ? "text-gold" : "text-foreground/70",
            )
          }
        >
          <BadgeDollarSign className="h-5 w-5" />
          Sell
        </NavLink>
        <button
          type="button"
          className="flex flex-col items-center justify-center gap-1 py-1 text-[11px] font-medium text-foreground/70 transition-colors"
          onClick={() => window.dispatchEvent(new CustomEvent("ethereal:mobile-menu-toggle"))}
          aria-label="Menu"
        >
          <Menu className="h-5 w-5" />
          Menu
        </button>
      </div>
    </nav>
  );
}

