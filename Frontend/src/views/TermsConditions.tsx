"use client";

import { LegalDocumentPage } from "@/components/LegalDocumentPage";
import { TERMS_CONDITIONS } from "@/data/legalDocuments";

export default function TermsConditions() {
  return <LegalDocumentPage document={TERMS_CONDITIONS} />;
}
