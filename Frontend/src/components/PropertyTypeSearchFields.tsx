"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PROJECT_STATUS_OPTIONS,
  SIGHTING_DIRECTION_OPTIONS,
} from "@/components/PropertyListingForm";
import type { PropertyTypeFeatureFlags } from "@/lib/api/propertyForm";
import type { PropertyTypeSearchFilterState } from "@/lib/api/propertyForm";
import { cn } from "@/lib/utils";

const AREA_UNIT_OPTIONS = [
  { value: "sqft" as const, label: "Square feet", inputLabel: "Area (sq.ft)" },
  { value: "cents" as const, label: "Cent", inputLabel: "Area (Cent)" },
];

const FURNISHING_OPTIONS = [
  "Any",
  "Unfurnished",
  "Semi-furnished",
  "Fully furnished",
] as const;

const ROOM_COUNT_OPTIONS = [
  "Any",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
] as const;

function roomCountLabel(opt: string, kind: "min" | "max") {
  if (opt === "Any") return "Any";
  if (kind === "min" && opt === "10") return "10+";
  if (kind === "min") return `${opt}+`;
  return opt;
}

type PropertyTypeSearchFieldsProps = {
  typeFlags: PropertyTypeFeatureFlags;
  filters: PropertyTypeSearchFilterState;
  onChange: (patch: Partial<PropertyTypeSearchFilterState>) => void;
  labelClassName?: string;
  triggerClassName?: string;
  inputClassName?: string;
  /** When true, bedroom/bathroom fields are omitted (render via PropertyTypeRoomSearchFields). */
  hideRoomFilters?: boolean;
};

type PropertyTypeRoomSearchFieldsProps = Omit<
  PropertyTypeSearchFieldsProps,
  "hideRoomFilters"
> & {
  sectionLabelClassName?: string;
};

export function PropertyTypeRoomSearchFields({
  typeFlags,
  filters,
  onChange,
  labelClassName = "mb-2 block text-xs uppercase tracking-wider text-[hsl(30_10%_35%)]",
  triggerClassName = "h-11 rounded-xl border-border bg-white text-[hsl(30_14%_20%)]",
  sectionLabelClassName = "mb-3 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[hsl(30_10%_35%)]",
}: PropertyTypeRoomSearchFieldsProps) {
  if (!typeFlags.has_bedrooms && !typeFlags.has_bathrooms) return null;

  return (
    <div className="space-y-3">
      <p className={sectionLabelClassName}>Bedrooms &amp; bathrooms</p>
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
        {typeFlags.has_bedrooms ? (
          <>
            <div>
              <Label className={labelClassName}>Bedrooms (min)</Label>
              <Select
                value={filters.bedroomsMin}
                onValueChange={(v) => onChange({ bedroomsMin: v })}
              >
                <SelectTrigger className={triggerClassName}>
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  {ROOM_COUNT_OPTIONS.map((opt) => (
                    <SelectItem key={`bed-min-${opt}`} value={opt}>
                      {roomCountLabel(opt, "min")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className={labelClassName}>Bedrooms (max)</Label>
              <Select
                value={filters.bedroomsMax}
                onValueChange={(v) => onChange({ bedroomsMax: v })}
              >
                <SelectTrigger className={triggerClassName}>
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  {ROOM_COUNT_OPTIONS.map((opt) => (
                    <SelectItem key={`bed-max-${opt}`} value={opt}>
                      {roomCountLabel(opt, "max")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        ) : null}

        {typeFlags.has_bathrooms ? (
          <>
            <div>
              <Label className={labelClassName}>Bathrooms (min)</Label>
              <Select
                value={filters.bathroomsMin}
                onValueChange={(v) => onChange({ bathroomsMin: v })}
              >
                <SelectTrigger className={triggerClassName}>
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  {ROOM_COUNT_OPTIONS.map((opt) => (
                    <SelectItem key={`bath-min-${opt}`} value={opt}>
                      {roomCountLabel(opt, "min")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className={labelClassName}>Bathrooms (max)</Label>
              <Select
                value={filters.bathroomsMax}
                onValueChange={(v) => onChange({ bathroomsMax: v })}
              >
                <SelectTrigger className={triggerClassName}>
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  {ROOM_COUNT_OPTIONS.map((opt) => (
                    <SelectItem key={`bath-max-${opt}`} value={opt}>
                      {roomCountLabel(opt, "max")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

export function PropertyTypeSearchFields({
  typeFlags,
  filters,
  onChange,
  labelClassName = "mb-2 block text-xs uppercase tracking-wider text-[hsl(30_10%_35%)]",
  triggerClassName = "h-11 rounded-xl border-border bg-white text-[hsl(30_14%_20%)]",
  inputClassName = "h-11 rounded-xl border-border bg-white text-[hsl(30_14%_20%)]",
  hideRoomFilters = false,
}: PropertyTypeSearchFieldsProps) {
  return (
    <>
      {!hideRoomFilters ? (
        <PropertyTypeRoomSearchFields
          typeFlags={typeFlags}
          filters={filters}
          onChange={onChange}
          labelClassName={labelClassName}
          triggerClassName={triggerClassName}
          sectionLabelClassName={labelClassName.replace("mb-2 block ", "mb-3 block ")}
        />
      ) : null}

      {typeFlags.has_area_both ? (
        <>
          <div>
            <Label className={labelClassName}>Area (sq.ft) min</Label>
            <Input
              className={cn(inputClassName, "font-mono")}
              placeholder="e.g. 1000"
              inputMode="decimal"
              value={filters.areaMin}
              onChange={(e) => onChange({ areaMin: e.target.value })}
            />
          </div>
          <div>
            <Label className={labelClassName}>Area (sq.ft) max</Label>
            <Input
              className={cn(inputClassName, "font-mono")}
              placeholder="e.g. 5000"
              inputMode="decimal"
              value={filters.areaMax}
              onChange={(e) => onChange({ areaMax: e.target.value })}
            />
          </div>
          <div>
            <Label className={labelClassName}>Area (Cent) min</Label>
            <Input
              className={cn(inputClassName, "font-mono")}
              placeholder="e.g. 5"
              inputMode="decimal"
              value={filters.areaCentMin}
              onChange={(e) => onChange({ areaCentMin: e.target.value })}
            />
          </div>
          <div>
            <Label className={labelClassName}>Area (Cent) max</Label>
            <Input
              className={cn(inputClassName, "font-mono")}
              placeholder="e.g. 20"
              inputMode="decimal"
              value={filters.areaCentMax}
              onChange={(e) => onChange({ areaCentMax: e.target.value })}
            />
          </div>
        </>
      ) : (
        <>
          <div>
            <Label className={labelClassName}>Area unit</Label>
            <Select
              value={filters.areaUnit}
              onValueChange={(v) =>
                onChange({ areaUnit: v as PropertyTypeSearchFilterState["areaUnit"] })
              }
            >
              <SelectTrigger className={triggerClassName}>
                <SelectValue placeholder="Select area unit" />
              </SelectTrigger>
              <SelectContent>
                {AREA_UNIT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className={labelClassName}>
              {AREA_UNIT_OPTIONS.find((o) => o.value === filters.areaUnit)
                ?.inputLabel ?? "Area"}{" "}
              min
            </Label>
            <Input
              className={cn(inputClassName, "font-mono")}
              placeholder="Min"
              inputMode="decimal"
              value={filters.areaMin}
              onChange={(e) => onChange({ areaMin: e.target.value })}
            />
          </div>
          <div>
            <Label className={labelClassName}>
              {AREA_UNIT_OPTIONS.find((o) => o.value === filters.areaUnit)
                ?.inputLabel ?? "Area"}{" "}
              max
            </Label>
            <Input
              className={cn(inputClassName, "font-mono")}
              placeholder="Max"
              inputMode="decimal"
              value={filters.areaMax}
              onChange={(e) => onChange({ areaMax: e.target.value })}
            />
          </div>
        </>
      )}

      {typeFlags.has_furnishing ? (
        <div>
          <Label className={labelClassName}>Furnishing</Label>
          <Select
            value={filters.furnishing}
            onValueChange={(v) => onChange({ furnishing: v })}
          >
            <SelectTrigger className={triggerClassName}>
              <SelectValue placeholder="Any" />
            </SelectTrigger>
            <SelectContent>
              {FURNISHING_OPTIONS.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      {typeFlags.has_parking_spaces ? (
        <div>
          <Label className={labelClassName}>Parking spaces (min)</Label>
          <Input
            className={inputClassName}
            placeholder="e.g. 1"
            inputMode="numeric"
            value={filters.parkingSpaces}
            onChange={(e) => onChange({ parkingSpaces: e.target.value })}
          />
        </div>
      ) : null}

      {typeFlags.has_project_status ? (
        <div>
          <Label className={labelClassName}>Project status</Label>
          <Select
            value={filters.projectStatus}
            onValueChange={(v) => onChange({ projectStatus: v })}
          >
            <SelectTrigger className={triggerClassName}>
              <SelectValue placeholder="Any" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Any">Any</SelectItem>
              {PROJECT_STATUS_OPTIONS.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      {typeFlags.has_floors ? (
        <div>
          <Label className={labelClassName}>Floors</Label>
          <Input
            className={inputClassName}
            placeholder="e.g. 2"
            value={filters.floors}
            onChange={(e) => onChange({ floors: e.target.value })}
          />
        </div>
      ) : null}

      {typeFlags.has_sighting ? (
        <div>
          <Label className={labelClassName}>Sighting (facing)</Label>
          <Select
            value={filters.sighting}
            onValueChange={(v) => onChange({ sighting: v })}
          >
            <SelectTrigger className={triggerClassName}>
              <SelectValue placeholder="Any" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Any">Any</SelectItem>
              {SIGHTING_DIRECTION_OPTIONS.map((dir) => (
                <SelectItem key={dir} value={dir}>
                  {dir}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
    </>
  );
}
