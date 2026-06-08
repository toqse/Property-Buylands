import { Link } from "@/lib/router";
import { MapPin } from "lucide-react";
import { Property } from "@/data/mockData";
import { cn } from "@/lib/utils";
import { PropertyMediaThumb } from "@/components/PropertyMediaThumb";

const priceFmt = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

function typeBadgeLabel(type: Property["type"] | string): string {
  if (type === "For Sale") return "Buy";
  if (type === "For Rent") return "Rent";
  return type;
}

export function MobilePropertyCard({
  property,
  index = 0,
  className,
}: {
  property: Property;
  index?: number;
  className?: string;
}) {
  return (
    <article
      className={cn(
        "animate-fade-in overflow-hidden rounded-xl bg-white shadow-[0_4px_16px_-8px_rgba(15,23,42,0.15)] ring-1 ring-black/[0.06]",
        className,
      )}
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <Link
        to={`/properties/${property.slug || property.id}`}
        className="flex h-full flex-col"
      >
        <div className="relative aspect-square w-full overflow-hidden">
          <PropertyMediaThumb
            image={property.image}
            videoUrl={property.videoUrl}
            videoThumbnail={property.videoThumbnail}
            alt={property.title}
          />
          <span className="absolute top-2 left-2 z-10 rounded-md bg-[#16a34a] px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm">
            {typeBadgeLabel(property.type)}
          </span>
          <span className="absolute bottom-2 right-2 max-w-[calc(100%-1rem)] truncate rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-foreground shadow-sm">
            ₹{priceFmt.format(property.price)}
          </span>
        </div>
        <div className="shrink-0 p-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#0e305d]">
            {property.category}
          </p>
          <h3 className="mt-0.5 line-clamp-1 text-[13px] font-semibold leading-snug text-foreground">
            {property.title}
          </h3>
          <p className="mt-1 flex items-start gap-1 text-[11px] text-muted-foreground">
            <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-gold" />
            <span className="line-clamp-1">
              {property.location}, {property.city}
            </span>
          </p>
        </div>
      </Link>
    </article>
  );
}
