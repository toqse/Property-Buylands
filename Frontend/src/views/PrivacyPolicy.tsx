"use client";

import { LegalDocumentPage } from "@/components/LegalDocumentPage";
import { PRIVACY_POLICY } from "@/data/legalDocuments";

export default function PrivacyPolicy() {
  return <LegalDocumentPage document={PRIVACY_POLICY} />;
}
