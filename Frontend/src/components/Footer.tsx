import { Link } from "@/lib/router";
import { Logo } from "./Logo";
import { ArrowUp, Facebook, Instagram, Linkedin, Mail, MapPin, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { revealFadeUpClass } from "@/lib/revealFade";
import { useInViewOnce } from "@/hooks/useInViewOnce";
import { useCompanyContact, usePropertyTypes } from "@/hooks/api/useCatalog";

export function Footer() {
  const { ref, active } = useInViewOnce<HTMLElement>();
  const { data: company } = useCompanyContact();
  const { data: propertyTypesData } = usePropertyTypes();
  const categories = (propertyTypesData?.results ?? []).map((t) => t.name);

  const address = (company?.address || company?.company_address || "").trim();
  const phone = (company?.phone || company?.admin_phone || "").trim();
  const email = (company?.email || company?.company_email || "").trim();
  const phoneHref = phone ? `tel:${phone.replace(/[^\d+]/g, "")}` : "";
  const year = new Date().getFullYear();

  const scrollToTop = () => {
    if (typeof window === "undefined") return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  };

  return (
    <footer ref={ref} className={cn("relative bg-black text-background mt-3 md:mt-6", revealFadeUpClass(active))}>
      {/* Back-to-top arrow */}
      <button
        type="button"
        onClick={scrollToTop}
        aria-label="Back to top"
        className="absolute right-4 top-44 grid h-11 w-11 place-items-center rounded-full text-white shadow-[0_14px_32px_-16px_rgba(14,48,93,0.8)] ring-2 ring-white/15 transition-transform hover:-translate-y-0.5 md:right-8 md:top-56 md:h-12 md:w-12"
        style={{
          background:
            "linear-gradient(135deg,#0e305d 0%,#1c5fa8 55%,#3a8dd6 100%)",
        }}
      >
        <ArrowUp className="h-5 w-5 md:h-[22px] md:w-[22px]" strokeWidth={2.2} />
      </button>

      <div className="container py-8 md:py-16 grid grid-cols-2 gap-8 md:gap-12 md:grid-cols-4">
        <div className="col-span-2 md:col-span-1">
          <Logo variant="light" className="origin-left" imgClassName="h-12 md:h-14 brightness-0 invert" />
          <p className="mt-6 text-sm text-background/70 leading-relaxed">
          Your gateway to verified properties, smart investments, and elevated living opportunities.
          </p>
          <div className="mt-6 flex gap-3">
            {[Facebook, Instagram, Linkedin].map((I, i) => (
              <a
                key={i}
                href="#"
                className="h-9 w-9 grid place-items-center rounded-full border border-background/20 hover:bg-gold hover:border-gold hover:text-foreground transition-all"
              >
                <I className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-white uppercase text-xs tracking-[0.25em] mb-5 font-sans font-semibold">Explore</h4>
          <ul className="flex flex-col gap-3 text-sm text-background/80">
            {[["/", "Home"], ["/buy", "Buy"], ["/rent", "Rent"], ["/sell", "Sell"], ["/contact", "Contact"]].map(([to, l]) => (
              <li key={to}><Link to={to} className="hover:text-gold transition-colors">{l}</Link></li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-white uppercase text-xs tracking-[0.25em] mb-5 font-sans font-semibold">Categories</h4>
          <ul className="flex flex-col gap-3 text-sm text-background/80">
            {categories.length === 0 ? (
              <li className="text-background/50">Coming soon.</li>
            ) : (
              categories.map((c) => (
                <li key={c}>
                  <Link
                    to={`/properties?category=${encodeURIComponent(c)}`}
                    className="hover:text-gold transition-colors"
                  >
                    {c}
                  </Link>
                </li>
              ))
            )}
          </ul>
        </div>

        <div>
          <h4 className="text-white uppercase text-xs tracking-[0.25em] mb-5 font-sans font-semibold">Get in touch</h4>
          <ul className="space-y-3 text-sm text-background/80">
            {address && (
              <li className="flex gap-2">
                <MapPin className="h-4 w-4 text-white mt-0.5 shrink-0" />
                <span className="leading-relaxed whitespace-pre-line">{address}</span>
              </li>
            )}
            {phone && (
              <li className="flex gap-2">
                <Phone className="h-4 w-4 text-white mt-0.5 shrink-0" />
                <a href={phoneHref} className="hover:text-gold transition-colors">
                  {phone}
                </a>
              </li>
            )}
            {email && (
              <li className="flex gap-2">
                <Mail className="h-4 w-4 text-white mt-0.5 shrink-0" />
                <a href={`mailto:${email}`} className="hover:text-gold transition-colors">
                  {email}
                </a>
              </li>
            )}
            {!address && !phone && !email && (
              <li className="text-background/50">Contact details coming soon.</li>
            )}
          </ul>
        </div>
      </div>
      <div className="border-t border-background/10">
        <div className="container py-3 md:py-6 flex flex-col md:flex-row gap-2 justify-between text-xs text-background/60">
          <span>© {year} Buy Lands India. All rights reserved.</span>
          <span className="flex items-center gap-3">
            <Link to="/privacy-policy" className="hover:text-gold transition-colors">Privacy Policy</Link>
            <span>|</span>
            <Link to="/terms-conditions" className="hover:text-gold transition-colors">Terms &amp; Conditions</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
