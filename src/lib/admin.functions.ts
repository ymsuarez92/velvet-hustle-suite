import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AdminTenant = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  tagline: string | null;
  status: string;
  subscriptionPlan: string;
  suspendedAt: string | null;
  createdAt: string;
  metrics: {
    members: number;
    customers: number;
    appointments30d: number;
    mrr: number;
  };
};

async function assertSuperAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "super_admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

async function logAudit(opts: {
  actorUserId: string;
  actorEmail?: string | null;
  businessId?: string | null;
  action: string;
  entity?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await (supabaseAdmin.from("audit_logs") as any).insert({
    actor_user_id: opts.actorUserId,
    actor_email: opts.actorEmail ?? null,
    business_id: opts.businessId ?? null,
    action: opts.action,
    entity: opts.entity ?? null,
    entity_id: opts.entityId ?? null,
    metadata: opts.metadata ?? {},
  });
}

export const listAllTenants = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminTenant[]> => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("businesses")
      .select("id, slug, name, city, tagline, status, subscription_plan, suspended_at, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const ids = (data ?? []).map((b) => b.id);
    const since = new Date(Date.now() - 30 * 86400_000).toISOString();

    // Pull aggregates in parallel
    const [subsRes, custRes, apptRes, membRes] = await Promise.all([
      supabaseAdmin.from("subscriptions").select("business_id, status, membership_id").in("business_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]),
      supabaseAdmin.from("customers").select("business_id").in("business_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]),
      supabaseAdmin.from("appointments").select("business_id, created_at").in("business_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]).gte("created_at", since),
      supabaseAdmin.from("memberships").select("id, business_id, price").in("business_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]),
    ]);

    const membPrice = new Map<string, number>();
    for (const m of (membRes.data ?? []) as any[]) membPrice.set(m.id as string, Number(m.price) || 0);

    function tally(bid: string) {
      const subs = (subsRes.data ?? []).filter((s) => s.business_id === bid && s.status === "active");
      const members = subs.length;
      const mrr = subs.reduce((acc, s) => acc + (membPrice.get(s.membership_id as string) ?? 0), 0);
      const customers = (custRes.data ?? []).filter((c) => c.business_id === bid).length;
      const appointments30d = (apptRes.data ?? []).filter((a) => a.business_id === bid).length;
      return { members, customers, appointments30d, mrr };
    }

    return (data ?? []).map((b) => ({
      id: b.id,
      slug: b.slug,
      name: b.name,
      city: b.city,
      tagline: b.tagline,
      status: b.status,
      subscriptionPlan: b.subscription_plan ?? "starter",
      suspendedAt: b.suspended_at,
      createdAt: b.created_at,
      metrics: tally(b.id),
    }));
  });

export const createTenant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { slug: string; name: string; city?: string; tagline?: string; plan?: string }) => d)
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("businesses")
      .insert({
        slug: data.slug,
        name: data.name,
        city: data.city ?? null,
        tagline: data.tagline ?? null,
        subscription_plan: data.plan ?? "starter",
        status: "draft",
      })
      .select("id, slug")
      .single();
    if (error) throw new Error(error.message);
    await logAudit({ actorUserId: context.userId, businessId: row.id, action: "tenant.create", entity: "business", entityId: row.id, metadata: { slug: data.slug, name: data.name } });
    return row;
  });

export const updateTenant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; name?: string; city?: string | null; tagline?: string | null; plan?: string }) => d)
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: Record<string, unknown> = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.city !== undefined) patch.city = data.city;
    if (data.tagline !== undefined) patch.tagline = data.tagline;
    if (data.plan !== undefined) patch.subscription_plan = data.plan;
    const { error } = await (supabaseAdmin.from("businesses") as any).update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAudit({ actorUserId: context.userId, businessId: data.id, action: "tenant.update", entity: "business", entityId: data.id, metadata: patch });
    return { ok: true };
  });

export const setTenantStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; status: "draft" | "published" | "suspended" }) => d)
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: Record<string, unknown> = { status: data.status };
    if (data.status === "suspended") patch.suspended_at = new Date().toISOString();
    if (data.status !== "suspended") patch.suspended_at = null;
    const { error } = await supabaseAdmin
      .from("businesses")
      .update(patch as any)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAudit({ actorUserId: context.userId, businessId: data.id, action: `tenant.${data.status}`, entity: "business", entityId: data.id });
    return { ok: true };
  });

export const deleteTenant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("businesses").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await logAudit({ actorUserId: context.userId, businessId: data.id, action: "tenant.delete", entity: "business", entityId: data.id });
    return { ok: true };
  });

export const getMyAccount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: roles } = await context.supabase
      .from("user_roles")
      .select("role, business_id")
      .eq("user_id", context.userId);
    return { userId: context.userId, roles: roles ?? [] };
  });

/* -------------------- PLATFORM STATS -------------------- */

export type PlatformStats = {
  totals: {
    businesses: number;
    published: number;
    suspended: number;
    members: number;
    customers: number;
    appointments: number;
    mrr: number;
  };
  growth: {
    newBusinesses30d: number;
    newCustomers30d: number;
    appointments30d: number;
    appointmentsPrev30d: number;
  };
  topTenants: Array<{ id: string; name: string; slug: string; mrr: number; members: number }>;
};

export const getPlatformStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PlatformStats> => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const now = Date.now();
    const d30 = new Date(now - 30 * 86400_000).toISOString();
    const d60 = new Date(now - 60 * 86400_000).toISOString();

    const [biz, subs, memb, cust, appt, appt30, appt60] = await Promise.all([
      supabaseAdmin.from("businesses").select("id, name, slug, status, created_at"),
      supabaseAdmin.from("subscriptions").select("business_id, membership_id, status"),
      supabaseAdmin.from("memberships").select("id, price"),
      supabaseAdmin.from("customers").select("id, created_at"),
      supabaseAdmin.from("appointments").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("appointments").select("id, created_at").gte("created_at", d30),
      supabaseAdmin.from("appointments").select("id, created_at").gte("created_at", d60).lt("created_at", d30),
    ]);

    const businesses = biz.data ?? [];
    const memPrice = new Map<string, number>();
    for (const m of (memb.data ?? []) as any[]) memPrice.set(m.id as string, Number(m.price) || 0);

    const activeSubs = (subs.data ?? []).filter((s) => s.status === "active");
    const mrr = activeSubs.reduce((acc, s) => acc + (memPrice.get(s.membership_id as string) ?? 0), 0);

    const perTenantMrr = new Map<string, { mrr: number; members: number }>();
    for (const s of activeSubs) {
      const cur = perTenantMrr.get(s.business_id as string) ?? { mrr: 0, members: 0 };
      cur.mrr += memPrice.get(s.membership_id as string) ?? 0;
      cur.members += 1;
      perTenantMrr.set(s.business_id as string, cur);
    }
    const topTenants = businesses
      .map((b) => ({ id: b.id, name: b.name, slug: b.slug, mrr: perTenantMrr.get(b.id)?.mrr ?? 0, members: perTenantMrr.get(b.id)?.members ?? 0 }))
      .sort((a, b) => b.mrr - a.mrr)
      .slice(0, 5);

    return {
      totals: {
        businesses: businesses.length,
        published: businesses.filter((b) => b.status === "published").length,
        suspended: businesses.filter((b) => b.status === "suspended").length,
        members: activeSubs.length,
        customers: (cust.data ?? []).length,
        appointments: appt.count ?? 0,
        mrr,
      },
      growth: {
        newBusinesses30d: businesses.filter((b) => b.created_at >= d30).length,
        newCustomers30d: (cust.data ?? []).filter((c) => c.created_at >= d30).length,
        appointments30d: (appt30.data ?? []).length,
        appointmentsPrev30d: (appt60.data ?? []).length,
      },
      topTenants,
    };
  });

/* -------------------- USERS -------------------- */

export type PlatformUser = {
  id: string;
  email: string | null;
  createdAt: string;
  lastSignInAt: string | null;
  roles: Array<{ role: string; business_id: string | null; business_name?: string | null }>;
};

export const listPlatformUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PlatformUser[]> => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: usersRes, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (error) throw new Error(error.message);
    const [{ data: roles }, { data: biz }] = await Promise.all([
      supabaseAdmin.from("user_roles").select("user_id, role, business_id"),
      supabaseAdmin.from("businesses").select("id, name"),
    ]);
    const bizMap = new Map<string, string>();
    for (const b of biz ?? []) bizMap.set(b.id as string, b.name as string);
    return (usersRes.users ?? []).map((u) => ({
      id: u.id,
      email: u.email ?? null,
      createdAt: u.created_at,
      lastSignInAt: u.last_sign_in_at ?? null,
      roles: (roles ?? [])
        .filter((r) => r.user_id === u.id)
        .map((r) => ({ role: r.role as string, business_id: r.business_id as string | null, business_name: r.business_id ? bizMap.get(r.business_id as string) ?? null : null })),
    }));
  });

export const createPlatformUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { email: string; password: string; role: "super_admin" | "business_admin" | "staff"; businessId?: string | null }) => d)
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });
    if (error) throw new Error(error.message);
    const userId = created.user!.id;
    const { error: rErr } = await supabaseAdmin.from("user_roles").insert({
      user_id: userId,
      role: data.role,
      business_id: data.role === "super_admin" ? null : data.businessId ?? null,
    });
    if (rErr) throw new Error(rErr.message);
    await logAudit({ actorUserId: context.userId, businessId: data.businessId ?? null, action: "user.create", entity: "user", entityId: userId, metadata: { email: data.email, role: data.role } });
    return { id: userId };
  });

export const resetUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; password: string }) => d)
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, { password: data.password });
    if (error) throw new Error(error.message);
    await logAudit({ actorUserId: context.userId, action: "user.password_reset", entity: "user", entityId: data.userId });
    return { ok: true };
  });

export const deletePlatformUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string }) => d)
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context);
    if (data.userId === context.userId) throw new Error("Cannot delete yourself");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    await logAudit({ actorUserId: context.userId, action: "user.delete", entity: "user", entityId: data.userId });
    return { ok: true };
  });

/* -------------------- TEMPLATES -------------------- */

export type ServiceTemplate = {
  id: string; title: string; description: string | null; category: string | null;
  durationMin: number; suggestedPrice: number; imageUrl: string | null; isActive: boolean;
};
export type MembershipTemplate = {
  id: string; tier: string; name: string; description: string | null; badge: string | null;
  monthlyPrice: number; includedCuts: number | null; benefits: string[]; isActive: boolean;
};

export const listServiceTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ServiceTemplate[]> => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.from("service_templates").select("*").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => ({
      id: r.id, title: r.title, description: r.description, category: r.category,
      durationMin: r.duration_min, suggestedPrice: Number(r.suggested_price), imageUrl: r.image_url, isActive: r.is_active,
    }));
  });

export const upsertServiceTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: Partial<ServiceTemplate> & { title: string }) => d)
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const row: Record<string, unknown> = {
      title: data.title, description: data.description ?? null, category: data.category ?? null,
      duration_min: data.durationMin ?? 30, suggested_price: data.suggestedPrice ?? 0,
      image_url: data.imageUrl ?? null, is_active: data.isActive ?? true,
    };
    if (data.id) row.id = data.id;
    const { error } = await (supabaseAdmin.from("service_templates") as any).upsert(row);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteServiceTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("service_templates").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listMembershipTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MembershipTemplate[]> => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.from("membership_templates").select("*").order("monthly_price");
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => ({
      id: r.id, tier: r.tier, name: r.name, description: r.description, badge: r.badge,
      monthlyPrice: Number(r.monthly_price), includedCuts: r.included_cuts, benefits: r.benefits ?? [], isActive: r.is_active,
    }));
  });

export const upsertMembershipTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: Partial<MembershipTemplate> & { tier: string; name: string }) => d)
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const row: Record<string, unknown> = {
      tier: data.tier, name: data.name, description: data.description ?? null, badge: data.badge ?? null,
      monthly_price: data.monthlyPrice ?? 0, included_cuts: data.includedCuts ?? null,
      benefits: data.benefits ?? [], is_active: data.isActive ?? true,
    };
    if (data.id) row.id = data.id;
    const { error } = await (supabaseAdmin.from("membership_templates") as any).upsert(row);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteMembershipTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("membership_templates").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const applyTemplatesToTenant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { businessId: string; serviceTemplateIds?: string[]; membershipTemplateIds?: string[] }) => d)
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.serviceTemplateIds?.length) {
      const { data: tpl } = await supabaseAdmin.from("service_templates").select("*").in("id", data.serviceTemplateIds);
      const rows = (tpl ?? []).map((t) => ({
        business_id: data.businessId, name: t.title, description: t.description, category: t.category,
        duration_min: t.duration_min, price: t.suggested_price, image_url: t.image_url, is_active: true,
      }));
      if (rows.length) {
        const { error } = await (supabaseAdmin.from("services") as any).insert(rows);
        if (error) throw new Error(error.message);
      }
    }
    if (data.membershipTemplateIds?.length) {
      const { data: tpl } = await supabaseAdmin.from("membership_templates").select("*").in("id", data.membershipTemplateIds);
      const rows = (tpl ?? []).map((t) => ({
        business_id: data.businessId, name: t.name, description: t.description, badge: t.badge,
        price: t.monthly_price, included_cuts: t.included_cuts, benefits: t.benefits, is_active: true,
      }));
      if (rows.length) {
        const { error } = await (supabaseAdmin.from("memberships") as any).insert(rows);
        if (error) throw new Error(error.message);
      }
    }
    await logAudit({ actorUserId: context.userId, businessId: data.businessId, action: "tenant.apply_templates", metadata: { ...data } });
    return { ok: true };
  });

/* -------------------- AUDIT -------------------- */

export type AuditLogRow = {
  id: string; createdAt: string; actorEmail: string | null; businessId: string | null;
  businessName: string | null; action: string; entity: string | null; entityId: string | null; metadata: unknown;
};

export const listAuditLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { limit?: number } | undefined) => d ?? {})
  .handler(async ({ context, data }): Promise<AuditLogRow[]> => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const limit = Math.min(data.limit ?? 100, 500);
    const { data: rows, error } = await supabaseAdmin
      .from("audit_logs")
      .select("id, actor_user_id, actor_email, business_id, action, entity, entity_id, metadata, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    const ids = Array.from(new Set((rows ?? []).map((r) => r.business_id).filter(Boolean) as string[]));
    const userIds = Array.from(new Set((rows ?? []).map((r) => r.actor_user_id).filter(Boolean) as string[]));
    const [{ data: biz }, usersRes] = await Promise.all([
      ids.length
        ? supabaseAdmin.from("businesses").select("id, name").in("id", ids)
        : Promise.resolve({ data: [] as Array<{ id: string; name: string }> } as any),
      userIds.length ? supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 }) : Promise.resolve({ data: { users: [] } } as any),
    ]);
    const bMap = new Map<string, string>();
    for (const b of biz ?? []) bMap.set(b.id as string, b.name as string);
    const uMap = new Map<string, string>();
    for (const u of usersRes.data?.users ?? []) uMap.set(u.id, u.email ?? "");
    return (rows ?? []).map((r) => ({
      id: r.id,
      createdAt: r.created_at,
      actorEmail: r.actor_email ?? (r.actor_user_id ? uMap.get(r.actor_user_id) ?? null : null),
      businessId: r.business_id,
      businessName: r.business_id ? bMap.get(r.business_id) ?? null : null,
      action: r.action,
      entity: r.entity,
      entityId: r.entity_id,
      metadata: (r.metadata ?? {}) as unknown,
    }));
  });