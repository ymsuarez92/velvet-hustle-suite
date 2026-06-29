import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AdminBusiness = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  status: string;
  city: string | null;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  instagram: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  accentColor: string | null;
};

export type AdminContent = {
  heroEyebrow: string | null;
  heroTitle: string | null;
  heroSubtitle: string | null;
  heroImageUrl: string | null;
  aboutTitle: string | null;
  aboutBody: string | null;
  stats: { value: string; label: string }[];
  pillars: { icon: string; title: string }[];
  gallery: string[];
  testimonials: { name: string; role: string; quote: string; rating: number }[];
  hours: { day: string; hours: string }[];
};

export type AdminService = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  durationMin: number;
  price: number;
  imageUrl: string | null;
  isActive: boolean;
  sortOrder: number;
};

export type AdminMembership = {
  id: string;
  name: string;
  price: number;
  includedCuts: number | null;
  benefits: string[];
  badge: string | null;
  highlighted: boolean;
  isActive: boolean;
  sortOrder: number;
};

export type AdminPayload = {
  business: AdminBusiness;
  content: AdminContent;
  services: AdminService[];
  memberships: AdminMembership[];
  canEdit: boolean;
  isSuperAdmin: boolean;
};

async function loadBusinessOrThrow(supabase: any, slug: string) {
  const { data, error } = await supabase
    .from("businesses")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Business not found");
  return data;
}

async function assertCanEdit(ctx: { supabase: any; userId: string }, businessId: string) {
  const [{ data: isSuper }, { data: isMember }] = await Promise.all([
    ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "super_admin" }),
    ctx.supabase.rpc("is_business_member", { _user_id: ctx.userId, _business_id: businessId }),
  ]);
  if (!isSuper && !isMember) throw new Error("Forbidden");
  return { isSuper: !!isSuper };
}

export const getBusinessAdminBundle = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { slug: string }) => d)
  .handler(async ({ context, data }): Promise<AdminPayload> => {
    const business = await loadBusinessOrThrow(context.supabase, data.slug);
    const { isSuper } = await assertCanEdit(context, business.id);

    const [contentRes, servicesRes, membershipsRes] = await Promise.all([
      context.supabase.from("website_content").select("*").eq("business_id", business.id).maybeSingle(),
      context.supabase.from("services").select("*").eq("business_id", business.id).order("sort_order"),
      context.supabase.from("memberships").select("*").eq("business_id", business.id).order("sort_order"),
    ]);

    const c: any = contentRes.data ?? {};
    return {
      business: {
        id: business.id,
        slug: business.slug,
        name: business.name,
        tagline: business.tagline,
        status: business.status,
        city: business.city,
        address: business.address,
        phone: business.phone,
        whatsapp: business.whatsapp,
        email: business.email,
        instagram: business.instagram,
        logoUrl: business.logo_url,
        primaryColor: business.primary_color,
        accentColor: business.accent_color,
      },
      content: {
        heroEyebrow: c.hero_eyebrow ?? null,
        heroTitle: c.hero_title ?? null,
        heroSubtitle: c.hero_subtitle ?? null,
        heroImageUrl: c.hero_image_url ?? null,
        aboutTitle: c.about_title ?? null,
        aboutBody: c.about_body ?? null,
        stats: (c.stats as AdminContent["stats"]) ?? [],
        pillars: (c.pillars as AdminContent["pillars"]) ?? [],
        gallery: (c.gallery as string[]) ?? [],
        testimonials: (c.testimonials as AdminContent["testimonials"]) ?? [],
        hours: (c.hours as AdminContent["hours"]) ?? [],
      },
      services: (servicesRes.data ?? []).map((s: any) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        category: s.category,
        durationMin: s.duration_min,
        price: Number(s.price),
        imageUrl: s.image_url,
        isActive: s.is_active,
        sortOrder: s.sort_order,
      })),
      memberships: (membershipsRes.data ?? []).map((m: any) => ({
        id: m.id,
        name: m.name,
        price: Number(m.price),
        includedCuts: m.included_cuts,
        benefits: (m.benefits as string[]) ?? [],
        badge: m.badge,
        highlighted: m.highlighted,
        isActive: m.is_active,
        sortOrder: m.sort_order,
      })),
      canEdit: true,
      isSuperAdmin: isSuper,
    };
  });

export const updateBusinessSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    businessId: string;
    patch: Partial<{
      name: string; tagline: string | null; city: string | null; address: string | null;
      phone: string | null; whatsapp: string | null; email: string | null; instagram: string | null;
      logo_url: string | null; primary_color: string | null; accent_color: string | null;
    }>;
  }) => d)
  .handler(async ({ context, data }) => {
    await assertCanEdit(context, data.businessId);
    const { error } = await context.supabase
      .from("businesses")
      .update(data.patch)
      .eq("id", data.businessId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateWebsiteContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { businessId: string; patch: Record<string, unknown> }) => d)
  .handler(async ({ context, data }) => {
    await assertCanEdit(context, data.businessId);
    // Upsert by business_id (unique)
    const { data: existing } = await context.supabase
      .from("website_content")
      .select("id")
      .eq("business_id", data.businessId)
      .maybeSingle();
    if (existing) {
      const { error } = await context.supabase
        .from("website_content")
        .update(data.patch as any)
        .eq("business_id", data.businessId);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase
        .from("website_content")
        .insert({ business_id: data.businessId, ...data.patch } as any);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const upsertService = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    businessId: string;
    service: {
      id?: string;
      name: string; description?: string | null; category?: string | null;
      duration_min: number; price: number; image_url?: string | null;
      is_active?: boolean; sort_order?: number;
    };
  }) => d)
  .handler(async ({ context, data }) => {
    await assertCanEdit(context, data.businessId);
    const row = { business_id: data.businessId, ...data.service };
    if (data.service.id) {
      const { error } = await context.supabase
        .from("services")
        .update(row)
        .eq("id", data.service.id)
        .eq("business_id", data.businessId);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase.from("services").insert(row);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteService = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { businessId: string; id: string }) => d)
  .handler(async ({ context, data }) => {
    await assertCanEdit(context, data.businessId);
    const { error } = await context.supabase
      .from("services").delete()
      .eq("id", data.id).eq("business_id", data.businessId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const upsertMembership = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    businessId: string;
    membership: {
      id?: string;
      name: string; price: number; included_cuts?: number | null;
      benefits?: string[]; badge?: string | null; highlighted?: boolean;
      is_active?: boolean; sort_order?: number;
    };
  }) => d)
  .handler(async ({ context, data }) => {
    await assertCanEdit(context, data.businessId);
    const row = { business_id: data.businessId, ...data.membership };
    if (data.membership.id) {
      const { error } = await context.supabase
        .from("memberships").update(row)
        .eq("id", data.membership.id).eq("business_id", data.businessId);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase.from("memberships").insert(row);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteMembership = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { businessId: string; id: string }) => d)
  .handler(async ({ context, data }) => {
    await assertCanEdit(context, data.businessId);
    const { error } = await context.supabase
      .from("memberships").delete()
      .eq("id", data.id).eq("business_id", data.businessId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const assignBusinessOwner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { businessId: string; email: string }) => d)
  .handler(async ({ context, data }) => {
    const { data: isSuper } = await context.supabase.rpc("has_role", {
      _user_id: context.userId, _role: "super_admin",
    });
    if (!isSuper) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Find user by email
    const { data: list, error: lErr } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (lErr) throw new Error(lErr.message);
    const user = list.users.find((u) => u.email?.toLowerCase() === data.email.toLowerCase());
    if (!user) throw new Error("User not found. Ask them to sign up first.");
    const { error } = await supabaseAdmin.from("user_roles").upsert(
      { user_id: user.id, business_id: data.businessId, role: "business_admin" },
      { onConflict: "user_id,role,business_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true, userId: user.id };
  });

export type OwnerOverview = {
  estimatedRevenue30d: number;
  completedCount30d: number;
  upcomingCount: number;
  todayCount: number;
  activeMemberships: number;
  mrrEstimate: number;
  newCustomers30d: number;
  upcoming: {
    id: string; startsAt: string; customerName: string;
    serviceName: string | null; status: string;
  }[];
};

export const getOwnerOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { slug: string }) => d)
  .handler(async ({ context, data }): Promise<OwnerOverview> => {
    const business = await loadBusinessOrThrow(context.supabase, data.slug);
    await assertCanEdit(context, business.id);

    const now = new Date();
    const in30 = new Date(now.getTime() - 30 * 24 * 3600 * 1000).toISOString();
    const todayStart = new Date(now.toISOString().slice(0, 10) + "T00:00:00").toISOString();
    const todayEnd = new Date(now.toISOString().slice(0, 10) + "T23:59:59").toISOString();

    const [completedRes, upcomingRes, todayRes, subsRes, customersRes] = await Promise.all([
      context.supabase
        .from("appointments")
        .select("id, services(price)")
        .eq("business_id", business.id)
        .eq("status", "completed")
        .gte("starts_at", in30),
      context.supabase
        .from("appointments")
        .select("id, starts_at, status, customer_name, services(name)")
        .eq("business_id", business.id)
        .in("status", ["pending", "confirmed"])
        .gte("starts_at", now.toISOString())
        .order("starts_at", { ascending: true })
        .limit(6),
      context.supabase
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .eq("business_id", business.id)
        .in("status", ["pending", "confirmed"])
        .gte("starts_at", todayStart)
        .lte("starts_at", todayEnd),
      context.supabase
        .from("subscriptions")
        .select("id, memberships(price)")
        .eq("business_id", business.id)
        .eq("status", "active"),
      context.supabase
        .from("customers")
        .select("id", { count: "exact", head: true })
        .eq("business_id", business.id)
        .gte("created_at", in30),
    ]);

    const completed = completedRes.data ?? [];
    const revenue = completed.reduce(
      (s: number, r: any) => s + Number(r.services?.price ?? 0), 0,
    );
    const subs = subsRes.data ?? [];
    const mrr = subs.reduce((s: number, r: any) => s + Number(r.memberships?.price ?? 0), 0);

    return {
      estimatedRevenue30d: revenue,
      completedCount30d: completed.length,
      upcomingCount: (upcomingRes.data ?? []).length,
      todayCount: todayRes.count ?? 0,
      activeMemberships: subs.length,
      mrrEstimate: mrr,
      newCustomers30d: customersRes.count ?? 0,
      upcoming: (upcomingRes.data ?? []).map((a: any) => ({
        id: a.id,
        startsAt: a.starts_at,
        customerName: a.customer_name,
        serviceName: a.services?.name ?? null,
        status: a.status,
      })),
    };
  });