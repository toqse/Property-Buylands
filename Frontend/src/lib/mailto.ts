type EmailDetails = {
  name?: string;
  email?: string;
  phone?: string;
  budget?: string;
  message?: string;
};

/**
 * Opens the user's default email app addressed to the company inbox, prefilled
 * with the enquiry details. Used after an enquiry/contact endpoint succeeds so
 * the visitor can also reach the company directly over email.
 */
export function openCompanyEmail(
  companyEmail: string,
  subject: string,
  details: EmailDetails = {},
): void {
  if (typeof window === "undefined") return;
  const to = (companyEmail || "").trim();
  if (!to) return;

  const lines: string[] = [];
  if (details.name) lines.push(`Name: ${details.name}`);
  if (details.email) lines.push(`Email: ${details.email}`);
  if (details.phone) lines.push(`Phone: ${details.phone}`);
  if (details.budget) lines.push(`Budget: ${details.budget}`);
  if (details.message) {
    if (lines.length) lines.push("");
    lines.push(details.message);
  }

  const params = new URLSearchParams();
  if (subject) params.set("subject", subject);
  if (lines.length) params.set("body", lines.join("\n"));

  const query = params.toString();
  window.location.href = `mailto:${to}${query ? `?${query}` : ""}`;
}
