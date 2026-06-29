import PropertyDetail from "@/views/PropertyDetail";
import { PROPERTIES } from "@/data/mockData";
import { propertiesApi } from "@/lib/api/properties";
import type { ApiProperty, FeedItem } from "@/lib/api/types";
import { Suspense } from "react";

// Stable client-render shell. public/.htaccess (and public/_redirects) rewrite
// any /properties/<slug>/ that has no exported HTML to this page, so property
// links keep working even for listings created after the last build.
export const PROPERTY_DETAIL_SHELL_ID = "__detail__";

function extractIdentifiers(item: FeedItem | ApiProperty): string[] {
  const out: string[] = [];
  if ("type" in item) {
    if (item.type !== "property") return out;
    const data = item.data;
    if (data.slug) out.push(data.slug);
    if (data.id != null) out.push(String(data.id));
    return out;
  }
  if (item.slug) out.push(item.slug);
  if (item.id != null) out.push(String(item.id));
  return out;
}

export async function generateStaticParams() {
  const ids = new Set<string>([PROPERTY_DETAIL_SHELL_ID]);

  // Keep mock ids working for local/offline builds.
  for (const p of PROPERTIES) ids.add(p.id);

  // Best-effort: pre-generate a page for every real property so shared/direct
  // links resolve to a real file. Never fail the build if the API is down.
  try {
    let page = 1;
    for (let guard = 0; guard < 200; guard += 1) {
      const res = await propertiesApi.list({
        page,
        page_size: 100,
        moderation_status: "approved",
      });
      for (const item of res.results) {
        for (const id of extractIdentifiers(item)) {
          ids.add(id);
        }
      }
      if (!res.next) break;
      page += 1;
    }
  } catch {
    // Ignore: the .htaccess/_redirects fallback handles any missing pages.
  }

  return Array.from(ids).map((id) => ({ id }));
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <PropertyDetail />
    </Suspense>
  );
}
