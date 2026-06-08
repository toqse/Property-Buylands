import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "@/lib/router";
import { User, LogOut, LayoutDashboard, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "./Logo";
import { useAuth } from "@/context/AuthContext";
import { AuthDialog } from "./auth/AuthDialog";
import { LocationSearch } from "./LocationSearch";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type NavbarVariant = "solid" | "transparent";

const links = [
  { to: "/", label: "Home" },
  { to: "/buy", label: "Buy" },
  { to: "/rent", label: "Rent" },
  { to: "/sell", label: "Sell" },
  { to: "/contact", label: "Contact" },
];

export const Navbar = ({ variant = "solid" }: { variant?: NavbarVariant }) => {
  const [open, setOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (variant !== "transparent") return;
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [variant]);

  const isTransparent = variant === "transparent" && !scrolled;

  useEffect(() => {
    const onToggle = () => setOpen((v) => !v);
    window.addEventListener("ethereal:mobile-menu-toggle", onToggle as EventListener);
    return () => window.removeEventListener("ethereal:mobile-menu-toggle", onToggle as EventListener);
  }, []);

  return (
    <header
      className={cn(
        "z-40 w-full overflow-visible animate-none md:animate-fade-in-down transition-[background-color,box-shadow,border-color] duration-300",
        isTransparent
          ? "fixed inset-x-0 top-0 bg-transparent"
          : "sticky top-0 border-b border-border/60 bg-white shadow-sm",
      )}
    >
      <div className="container flex h-24 items-center justify-between gap-4 overflow-visible">
        <Link to="/" className="shrink-0 transition-opacity hover:opacity-90">
          <Logo
            src="/logo%20new-Photoroom.png"
            variant="dark"
            className="hidden sm:flex origin-left -my-1"
            imgClassName="h-10 md:h-12"
          />
          <Logo
            src="/logo%20new-Photoroom.png"
            variant="dark"
            className="flex sm:hidden origin-left -my-1 -ml-1"
            imgClassName="h-9"
          />
        </Link>

        <nav className="hidden md:flex shrink-0 items-center gap-7 lg:gap-9">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === "/"}
              className={({ isActive }) =>
                cn(
                  "story-link inline-block pb-1.5 text-sm font-semibold uppercase tracking-[0.18em] transition-colors",
                  isTransparent
                    ? (isActive ? "text-white" : "text-white/90 hover:text-white")
                    : (isActive ? "text-gold" : "text-foreground/80 hover:text-gold"),
                )
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        {/* Desktop — location search sits between the nav links and the
            Login / user button; justify-between spreads everything evenly */}
        <div className="hidden md:flex shrink-0 justify-center">
          <LocationSearch
            instanceId="navbar-location-search"
            className="w-[14vw] min-w-[200px]"
          />
        </div>

        {/* Mobile — location search replaces the old "Sell Property" CTA */}
        <div className="md:hidden min-w-0 flex-1 pl-3">
          <LocationSearch instanceId="navbar-location-search-mobile" />
        </div>

        <div className="hidden md:flex shrink-0 items-center gap-3">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="luxe" className="gap-2 font-semibold">
                  <User className="h-4 w-4" /> {user.name.split(" ")[0]}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate(user.role === "admin" ? "/admin" : "/dashboard")}>
                  <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { logout(); navigate("/"); }}>
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              variant="luxe"
              onClick={() => setAuthOpen(true)}
              className="px-8 min-w-[108px] ![background:linear-gradient(135deg,#0e305d_0%,#1c5fa8_55%,#3a8dd6_100%)] hover:![background:linear-gradient(135deg,#0a2547_0%,#174d8a_55%,#2f7cc2_100%)] text-white"
            >
              Login
            </Button>
          )}
        </div>

      </div>

      {/* Mobile drawer — slides in from the right */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="md:hidden flex w-[88vw] max-w-sm flex-col gap-0 bg-white p-0 pb-[72px]"
        >
          <SheetTitle className="sr-only">Navigation menu</SheetTitle>

          {/* Header — logo on the left, default close X sits at top-right */}
          <div className="flex min-h-16 items-center justify-between border-b border-border/60 px-4 pr-14">
            <Link to="/" onClick={() => setOpen(false)} className="block transition-opacity hover:opacity-90">
              <Logo
                src="/logo%20new-Photoroom.png"
                variant="dark"
                imgClassName="h-8 w-auto max-w-[150px]"
              />
            </Link>
          </div>

          {/* Nav links */}
          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === "/"}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "group/link flex items-center justify-between rounded-xl px-4 py-3.5 text-[15px] font-semibold transition-colors",
                    isActive
                      ? "bg-gold text-white shadow-sm"
                      : "text-foreground/85 hover:bg-muted",
                  )
                }
              >
                <span>{l.label}</span>
                <ChevronRight className="h-4 w-4 opacity-30 transition-opacity group-aria-[current=page]/link:opacity-90" />
              </NavLink>
            ))}
          </nav>

          {/* Footer CTA */}
          <div className="border-t border-border/60 bg-white px-5 pb-6 pt-4">
            {user ? (
              <div className="space-y-2">
                <div className="rounded-xl bg-muted px-4 py-3">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Signed in as</div>
                  <div className="mt-0.5 text-sm font-semibold text-foreground truncate">{user.name}</div>
                </div>
                <Button
                  variant="luxe"
                  className="w-full gap-2 font-semibold"
                  onClick={() => {
                    setOpen(false);
                    navigate(user.role === "admin" ? "/admin" : "/dashboard");
                  }}
                >
                  <LayoutDashboard className="h-4 w-4" /> Dashboard
                </Button>
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => { logout(); setOpen(false); }}
                >
                  <LogOut className="h-4 w-4" /> Sign out
                </Button>
              </div>
            ) : (
              <Button
                variant="luxe"
                className="w-full gap-2 font-semibold ![background:linear-gradient(135deg,#0e305d_0%,#1c5fa8_55%,#3a8dd6_100%)] hover:![background:linear-gradient(135deg,#0a2547_0%,#174d8a_55%,#2f7cc2_100%)] text-white"
                onClick={() => { setAuthOpen(true); setOpen(false); }}
              >
                <User className="h-4 w-4" /> Login
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Mobile bottom navigation is rendered in AppProviders */}

      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
    </header>
  );
};
