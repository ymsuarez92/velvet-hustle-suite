import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { z } from "zod";

function publicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

/* ---------------- PUBLIC ---------------- */

export const getAvailableSlots = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string; date: string; serviceId: string }) =>
    z.object({
      slug: z.string().min(1).max(80),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      serviceId: z.string().uuid(),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: rows, error } = await sb.rpc("get_available_slots", {
      _slug: data.slug,
      _date: data.date,
      _service_id: data.serviceId,
    });
    if (error) throw new Error(error.message);
    return ((rows as { slot: string }[] | null) ?? []).map((r) => r.slot);
  });

export const createBooking = createServerFn({ method: "POST" })
  .inputValidator((d: {
    slug: string;
    serviceId: string;
    startsAt: string;
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    notes?: string;
  }) =>
    z.object({
      slug: z.string().min(1).max(80),
      serviceId: z.string().uuid(),
      startsAt: z.string().min(10),
      customerName: z.string().trim().min(2).max(100),
      customerPhone: z.string().trim().min(6).max(30),
      customerEmail: z.string().trim().email().max(255).optional().or(z.literal("")),
      notes: z.string().trim().max(500).optional().or(z.literal("")),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: id, error } = await sb.rpc("create_booking", {
      _slug: data.slug,
      _service_id: data.serviceId,
      _starts_at: data.startsAt,
      _customer_name: data.customerName,
      _customer_phone: data.customerPhone,
      _customer_email: data.customerEmail || null,
      _notes: data.notes || null,
    });
    if (error) throw new Error(error.message);
    return { id: id as string };
  });

/* ---------------- ADMIN ---------------- */

async function resolveBusiness(supabase: any, slug: string, userId: string) {
  const { data: b, error } = await supabase
    .from("businesses").select("id, name, slug").eq("slug", slug).maybeSingle();
  if (error) throw new Error(error.message);
  if (!b) throw new Error("Business not found");
  const [{ data: isSuper }, { data: isMember }] = await Promise.all([
    supabase.rpc("has_role", { _user_id: userId, _role: "super_admin" }),
    supabase.rpc("is_business_member", { _user_id: userId, _business_id: b.id }),
  ]);
  if (!isSuper && !isMember) throw new Error("Forbidden");
  return b as { id: string; name: string; slug: string };
}

export type ScheduleBundle = {
  hours: { weekday: number; isOpen: boolean; open: string | null; close: string | null; breakStart: string | null; breakEnd: string | null }[];
  blocked: { id: string; date: string; reason: string | null }[];
};

export const getSchedule = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { slug: string }) => d)
  .handler(async ({ context, data }): Promise<ScheduleBundle> => {
    const b = await resolveBusiness(context.supabase, data.slug, context.userId);
    const [hoursRes, blockedRes] = await Promise.all([
      context.supabase.from("business_hours").select("*").eq("business_id", b.id).order("weekday"),
      context.supabase.from("blocked_dates").select("*").eq("business_id", b.id).order("blocked_date"),
    ]);
    if (hoursRes.error) throw new Error(hoursRes.error.message);
    if (blockedRes.error) throw new Error(blockedRes.error.message);
    const byDay = new Map<number, any>();
    for (const r of hoursRes.data ?? []) byDay.set(r.weekday, r);
    const hours = Array.from({ length: 7 }).map((_, w) => {
      const r = byDay.get(w);
      return {
        weekday: w,
        isOpen: r?.is_open ?? false,
        open: r?.open_time ?? null,
        close: r?.close_time ?? null,
        breakStart: r?.break_start ?? null,
        breakEnd: r?.break_end ?? null,
      };
    });
    return {
      hours,
      blocked: (blockedRes.data ?? []).map((b: any) => ({ id: b.id, date: b.blocked_date, reason: b.reason })),
    };
  });

export const updateBusinessHours = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { slug: string; hours: { weekday: number; isOpen: boolean; open: string | null; close: string | null; breakStart: string | null; breakEnd: string | null }[] }) => d)
  .handler(async ({ context, data }) => {
    const b = await resolveBusiness(context.supabase, data.slug, context.userId);
    // delete + reinsert is simplest with no unique constraint
    await context.supabase.from("business_hours").delete().eq("business_id", b.id);
    const rows = data.hours.map((h) => ({
      business_id: b.id,
      weekday: h.weekday,
      is_open: h.isOpen,
      open_time: h.isOpen ? h.open : null,
      close_time: h.isOpen ? h.close : null,
      break_start: h.isOpen ? h.breakStart : null,
      break_end: h.isOpen ? h.breakEnd : null,
    }));
    const { error } = await context.supabase.from("business_hours").insert(rows);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const addBlockedDate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { slug: string; date: string; reason?: string }) =>
    z.object({ slug: z.string(), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), reason: z.string().max(200).optional() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const b = await resolveBusiness(context.supabase, data.slug, context.userId);
    const { error } = await context.supabase.from("blocked_dates").insert({
      business_id: b.id, blocked_date: data.date, reason: data.reason ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeBlockedDate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { slug: string; id: string }) => d)
  .handler(async ({ context, data }) => {
    const b = await resolveBusiness(context.supabase, data.slug, context.userId);
    const { error } = await context.supabase.from("blocked_dates").delete().eq("id", data.id).eq("business_id", b.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export type AppointmentRow = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  serviceName: string | null;
  notes: string | null;
};

export const listAppointments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { slug: string; from?: string; to?: string }) => d)
  .handler(async ({ context, data }): Promise<AppointmentRow[]> => {
    const b = await resolveBusiness(context.supabase, data.slug, context.userId);
    let q = context.supabase
      .from("appointments")
      .select("id, starts_at, ends_at, status, customer_name, customer_phone, customer_email, notes, services(name)")
      .eq("business_id", b.id)
      .order("starts_at", { ascending: true });
    if (data.from) q = q.gte("starts_at", data.from);
    if (data.to) q = q.lte("starts_at", data.to);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r: any) => ({
      id: r.id, startsAt: r.starts_at, endsAt: r.ends_at, status: r.status,
      customerName: r.customer_name, customerPhone: r.customer_phone, customerEmail: r.customer_email,
      serviceName: r.services?.name ?? null, notes: r.notes,
    }));
  });

export const updateAppointmentStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { slug: string; id: string; status: "pending"|"confirmed"|"completed"|"cancelled"|"no_show" }) => d)
  .handler(async ({ context, data }) => {
    const b = await resolveBusiness(context.supabase, data.slug, context.userId);
    const { error } = await context.supabase.from("appointments").update({ status: data.status })
      .eq("id", data.id).eq("business_id", b.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });