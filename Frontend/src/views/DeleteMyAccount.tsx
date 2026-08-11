"use client";

import { Link } from "@/lib/router";
import { useCompanyContact } from "@/hooks/api/useCatalog";
import { useStandalonePublicPage } from "@/hooks/useStandalonePublicPage";
import { RevealOnScroll } from "@/components/RevealOnScroll";
import type { LucideIcon } from "lucide-react";
import { Mail, Phone, Send, ShieldCheck, Clock, FileText } from "lucide-react";

type Step = {
  Icon: LucideIcon;
  title: string;
  description: string;
};

const STEPS: Step[] = [
  {
    Icon: Send,
    title: "Send a deletion request",
    description:
      "Email or call us using the contact details below. Include your full name, registered email, and phone number so we can locate your account.",
  },
  {
    Icon: ShieldCheck,
    title: "Identity verification",
    description:
      "Our team may contact you to confirm ownership of the account before proceeding. This helps protect your data from unauthorised deletion requests.",
  },
  {
    Icon: Clock,
    title: "Processing timeline",
    description:
      "Account deletion requests are typically processed within 7 business days. You will receive a confirmation once your account and associated personal data have been removed.",
  },
];

function formatPhoneHref(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

function formatPhoneDisplay(phone: string) {
  const digits = phone.replace(/[^\d]/g, "");
  if (digits.length === 10) {
    return `+91 ${digits}`;
  }
  if (digits.length === 12 && digits.startsWith("91")) {
    return `+${digits.slice(0, 2)} ${digits.slice(2)}`;
  }
  return phone;
}

export default function DeleteMyAccount() {
  const { data: company } = useCompanyContact();
  const email = (company?.email || company?.company_email || "").trim();
  const phone = (company?.phone || company?.admin_phone || "").trim();
  const phoneHref = phone ? formatPhoneHref(phone) : "";
  const phoneDisplay = phone ? formatPhoneDisplay(phone) : "";

  useStandalonePublicPage();

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 bg-muted/30 py-10 md:py-16">
        <RevealOnScroll className="container max-w-3xl">
          <article className="rounded-2xl border border-border bg-card shadow-soft overflow-hidden">
            <header className="px-6 md:px-10 pt-8 md:pt-10 pb-6 text-center">
              <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                Account deletion
              </p>
              <h1 className="font-serif text-3xl md:text-5xl mt-3 text-foreground">
                Delete my account
              </h1>
              <p className="mt-4 text-sm md:text-base text-muted-foreground leading-relaxed max-w-2xl mx-auto">
                If you no longer wish to use Buy Lands India, you can request
                permanent deletion of your property owner account and associated
                personal data. Please contact our team using the details below
                — we do not offer instant self-service deletion at this time.
              </p>
            </header>

            <div className="px-6 md:px-10 pb-8 md:pb-10 space-y-8 md:space-y-10">
              <section className="rounded-xl border border-gold/25 bg-gold/5 p-5 md:p-6">
                <h2 className="font-semibold text-foreground text-base md:text-lg">
                  Contact support to delete your account
                </h2>
                <p className="mt-3 text-sm md:text-base text-muted-foreground leading-relaxed">
                  To request deletion, email or call us with your{" "}
                  <strong className="font-semibold text-foreground">full name</strong>
                  ,{" "}
                  <strong className="font-semibold text-foreground">
                    registered email
                  </strong>
                  , and{" "}
                  <strong className="font-semibold text-foreground">
                    phone number
                  </strong>
                  . We will verify your identity before processing the request.
                </p>

                <div className="mt-5 grid sm:grid-cols-2 gap-4">
                  {email ? (
                    <div className="rounded-xl border border-gold/20 bg-card p-4 md:p-5">
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-lg gradient-gold grid place-items-center shrink-0">
                          <Mail className="h-4 w-4 text-white" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[10px] uppercase tracking-[0.22em] text-gold font-semibold">
                            Email
                          </div>
                          <a
                            href={`mailto:${email}`}
                            className="mt-1 block text-sm md:text-base text-foreground hover:text-gold transition-colors break-all"
                          >
                            {email}
                          </a>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {phone ? (
                    <div className="rounded-xl border border-gold/20 bg-card p-4 md:p-5">
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-lg gradient-gold grid place-items-center shrink-0">
                          <Phone className="h-4 w-4 text-white" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[10px] uppercase tracking-[0.22em] text-gold font-semibold">
                            Phone
                          </div>
                          <a
                            href={phoneHref}
                            className="mt-1 block text-sm md:text-base text-foreground hover:text-gold transition-colors"
                          >
                            {phoneDisplay}
                          </a>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {!email && !phone ? (
                    <p className="text-sm text-muted-foreground sm:col-span-2">
                      Contact details are being updated. Please use our{" "}
                      <Link to="/contact" className="text-gold hover:underline">
                        contact page
                      </Link>{" "}
                      to reach us.
                    </p>
                  ) : null}
                </div>
              </section>

              <section>
                <h2 className="font-serif text-xl md:text-2xl text-foreground">
                  What happens next
                </h2>
                <ol className="mt-5 space-y-5">
                  {STEPS.map((step) => (
                    <li key={step.title} className="flex gap-4">
                      <div className="h-10 w-10 rounded-full bg-gold/10 border border-gold/20 grid place-items-center shrink-0">
                        <step.Icon className="h-4 w-4 text-gold" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground text-sm md:text-base">
                          {step.title}
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                          {step.description}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>

              <section className="rounded-xl border border-border bg-muted/40 p-5 md:p-6">
                <div className="flex gap-3">
                  <FileText className="h-5 w-5 text-gold shrink-0 mt-0.5" />
                  <div className="text-sm md:text-base text-muted-foreground leading-relaxed">
                    <p>
                      <strong className="font-semibold text-foreground">
                        Please note:
                      </strong>{" "}
                      Account deletion is permanent. Once processed, you will
                      lose access to your login, and any property listings
                      associated with your account will be removed from the
                      platform. For details on how we handle personal data,
                      see our{" "}
                      <Link
                        to="/privacy-policy"
                        className="text-gold hover:underline font-medium"
                      >
                        Privacy Policy
                      </Link>
                      .
                    </p>
                    <p className="mt-3">
                      If you only wish to pause listing activity, you may
                      contact us to discuss alternatives before requesting full
                      account deletion.
                    </p>
                  </div>
                </div>
              </section>
            </div>
          </article>
        </RevealOnScroll>
      </main>
    </div>
  );
}
