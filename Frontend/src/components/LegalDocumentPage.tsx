"use client";

import type { LegalDocument, LegalSection } from "@/data/legalDocuments";
import { useCompanyContact } from "@/hooks/api/useCatalog";
import { cn } from "@/lib/utils";

function applyContactPlaceholders(text: string, phone: string, address: string): string {
  return text
    .replace("[Phone number]", phone || "[Phone number]")
    .replace("[Registered office address]", address || "[Registered office address]");
}

function LegalSectionBlock({
  section,
  phone,
  address,
}: {
  section: LegalSection;
  phone: string;
  address: string;
}) {
  const fmt = (text: string) => applyContactPlaceholders(text, phone, address);

  return (
    <section className="scroll-mt-6">
      <h2 className="font-serif text-xl md:text-2xl text-foreground">
        {section.number}. {section.title}
      </h2>

      {section.paragraphs?.map((paragraph) => (
        <p key={paragraph.slice(0, 40)} className="mt-4 text-sm md:text-base text-muted-foreground leading-relaxed">
          {fmt(paragraph)}
        </p>
      ))}

      {section.items && section.items.length > 0 && (
        <ul className="mt-4 space-y-2 text-sm md:text-base text-muted-foreground leading-relaxed list-disc pl-5">
          {section.items.map((item) => (
            <li key={item.slice(0, 48)}>{fmt(item)}</li>
          ))}
        </ul>
      )}

      {section.subsections?.map((sub) => (
        <div key={sub.label} className="mt-5">
          <h3 className="text-sm md:text-base font-semibold text-foreground">{sub.label}</h3>
          <ul className="mt-2 space-y-2 text-sm md:text-base text-muted-foreground leading-relaxed list-disc pl-5">
            {sub.items.map((item) => (
              <li key={item.slice(0, 48)}>{fmt(item)}</li>
            ))}
          </ul>
        </div>
      ))}

      {section.paragraphsAfter?.map((paragraph) => (
        <p key={paragraph.slice(0, 40)} className="mt-4 text-sm md:text-base text-muted-foreground leading-relaxed">
          {fmt(paragraph)}
        </p>
      ))}
    </section>
  );
}

export function LegalDocumentPage({ document }: { document: LegalDocument }) {
  const { data: company } = useCompanyContact();
  const phone = (company?.phone || company?.admin_phone || "").trim();
  const address = (company?.address || company?.company_address || "").trim();

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 py-10 md:py-14">
        <div className="mx-auto w-[70vw] max-w-full px-4 sm:px-6">
          <header className="text-center mb-10 md:mb-12">
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">{document.heroEyebrow}</p>
            <h1 className="font-serif text-3xl md:text-5xl mt-3 text-foreground">{document.heading}</h1>
            <p className="mt-3 text-sm md:text-base text-muted-foreground">
              Buy Lands India · Last updated: {document.lastUpdated}
            </p>
          </header>

          <nav
            aria-label="Table of contents"
            className="mb-10 rounded-2xl border border-border bg-muted/30 p-5 md:p-6"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-semibold text-center">
              Contents
            </p>
            <ol className="mt-4 grid gap-2 sm:grid-cols-2 text-sm">
              {document.sections.map((section) => (
                <li key={section.number}>
                  <a
                    href={`#section-${section.number}`}
                    className="text-foreground/80 hover:text-gold transition-colors"
                  >
                    {section.number}. {section.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <article className={cn("space-y-10 md:space-y-12")}>
            {document.sections.map((section) => (
              <div key={section.number} id={`section-${section.number}`}>
                <LegalSectionBlock section={section} phone={phone} address={address} />
              </div>
            ))}

            {document.closingParagraph && (
              <p className="pt-4 border-t border-border text-sm md:text-base text-muted-foreground leading-relaxed text-center">
                {document.closingParagraph}
              </p>
            )}
          </article>
        </div>
      </main>
    </div>
  );
}
