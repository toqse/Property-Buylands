import { Link } from "@/lib/router";
import { Bed, Bath, Maximize, MapPin } from "lucide-react";
import { Property } from "@/data/mockData";
import { PropertyMediaThumb } from "@/components/PropertyMediaThumb";

export const PropertyCard = ({
  property,
  index = 0,
  promoted = false,
}: {
  property: Property;
  index?: number;
  promoted?: boolean;
}) => {
  const fmt = new Intl.NumberFormat("en-US");

  return (
    <article
      className="group animate-fade-in overflow-hidden rounded-2xl bg-white shadow-[0_8px_28px_-16px_rgba(15,23,42,0.18)] ring-1 ring-black/[0.06] transition-shadow hover:shadow-[0_18px_44px_-20px_rgba(15,23,42,0.28)]"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <Link to={`/properties/${property.slug || property.id}`} className="relative block">
        <div className="relative aspect-[4/3] overflow-hidden">
          <PropertyMediaThumb
            image={property.image}
            videoUrl={property.videoUrl}
            videoThumbnail={property.videoThumbnail}
            alt={property.title}
            imgClassName="transition-transform duration-[1500ms] group-hover:scale-110"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-black/5 to-transparent" />

          {/* Top-left badge — hidden in Featured Collection, otherwise "For Sale / For Rent" (green) */}
          {!promoted && (
            <span className="absolute top-3 left-3 inline-flex items-center rounded-md bg-[#16a34a] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white shadow-sm">
              {property.type}
            </span>
          )}

          {/* Bottom-left category pill */}
          <span className="absolute bottom-3 left-3 inline-flex items-center rounded-md bg-white/95 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-foreground/80 shadow-sm">
            {property.category}
          </span>
        </div>
      </Link>

      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-sans text-lg font-semibold leading-tight tracking-tight text-foreground">
              <Link
                to={`/properties/${property.id}`}
                title={property.title}
                className="block truncate transition-colors hover:text-gold"
              >
                {property.title}
              </Link>
            </h3>
            <div className="mt-1.5 flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-gold" />
              <span className="truncate">{property.location}, {property.city}</span>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="font-sans text-lg font-semibold tabular-nums text-foreground">
              ₹{fmt.format(property.price)}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {property.type === "For Rent" ? "Starting Rent" : "Starting Price"}
            </div>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          {property.bedrooms > 0 && (
            <div className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-foreground/[0.04] px-2 py-2 text-[12px] font-medium text-foreground/80 ring-1 ring-black/[0.04]">
              <Bed className="h-3.5 w-3.5 text-gold" />
              {property.bedrooms} Beds
            </div>
          )}
          {property.bathrooms > 0 && (
            <div className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-foreground/[0.04] px-2 py-2 text-[12px] font-medium text-foreground/80 ring-1 ring-black/[0.04]">
              <Bath className="h-3.5 w-3.5 text-gold" />
              {property.bathrooms} Baths
            </div>
          )}
          <div className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-foreground/[0.04] px-2 py-2 text-[12px] font-medium text-foreground/80 ring-1 ring-black/[0.04]">
            <Maximize className="h-3.5 w-3.5 text-gold" />
            {fmt.format(property.area)} {property.areaUnit === "cents" ? "cents" : "ft²"}
          </div>
        </div>
      </div>
    </article>
  );
};
