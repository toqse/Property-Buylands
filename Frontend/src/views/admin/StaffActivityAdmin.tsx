"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams as useNextSearchParams, usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { accountsApi } from "@/lib/api/accounts";
import { useNavigate } from "@/lib/router";
import type { ApiStaffActivity } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Building2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  LogIn,
  Megaphone,
  Pencil,
  Search,
  Trash2,
  UserCog,
} from "lucide-react";

const PAGE_SIZE = 15;

const ACTION_LABELS: Record<string, string> = {
  create: "Created",
  update: "Updated",
  delete: "Deleted",
  login: "Login",
};

const RESOURCE_LABELS: Record<string, string> = {
  property: "Property",
  advertisement: "Advertisement",
  staff: "Staff",
  auth: "Authentication",
};

function activityIcon(action: string, resourceType: string) {
  if (action === "login") return LogIn;
  if (resourceType === "advertisement") return Megaphone;
  if (resourceType === "property") {
    if (action === "delete") return Trash2;
    if (action === "update") return Pencil;
    return Building2;
  }
  if (resourceType === "staff") return UserCog;
  return Clock3;
}

function actionTone(action: string) {
  if (action === "delete") return "bg-destructive/10 text-destructive";
  if (action === "create") return "bg-emerald-500/10 text-emerald-700";
  if (action === "update") return "bg-sky-500/10 text-sky-700";
  if (action === "login") return "bg-amber-500/10 text-amber-700";
  return "bg-muted text-muted-foreground";
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: "—", time: "" };
  return {
    date: d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }),
    time: d.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
  };
}

function readStaffIdFromUrl(nextParams: URLSearchParams | null): string {
  const fromNext = nextParams?.get("staff")?.trim() ?? "";
  if (fromNext) return fromNext;
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("staff")?.trim() ?? "";
}

export function StaffActivityAdmin() {
  const navigate = useNavigate();
  const pathname = usePathname();
  const nextSearchParams = useNextSearchParams();
  const nextParamsKey = nextSearchParams?.toString() ?? "";
  const [staffId, setStaffId] = useState(() => readStaffIdFromUrl(nextSearchParams));

  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [resourceFilter, setResourceFilter] = useState("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setStaffId(readStaffIdFromUrl(nextSearchParams));
  }, [pathname, nextParamsKey, nextSearchParams]);

  useEffect(() => {
    setPage(1);
  }, [debounced, actionFilter, resourceFilter, staffId]);

  const { data: staff } = useQuery({
    queryKey: ["staffDetail", staffId],
    queryFn: () => accountsApi.getStaff(staffId),
    enabled: !!staffId,
  });

  const params = useMemo(() => {
    const p: Record<string, string | number> = {
      page,
      page_size: PAGE_SIZE,
    };
    if (debounced) p.search = debounced;
    if (actionFilter !== "all") p.action = actionFilter;
    if (resourceFilter !== "all") p.resource_type = resourceFilter;
    return p;
  }, [page, debounced, actionFilter, resourceFilter]);

  const { data, isFetching } = useQuery({
    queryKey: ["staffActivityPage", staffId, params],
    queryFn: () => accountsApi.staffActivity(staffId, params),
    enabled: !!staffId,
  });

  const rows = (data?.results ?? []) as ApiStaffActivity[];
  const total = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, total);

  const staffName = staff?.full_name || staff?.email || "Staff member";

  if (!staffId) {
    return (
      <div className="animate-fade-in space-y-6">
        <Button variant="outline" onClick={() => navigate("/admin/staff")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to staff
        </Button>
        <div className="bg-card border border-border rounded-2xl p-12 text-center shadow-sm">
          <Clock3 className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="text-sm text-muted-foreground">
            Select a staff member from the directory to view their activity.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <Button
          variant="ghost"
          className="mb-4 -ml-3 text-muted-foreground hover:text-foreground"
          onClick={() => navigate("/admin/staff")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to staff
        </Button>

        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-primary text-primary-foreground grid place-items-center text-sm font-semibold shrink-0">
            {initials(staffName)}
          </div>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground mb-1">
              Activity log
            </p>
            <h1 className="font-serif text-3xl md:text-4xl truncate">{staffName}</h1>
            {staff?.email && (
              <p className="text-sm text-muted-foreground mt-1">{staff.email}</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9 rounded-full bg-card"
            placeholder="Search activity details…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-full lg:w-48 rounded-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All activity types</SelectItem>
            <SelectItem value="create">Created</SelectItem>
            <SelectItem value="update">Updated</SelectItem>
            <SelectItem value="delete">Deleted</SelectItem>
            <SelectItem value="login">Login</SelectItem>
          </SelectContent>
        </Select>
        <Select value={resourceFilter} onValueChange={setResourceFilter}>
          <SelectTrigger className="w-full lg:w-48 rounded-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All resources</SelectItem>
            <SelectItem value="property">Property</SelectItem>
            <SelectItem value="advertisement">Advertisement</SelectItem>
            <SelectItem value="staff">Staff</SelectItem>
            <SelectItem value="auth">Authentication</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead className="bg-muted/40 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              <tr>
                <th className="text-left p-4 font-medium">Staff</th>
                <th className="text-left p-4 font-medium">Activity type</th>
                <th className="text-left p-4 font-medium">Resource</th>
                <th className="text-left p-4 font-medium">Details</th>
                <th className="text-left p-4 font-medium pr-6">Date &amp; time</th>
              </tr>
            </thead>
            <tbody>
              {isFetching && !rows.length ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-muted-foreground">
                    Loading activity…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-muted-foreground">
                    No activity found for the selected filters.
                  </td>
                </tr>
              ) : (
                rows.map((a) => {
                  const Icon = activityIcon(a.action, a.resource_type);
                  const { date, time } = formatDateTime(a.created_at);
                  return (
                    <tr key={a.id} className="border-t border-border hover:bg-muted/30">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-primary text-primary-foreground grid place-items-center text-xs font-semibold shrink-0">
                            {initials(a.actor_name || a.actor_email)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium truncate">
                              {a.actor_name || a.actor_email}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {a.actor_email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                            actionTone(a.action),
                          )}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {ACTION_LABELS[a.action] || a.action}
                        </span>
                      </td>
                      <td className="p-4">
                        <Badge variant="outline" className="font-normal">
                          {RESOURCE_LABELS[a.resource_type] || a.resource_type}
                        </Badge>
                        {a.resource_id ? (
                          <span className="ml-2 text-xs text-muted-foreground tabular-nums">
                            #{a.resource_id}
                          </span>
                        ) : null}
                      </td>
                      <td className="p-4 text-foreground/80">
                        {a.summary || "—"}
                      </td>
                      <td className="p-4 pr-6 whitespace-nowrap">
                        <div className="text-foreground/80">{date}</div>
                        <div className="text-xs text-muted-foreground tabular-nums">
                          {time}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {total === 0
            ? "No records"
            : `Showing ${rangeStart}–${rangeEnd} of ${total} record(s)`}
        </p>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={!data?.previous}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <span className="text-xs text-muted-foreground tabular-nums">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={!data?.next}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default StaffActivityAdmin;
