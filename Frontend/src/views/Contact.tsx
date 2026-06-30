"use client";

import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { LucideIcon } from "lucide-react";
import { Mail, Phone, MapPin, Clock, Send } from "lucide-react";
import { toast } from "sonner";
import { RevealOnScroll } from "@/components/RevealOnScroll";
import { useCompanyContact, useCatalogMutations } from "@/hooks/api/useCatalog";
import { getErrorMessage } from "@/lib/api/errors";

const WhatsAppGlyph = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 32 32"
    className={className}
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M19.11 17.2c-.27-.14-1.58-.78-1.82-.87-.24-.09-.42-.13-.6.14-.18.27-.69.87-.85 1.05-.16.18-.31.2-.58.07-.27-.14-1.15-.42-2.18-1.35-.81-.72-1.35-1.61-1.51-1.88-.16-.27-.02-.42.12-.56.12-.12.27-.31.4-.47.13-.16.18-.27.27-.45.09-.18.04-.34-.02-.47-.07-.14-.6-1.44-.82-1.98-.22-.52-.44-.45-.6-.46h-.51c-.18 0-.47.07-.71.34-.24.27-.93.91-.93 2.22 0 1.31.95 2.58 1.08 2.76.13.18 1.86 2.84 4.5 3.98.63.27 1.12.43 1.5.55.63.2 1.21.17 1.66.1.51-.08 1.58-.65 1.8-1.27.22-.62.22-1.15.16-1.27-.07-.12-.24-.2-.51-.34z" />
    <path d="M16 3.2c-7.05 0-12.78 5.74-12.78 12.79 0 2.25.59 4.45 1.7 6.38L3.2 28.8l6.58-1.69a12.74 12.74 0 0 0 6.22 1.59h.01c7.05 0 12.79-5.74 12.79-12.79C28.8 8.94 23.06 3.2 16 3.2zm0 23.38h-.01a10.6 10.6 0 0 1-5.4-1.48l-.39-.23-3.9 1 1.04-3.8-.25-.39a10.56 10.56 0 0 1-1.62-5.64C5.47 10.2 10.2 5.47 16 5.47s10.53 4.73 10.53 10.54c0 5.81-4.73 10.57-10.53 10.57z" />
  </svg>
);

type ContactCard = {
  key: string;
  Icon: LucideIcon | typeof WhatsAppGlyph;
  label: string;
  detail: React.ReactNode;
};

const INTEREST_OPTIONS = [
  { value: "buy", label: "Buy" },
  { value: "rent", label: "Rent" },
  { value: "sell", label: "Sell / list" },
  { value: "general", label: "General inquiry" },
] as const;

const BUDGET_OPTIONS = [
  { value: "under-500k", label: "Under ₹500,000" },
  { value: "500k-1.5m", label: "₹500,000 – ₹1,500,000" },
  { value: "1.5m-3m", label: "₹1,500,000 – ₹3,000,000" },
  { value: "3m-5m", label: "₹3,000,000 – ₹5,000,000" },
  { value: "5m-plus", label: "₹5,000,000+" },
  { value: "undisclosed", label: "Prefer not to say" },
] as const;

const OFFICE_LAT = 11.29268612842755;
const OFFICE_LNG = 75.8176451067927;

const Contact = () => {
  const { data: company } = useCompanyContact();
  const { submitContact } = useCatalogMutations();
  const [interest, setInterest] = useState("");
  const [budget, setBudget] = useState("");

  const address = (company?.address || company?.company_address || "").trim();
  const phone = (company?.phone || company?.admin_phone || "").trim();
  const email = (company?.email || company?.company_email || "").trim();
  const whatsapp = (company?.whatsapp || company?.admin_whatsapp || "").trim();
  const phoneHref = phone ? `tel:${phone.replace(/[^\d+]/g, "")}` : "";
  const whatsappHref = whatsapp
    ? `https://wa.me/${whatsapp.replace(/\D/g, "")}`
    : "";

  const contactCards: ContactCard[] = [];
  if (address) {
    contactCards.push({
      key: "visit",
      Icon: MapPin,
      label: "Visit us",
      detail: (
        <span className="leading-relaxed whitespace-pre-line">{address}</span>
      ),
    });
  }
  if (phone) {
    contactCards.push({
      key: "call",
      Icon: Phone,
      label: "Call",
      detail: (
        <a href={phoneHref} className="hover:text-gold transition-colors">
          {phone}
        </a>
      ),
    });
  }
  if (email) {
    contactCards.push({
      key: "email",
      Icon: Mail,
      label: "Email",
      detail: (
        <a
          href={`mailto:${email}`}
          className="hover:text-gold transition-colors"
        >
          {email}
        </a>
      ),
    });
  }
  if (whatsapp) {
    contactCards.push({
      key: "whatsapp",
      Icon: WhatsAppGlyph,
      label: "WhatsApp",
      detail: (
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-gold transition-colors underline-offset-2 hover:underline"
        >
          {whatsapp}
        </a>
      ),
    });
  }
  contactCards.push({
    key: "hours",
    Icon: Clock,
    label: "Hours",
    detail: "Mon - Sat · 9:00 to 19:00",
  });

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const interestLabel = INTEREST_OPTIONS.find(
      (o) => o.value === interest,
    )?.label;
    const budgetLabel = BUDGET_OPTIONS.find((o) => o.value === budget)?.label;
    const name = String(fd.get("name") || "");
    const senderEmail = String(fd.get("email") || "");
    const phone = String(fd.get("phone") || "");
    const message = String(fd.get("message") || "");
    const subject = interestLabel
      ? `${interestLabel} enquiry`
      : "General enquiry";
    try {
      await submitContact.mutateAsync({
        name,
        email: senderEmail,
        phone_number: phone,
        subject,
        message,
        budget_range: budgetLabel || "",
      });
      toast.success("Message sent — we'll be in touch within 24h");
      form.reset();
      setInterest("");
      setBudget("");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <section className="bg-black text-white py-14 md:py-20">
        <RevealOnScroll className="container">
          <div className="text-xs uppercase tracking-[0.25em] text-white">
            Contact
          </div>
          <h1 className="font-serif text-4xl md:text-7xl mt-3 text-white">
            Let&apos;s talk
          </h1>
          <p className="mt-4 text-white/85 max-w-xl">
            Whether you&apos;re buying, listing, or just curious — our team is
            here to help.
          </p>
        </RevealOnScroll>
      </section>

      <section className="relative overflow-hidden py-10 md:py-16">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute inset-0 bg-white" />
          <div className="absolute -bottom-24 -left-24 h-80 w-80 rounded-full border border-gold/25" />
          <div className="absolute -bottom-32 -left-32 h-[26rem] w-[26rem] rounded-full border border-gold/15" />
          <div className="absolute -bottom-40 -left-40 h-[32rem] w-[32rem] rounded-full border border-gold/10" />
          <div className="absolute -bottom-10 -left-10 h-56 w-56 rounded-full bg-gold/10 blur-3xl" />
        </div>

        <div className="container relative z-10 grid lg:grid-cols-[0.95fr_1.6fr] gap-6 md:gap-8">
          <RevealOnScroll className="space-y-4">
            {contactCards.map((c) => (
              <div
                key={c.key}
                className="rounded-2xl border border-gold/25 bg-card p-5 md:p-6 shadow-soft"
              >
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-xl gradient-gold grid place-items-center shadow-[0_12px_24px_-14px_rgba(197,157,95,0.9)]">
                    <c.Icon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-[0.22em] text-gold font-semibold">
                      {c.label}
                    </div>
                    <div className="mt-1 text-sm sm:text-base md:text-base text-foreground/90">
                      {c.detail}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </RevealOnScroll>

          <RevealOnScroll delayMs={60}>
            <form
              onSubmit={submit}
              className="rounded-2xl border border-gold/25 bg-card p-6 md:px-10 md:pt-8 md:pb-6 shadow-soft"
            >
              <h2 className="font-serif text-3xl md:text-5xl">
                Send us a message
              </h2>
              <div className="relative mt-4 mb-5 md:mt-5 md:mb-6">
                <div className="h-px w-full bg-gold/30" />
                <span className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-gold shadow-[0_0_0_4px_#ffffff]" />
              </div>

              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Name</Label>
                    <Input name="name" required placeholder="Your name" />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input
                      name="email"
                      type="email"
                      required
                      placeholder="Your email"
                    />
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Phone</Label>
                    <Input name="phone" placeholder="Your phone number" />
                  </div>
                  <div>
                    <Label>Property interest</Label>
                    <Select value={interest} onValueChange={setInterest}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select interest" />
                      </SelectTrigger>
                      <SelectContent>
                        {INTEREST_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Budget range</Label>
                  <Select value={budget} onValueChange={setBudget}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select range" />
                    </SelectTrigger>
                    <SelectContent>
                      {BUDGET_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Message</Label>
                  <Textarea
                    name="message"
                    rows={4}
                    required
                    placeholder="Type your message here..."
                    className="min-h-[120px] resize-y"
                  />
                </div>
                <Button
                  type="submit"
                  variant="luxe"
                  size="lg"
                  className="w-full"
                  disabled={submitContact.isPending}
                >
                  <Send className="h-4 w-4" />{" "}
                  {submitContact.isPending ? "Sending…" : "Send message"}
                </Button>
              </div>
            </form>
          </RevealOnScroll>
        </div>
      </section>

      <section className="container pb-10 md:pb-20">
        <RevealOnScroll>
          <div className="rounded-2xl overflow-hidden border border-border h-[280px] md:h-[400px] bg-muted relative">
            <iframe
              title="Buylands India office location"
              src={`https://www.google.com/maps?q=${OFFICE_LAT},${OFFICE_LNG}&hl=en&z=15&output=embed`}
              className="absolute inset-0 h-full w-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>
          <div className="mt-3 text-sm text-muted-foreground flex items-start gap-1.5">
            <MapPin className="h-4 w-4 text-gold shrink-0 mt-0.5" />
            <span className="min-w-0 break-words">
              {address || "Silver City Complex, Merikunnu, Kozhikode"}
            </span>
          </div>
        </RevealOnScroll>
      </section>

      <Footer />
    </div>
  );
};

export default Contact;
