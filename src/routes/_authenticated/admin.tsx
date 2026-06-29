import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listAllTenants, createTenant, updateTenant, setTenantStatus, deleteTenant,
  getPlatformStats, listPlatformUsers, createPlatformUser, resetUserPassword, deletePlatformUser,
  listServiceTemplates, upsertServiceTemplate, deleteServiceTemplate,
  listMembershipTemplates, upsertMembershipTemplate, deleteMembershipTemplate,
  applyTemplatesToTenant, listAuditLogs,
  type AdminTenant, type ServiceTemplate, type MembershipTemplate,
} from "@/lib/admin.functions";
import { assignBusinessOwner } from "@/lib/business-admin.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin")({
  component: SuperAdmin,
});

type Section = "overview" | "tenants" | "users" | "templates" | "audit";

const NAV: { id: Section; label: string; icon: string }[] = [
  { id: "overview", label: "Overview", icon: "◇" },
  { id: "tenants", label: "Tenants", icon: "◈" },
  { id: "users", label: "Users", icon: "◉" },
  { id: "templates", label: "Templates", icon: "◎" },
  { id: "audit", label: "Audit log", icon: "◐" },
];

function SuperAdmin() {
  const router = useRouter();
  const qc = useQueryClient();
  const [section, setSection] = useState<Section>("overview");

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="hidden lg:flex w-64 flex-col border-r bg-card">
        <div className="px-6 py-7 border-b">
          <p className="eyebrow">Platform</p>
          <h1 className="font-display text-xl mt-1">Maison CRM</h1>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-1">
          {NAV.map((n) => (
            <button key={n.id} onClick={() => setSection(n.id)}
              className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${section === n.id ? "bg-[color:var(--bronze)] text-white" : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"}`}>
              <span className="text-base">{n.icon}</span>
              {n.label}
            </button>
          ))}
        </nav>
        <div className="border-t p-4 space-y-2">
          <Link to="/" className="block text-xs text-muted-foreground hover:text-foreground">Platform home</Link>
          <button onClick={signOut} className="w-full rounded-full border px-4 py-2 text-xs uppercase tracking-[0.18em]">Sign out</button>
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        <header className="border-b lg:hidden">
          <div className="container-luxury flex items-center justify-between py-4 gap-2">
            <select value={section} onChange={(e) => setSection(e.target.value as Section)} className="rounded-md border bg-background px-3 py-2 text-sm">
              {NAV.map((n) => <option key={n.id} value={n.id}>{n.label}</option>)}
            </select>
            <button onClick={signOut} className="rounded-full border px-4 py-2 text-xs uppercase tracking-[0.18em]">Sign out</button>
          </div>
        </header>

        <main className="p-6 md:p-10">
          {section === "overview" && <OverviewSection onJump={setSection} />}
          {section === "tenants" && <TenantsSection />}
          {section === "users" && <UsersSection />}
          {section === "templates" && <TemplatesSection />}
          {section === "audit" && <AuditSection />}
        </main>
      </div>
    </div>
  );
}

/* ============== OVERVIEW ============== */

function OverviewSection({ onJump }: { onJump: (s: Section) => void }) {
  const stats = useServerFn(getPlatformStats);
  const q = useQuery({ queryKey: ["plat-stats"], queryFn: () => stats() });

  if (q.isLoading) return <p className="text-muted-foreground">Loading platform metrics…</p>;
  if (q.error) return <p className="text-red-600">{(q.error as Error).message}</p>;
  const d = q.data!;
  const growth = d.growth.appointmentsPrev30d === 0
    ? (d.growth.appointments30d > 0 ? 100 : 0)
    : Math.round(((d.growth.appointments30d - d.growth.appointmentsPrev30d) / d.growth.appointmentsPrev30d) * 100);

  return (
    <div className="space-y-8 max-w-7xl">
      <header>
        <p className="eyebrow">Overview</p>
        <h1 className="font-display text-4xl mt-2">Platform pulse</h1>
        <p className="mt-2 text-sm text-muted-foreground">Real-time aggregates across every house.</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Monthly recurring" value={`$${d.totals.mrr.toFixed(0)}`} sub={`${d.totals.members} active members`} />
        <KpiCard label="Businesses" value={`${d.totals.businesses}`} sub={`${d.totals.published} published · ${d.totals.suspended} suspended`} />
        <KpiCard label="Customers" value={`${d.totals.customers}`} sub={`+${d.growth.newCustomers30d} in 30 days`} />
        <KpiCard label="Appointments" value={`${d.totals.appointments}`} sub={`${growth >= 0 ? "+" : ""}${growth}% MoM`} accent={growth >= 0} />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border bg-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl">Top tenants by MRR</h2>
            <button onClick={() => onJump("tenants")} className="text-xs uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground">Manage</button>
          </div>
          <ul className="mt-4 divide-y">
            {d.topTenants.length === 0 && <li className="py-6 text-sm text-muted-foreground">No active subscriptions yet.</li>}
            {d.topTenants.map((t, i) => (
              <li key={t.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <span className="font-display text-2xl text-muted-foreground w-6">{i + 1}</span>
                  <div>
                    <p className="font-medium">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.members} members</p>
                  </div>
                </div>
                <p className="font-display text-lg">${t.mrr.toFixed(0)}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border bg-card p-6">
          <h2 className="font-display text-xl">Last 30 days</h2>
          <dl className="mt-4 space-y-4">
            <Row label="New businesses" value={d.growth.newBusinesses30d} />
            <Row label="New customers" value={d.growth.newCustomers30d} />
            <Row label="Appointments" value={d.growth.appointments30d} />
            <Row label="Prior 30 days" value={d.growth.appointmentsPrev30d} subtle />
          </dl>
        </div>
      </section>
    </div>
  );
}

function KpiCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl border bg-card p-6">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-3 font-display text-3xl">{value}</p>
      {sub && <p className={`mt-1 text-xs ${accent ? "text-emerald-700" : "text-muted-foreground"}`}>{sub}</p>}
    </div>
  );
}
function Row({ label, value, subtle }: { label: string; value: number; subtle?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${subtle ? "text-muted-foreground" : ""}`}>
      <dt className="text-sm">{label}</dt>
      <dd className="font-display text-lg">{value}</dd>
    </div>
  );
}

/* ============== TENANTS ============== */

function TenantsSection() {
  const qc = useQueryClient();
  const list = useServerFn(listAllTenants);
  const create = useServerFn(createTenant);
  const update = useServerFn(updateTenant);
  const setStatus = useServerFn(setTenantStatus);
  const del = useServerFn(deleteTenant);
  const assign = useServerFn(assignBusinessOwner);
  const applyTpl = useServerFn(applyTemplatesToTenant);
  const svcTplQ = useQuery({ queryKey: ["svc-tpl"], queryFn: () => useServerFnOnce(listServiceTemplates) });
  const memTplQ = useQuery({ queryKey: ["mem-tpl"], queryFn: () => useServerFnOnce(listMembershipTemplates) });

  const tQ = useQuery({ queryKey: ["admin", "tenants"], queryFn: () => list() });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin", "tenants"] });

  const createMut = useMutation({ mutationFn: (i: { slug: string; name: string; city?: string; tagline?: string; plan?: string }) => create({ data: i }), onSuccess: invalidate });
  const updateMut = useMutation({ mutationFn: (i: { id: string; name?: string; city?: string | null; tagline?: string | null; plan?: string }) => update({ data: i }), onSuccess: invalidate });
  const statusMut = useMutation({ mutationFn: (i: { id: string; status: "draft"|"published"|"suspended" }) => setStatus({ data: i }), onSuccess: invalidate });
  const delMut = useMutation({ mutationFn: (id: string) => del({ data: { id } }), onSuccess: invalidate });
  const assignMut = useMutation({ mutationFn: (i: { businessId: string; email: string }) => assign({ data: i }) });
  const applyMut = useMutation({ mutationFn: (i: { businessId: string; serviceTemplateIds?: string[]; membershipTemplateIds?: string[] }) => applyTpl({ data: i }) });

  const [showCreate, setShowCreate] = useState(false);
  const [edit, setEdit] = useState<AdminTenant | null>(null);

  return (
    <div className="space-y-6 max-w-7xl">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="eyebrow">Tenants</p>
          <h1 className="font-display text-4xl mt-2">{tQ.data?.length ?? 0} houses</h1>
          <p className="mt-2 text-sm text-muted-foreground">Provision, edit, suspend or remove barber shops.</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-luxury">+ New tenant</button>
      </header>

      <div className="overflow-hidden rounded-2xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-[0.18em] text-muted-foreground">
            <tr>
              <th className="px-5 py-4">Tenant</th>
              <th className="px-5 py-4">Plan</th>
              <th className="px-5 py-4">MRR</th>
              <th className="px-5 py-4">Members</th>
              <th className="px-5 py-4">Customers</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tQ.isLoading && <tr><td colSpan={7} className="px-5 py-10 text-center text-muted-foreground">Loading…</td></tr>}
            {tQ.data?.length === 0 && <tr><td colSpan={7} className="px-5 py-10 text-center text-muted-foreground">No tenants yet.</td></tr>}
            {tQ.data?.map((t) => (
              <tr key={t.id} className="border-t">
                <td className="px-5 py-4">
                  <div className="font-medium">{t.name}</div>
                  <div className="text-xs text-muted-foreground">/b/{t.slug} · {t.city ?? "—"}</div>
                </td>
                <td className="px-5 py-4 capitalize">{t.subscriptionPlan}</td>
                <td className="px-5 py-4">${t.metrics.mrr.toFixed(0)}</td>
                <td className="px-5 py-4">{t.metrics.members}</td>
                <td className="px-5 py-4">{t.metrics.customers}</td>
                <td className="px-5 py-4"><StatusPill status={t.status} /></td>
                <td className="px-5 py-4 text-right">
                  <div className="inline-flex flex-wrap justify-end gap-1.5">
                    <Link to="/b/$slug" params={{ slug: t.slug }} className="rounded-full border px-3 py-1 text-xs">View</Link>
                    <Link to="/b/$slug/admin" params={{ slug: t.slug }} className="rounded-full border px-3 py-1 text-xs">Admin</Link>
                    <button onClick={() => setEdit(t)} className="rounded-full border px-3 py-1 text-xs">Edit</button>
                    <button onClick={() => {
                      const email = prompt(`Assign business owner for "${t.name}" — email of an existing user:`);
                      if (email) assignMut.mutate({ businessId: t.id, email });
                    }} className="rounded-full border px-3 py-1 text-xs">Owner</button>
                    {t.status === "published" ? (
                      <button onClick={() => statusMut.mutate({ id: t.id, status: "draft" })} className="rounded-full border px-3 py-1 text-xs">Unpublish</button>
                    ) : (
                      <button onClick={() => statusMut.mutate({ id: t.id, status: "published" })} className="rounded-full bg-[color:var(--bronze)] px-3 py-1 text-xs text-white">Publish</button>
                    )}
                    {t.status !== "suspended" ? (
                      <button onClick={() => { if (confirm(`Suspend "${t.name}"?`)) statusMut.mutate({ id: t.id, status: "suspended" }); }} className="rounded-full border px-3 py-1 text-xs text-red-700">Suspend</button>
                    ) : (
                      <button onClick={() => statusMut.mutate({ id: t.id, status: "draft" })} className="rounded-full border px-3 py-1 text-xs">Reactivate</button>
                    )}
                    <button onClick={() => { if (confirm(`Delete "${t.name}" permanently? This removes all data.`)) delMut.mutate(t.id); }} className="rounded-full border border-red-300 px-3 py-1 text-xs text-red-700">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {assignMut.isError && <p className="text-sm text-red-600">{(assignMut.error as Error).message}</p>}
      {assignMut.isSuccess && <p className="text-sm text-emerald-700">Owner assigned ✓</p>}

      {showCreate && (
        <CreateTenantModal
          onClose={() => setShowCreate(false)}
          onSubmit={async (form) => {
            const r = await createMut.mutateAsync(form);
            const wantApply = (form.serviceTemplateIds.length || form.membershipTemplateIds.length) && r?.id;
            if (wantApply) {
              await applyMut.mutateAsync({ businessId: r.id, serviceTemplateIds: form.serviceTemplateIds, membershipTemplateIds: form.membershipTemplateIds });
            }
            setShowCreate(false);
          }}
          submitting={createMut.isPending || applyMut.isPending}
          serviceTemplates={(svcTplQ.data as ServiceTemplate[] | undefined) ?? []}
          membershipTemplates={(memTplQ.data as MembershipTemplate[] | undefined) ?? []}
        />
      )}

      {edit && (
        <EditTenantModal
          tenant={edit}
          onClose={() => setEdit(null)}
          onSubmit={async (patch) => { await updateMut.mutateAsync({ id: edit.id, ...patch }); setEdit(null); }}
          submitting={updateMut.isPending}
        />
      )}
    </div>
  );
}

// Helper so query functions can call server fns once (workaround for non-hook context)
async function useServerFnOnce<T>(fn: any): Promise<T> { return (await fn()) as T; }

function StatusPill({ status }: { status: string }) {
  const cls = status === "published" ? "bg-emerald-100 text-emerald-800"
    : status === "suspended" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800";
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs ${cls}`}>{status}</span>;
}

function CreateTenantModal({ onClose, onSubmit, submitting, serviceTemplates, membershipTemplates }: {
  onClose: () => void;
  onSubmit: (f: { slug: string; name: string; city?: string; tagline?: string; plan?: string; serviceTemplateIds: string[]; membershipTemplateIds: string[] }) => Promise<void>;
  submitting: boolean;
  serviceTemplates: ServiceTemplate[];
  membershipTemplates: MembershipTemplate[];
}) {
  const [f, setF] = useState({ slug: "", name: "", city: "", tagline: "", plan: "starter" });
  const [svc, setSvc] = useState<string[]>([]);
  const [mem, setMem] = useState<string[]>([]);
  return (
    <Modal onClose={onClose} title="Create new tenant">
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Slug (URL)" value={f.slug} onChange={(v) => setF({ ...f, slug: v.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} placeholder="elite-barber" />
          <Field label="Business name" value={f.name} onChange={(v) => setF({ ...f, name: v })} placeholder="Maison Élite" />
          <Field label="City" value={f.city} onChange={(v) => setF({ ...f, city: v })} placeholder="Madrid" />
          <Field label="Tagline" value={f.tagline} onChange={(v) => setF({ ...f, tagline: v })} placeholder="Premium grooming since 2019" />
          <label className="block sm:col-span-2">
            <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Plan</span>
            <select value={f.plan} onChange={(e) => setF({ ...f, plan: e.target.value })} className="mt-2 w-full rounded-md border bg-background px-4 py-3 text-sm">
              <option value="starter">Starter</option>
              <option value="pro">Pro</option>
              <option value="elite">Elite</option>
            </select>
          </label>
        </div>

        {(serviceTemplates.length > 0 || membershipTemplates.length > 0) && (
          <div className="rounded-xl border bg-muted/30 p-4">
            <p className="eyebrow">Seed from templates (optional)</p>
            {serviceTemplates.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-medium text-muted-foreground">Services</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {serviceTemplates.map((s) => (
                    <Chip key={s.id} active={svc.includes(s.id)} onClick={() => setSvc((p) => p.includes(s.id) ? p.filter((x) => x !== s.id) : [...p, s.id])}>{s.title}</Chip>
                  ))}
                </div>
              </div>
            )}
            {membershipTemplates.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-medium text-muted-foreground">Memberships</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {membershipTemplates.map((m) => (
                    <Chip key={m.id} active={mem.includes(m.id)} onClick={() => setMem((p) => p.includes(m.id) ? p.filter((x) => x !== m.id) : [...p, m.id])}>{m.name}</Chip>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          <button onClick={onClose} className="rounded-full border px-4 py-2 text-sm">Cancel</button>
          <button disabled={!f.slug || !f.name || submitting} onClick={() => onSubmit({ ...f, city: f.city || undefined, tagline: f.tagline || undefined, serviceTemplateIds: svc, membershipTemplateIds: mem })} className="btn-luxury">
            {submitting ? "Creating…" : "Create tenant"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function EditTenantModal({ tenant, onClose, onSubmit, submitting }: {
  tenant: AdminTenant;
  onClose: () => void;
  onSubmit: (p: { name?: string; city?: string | null; tagline?: string | null; plan?: string }) => Promise<void>;
  submitting: boolean;
}) {
  const [f, setF] = useState({ name: tenant.name, city: tenant.city ?? "", tagline: tenant.tagline ?? "", plan: tenant.subscriptionPlan });
  return (
    <Modal onClose={onClose} title={`Edit ${tenant.name}`}>
      <div className="space-y-4">
        <Field label="Name" value={f.name} onChange={(v) => setF({ ...f, name: v })} />
        <Field label="City" value={f.city} onChange={(v) => setF({ ...f, city: v })} />
        <Field label="Tagline" value={f.tagline} onChange={(v) => setF({ ...f, tagline: v })} />
        <label className="block">
          <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Plan</span>
          <select value={f.plan} onChange={(e) => setF({ ...f, plan: e.target.value })} className="mt-2 w-full rounded-md border bg-background px-4 py-3 text-sm">
            <option value="starter">Starter</option><option value="pro">Pro</option><option value="elite">Elite</option>
          </select>
        </label>
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="rounded-full border px-4 py-2 text-sm">Cancel</button>
          <button disabled={submitting} onClick={() => onSubmit({ name: f.name, city: f.city || null, tagline: f.tagline || null, plan: f.plan })} className="btn-luxury">
            {submitting ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ============== USERS ============== */

function UsersSection() {
  const qc = useQueryClient();
  const list = useServerFn(listPlatformUsers);
  const tenants = useServerFn(listAllTenants);
  const create = useServerFn(createPlatformUser);
  const reset = useServerFn(resetUserPassword);
  const del = useServerFn(deletePlatformUser);

  const usersQ = useQuery({ queryKey: ["plat-users"], queryFn: () => list() });
  const tenantsQ = useQuery({ queryKey: ["admin", "tenants"], queryFn: () => tenants() });

  const createMut = useMutation({ mutationFn: (i: any) => create({ data: i }), onSuccess: () => qc.invalidateQueries({ queryKey: ["plat-users"] }) });
  const resetMut = useMutation({ mutationFn: (i: { userId: string; password: string }) => reset({ data: i }) });
  const delMut = useMutation({ mutationFn: (id: string) => del({ data: { userId: id } }), onSuccess: () => qc.invalidateQueries({ queryKey: ["plat-users"] }) });

  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="space-y-6 max-w-7xl">
      <header className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="eyebrow">Users</p>
          <h1 className="font-display text-4xl mt-2">Accounts & roles</h1>
          <p className="mt-2 text-sm text-muted-foreground">Create tenant owners, reset credentials, manage platform admins.</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-luxury">+ New user</button>
      </header>

      <div className="overflow-hidden rounded-2xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-[0.18em] text-muted-foreground">
            <tr>
              <th className="px-5 py-4">Email</th>
              <th className="px-5 py-4">Roles</th>
              <th className="px-5 py-4">Last sign-in</th>
              <th className="px-5 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {usersQ.isLoading && <tr><td colSpan={4} className="px-5 py-10 text-center text-muted-foreground">Loading…</td></tr>}
            {usersQ.data?.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="px-5 py-4 font-medium">{u.email}</td>
                <td className="px-5 py-4">
                  <div className="flex flex-wrap gap-1.5">
                    {u.roles.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                    {u.roles.map((r, i) => (
                      <span key={i} className={`rounded-full px-2.5 py-1 text-xs ${r.role === "super_admin" ? "bg-[color:var(--bronze)] text-white" : "bg-muted"}`}>
                        {r.role}{r.business_name ? ` · ${r.business_name}` : ""}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-5 py-4 text-muted-foreground">{u.lastSignInAt ? new Date(u.lastSignInAt).toLocaleString() : "—"}</td>
                <td className="px-5 py-4 text-right">
                  <div className="inline-flex gap-1.5">
                    <button onClick={() => {
                      const p = prompt(`Set new password for ${u.email} (min 8 chars):`);
                      if (p && p.length >= 8) resetMut.mutate({ userId: u.id, password: p });
                    }} className="rounded-full border px-3 py-1 text-xs">Reset password</button>
                    <button onClick={() => { if (confirm(`Delete user ${u.email}?`)) delMut.mutate(u.id); }} className="rounded-full border border-red-300 px-3 py-1 text-xs text-red-700">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {resetMut.isSuccess && <p className="text-sm text-emerald-700">Password updated ✓</p>}
      {(createMut.error || resetMut.error || delMut.error) && <p className="text-sm text-red-600">{((createMut.error || resetMut.error || delMut.error) as Error).message}</p>}

      {showCreate && (
        <CreateUserModal
          tenants={tenantsQ.data ?? []}
          submitting={createMut.isPending}
          onClose={() => setShowCreate(false)}
          onSubmit={async (f) => { await createMut.mutateAsync(f); setShowCreate(false); }}
        />
      )}
    </div>
  );
}

function CreateUserModal({ tenants, submitting, onClose, onSubmit }: {
  tenants: AdminTenant[];
  submitting: boolean;
  onClose: () => void;
  onSubmit: (f: { email: string; password: string; role: "super_admin"|"business_admin"|"staff"; businessId?: string | null }) => Promise<void>;
}) {
  type Role = "super_admin" | "business_admin" | "staff";
  const [f, setF] = useState<{ email: string; password: string; role: Role; businessId: string }>({
    email: "", password: "", role: "business_admin", businessId: tenants[0]?.id ?? "",
  });
  return (
    <Modal onClose={onClose} title="Create user">
      <div className="space-y-4">
        <Field label="Email" value={f.email} onChange={(v) => setF({ ...f, email: v })} placeholder="owner@example.com" />
        <Field label="Temporary password" value={f.password} onChange={(v) => setF({ ...f, password: v })} placeholder="min 8 chars" />
        <label className="block">
          <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Role</span>
          <select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as any })} className="mt-2 w-full rounded-md border bg-background px-4 py-3 text-sm">
            <option value="business_admin">Business admin (owner)</option>
            <option value="staff">Staff (barber)</option>
            <option value="super_admin">Super admin (platform)</option>
          </select>
        </label>
        {f.role !== "super_admin" && (
          <label className="block">
            <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Tenant</span>
            <select value={f.businessId} onChange={(e) => setF({ ...f, businessId: e.target.value })} className="mt-2 w-full rounded-md border bg-background px-4 py-3 text-sm">
              {tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </label>
        )}
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="rounded-full border px-4 py-2 text-sm">Cancel</button>
          <button disabled={!f.email || f.password.length < 8 || submitting} onClick={() => onSubmit({ email: f.email, password: f.password, role: f.role, businessId: f.role === "super_admin" ? null : f.businessId })} className="btn-luxury">
            {submitting ? "Creating…" : "Create user"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ============== TEMPLATES ============== */

function TemplatesSection() {
  const qc = useQueryClient();
  const svcList = useServerFn(listServiceTemplates);
  const svcUp = useServerFn(upsertServiceTemplate);
  const svcDel = useServerFn(deleteServiceTemplate);
  const memList = useServerFn(listMembershipTemplates);
  const memUp = useServerFn(upsertMembershipTemplate);
  const memDel = useServerFn(deleteMembershipTemplate);

  const svcQ = useQuery({ queryKey: ["svc-tpl"], queryFn: () => svcList() });
  const memQ = useQuery({ queryKey: ["mem-tpl"], queryFn: () => memList() });

  const svcMut = useMutation({ mutationFn: (i: any) => svcUp({ data: i }), onSuccess: () => qc.invalidateQueries({ queryKey: ["svc-tpl"] }) });
  const svcDelMut = useMutation({ mutationFn: (id: string) => svcDel({ data: { id } }), onSuccess: () => qc.invalidateQueries({ queryKey: ["svc-tpl"] }) });
  const memMut = useMutation({ mutationFn: (i: any) => memUp({ data: i }), onSuccess: () => qc.invalidateQueries({ queryKey: ["mem-tpl"] }) });
  const memDelMut = useMutation({ mutationFn: (id: string) => memDel({ data: { id } }), onSuccess: () => qc.invalidateQueries({ queryKey: ["mem-tpl"] }) });

  const [editSvc, setEditSvc] = useState<ServiceTemplate | "new" | null>(null);
  const [editMem, setEditMem] = useState<MembershipTemplate | "new" | null>(null);

  return (
    <div className="space-y-10 max-w-7xl">
      <header>
        <p className="eyebrow">Templates</p>
        <h1 className="font-display text-4xl mt-2">Global blueprints</h1>
        <p className="mt-2 text-sm text-muted-foreground">Reusable services & membership tiers tenants can adopt instantly.</p>
      </header>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl">Service templates</h2>
          <button onClick={() => setEditSvc("new")} className="btn-luxury">+ New service</button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {svcQ.data?.length === 0 && <p className="text-sm text-muted-foreground">No service templates yet.</p>}
          {svcQ.data?.map((s) => (
            <div key={s.id} className="rounded-2xl border bg-card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{s.category ?? "Service"}</p>
                  <h3 className="mt-1 font-display text-lg">{s.title}</h3>
                </div>
                <p className="font-display text-lg">${s.suggestedPrice}</p>
              </div>
              {s.description && <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{s.description}</p>}
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{s.durationMin} min</span>
                <div className="flex gap-1.5">
                  <button onClick={() => setEditSvc(s)} className="rounded-full border px-3 py-1 text-xs">Edit</button>
                  <button onClick={() => { if (confirm("Delete this template?")) svcDelMut.mutate(s.id); }} className="rounded-full border border-red-300 px-3 py-1 text-xs text-red-700">Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl">Membership templates</h2>
          <button onClick={() => setEditMem("new")} className="btn-luxury">+ New membership</button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {memQ.data?.length === 0 && <p className="text-sm text-muted-foreground">No membership templates yet.</p>}
          {memQ.data?.map((m) => (
            <div key={m.id} className="rounded-2xl border bg-card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{m.tier}{m.badge ? ` · ${m.badge}` : ""}</p>
                  <h3 className="mt-1 font-display text-lg">{m.name}</h3>
                </div>
                <p className="font-display text-lg">${m.monthlyPrice}<span className="text-xs text-muted-foreground">/mo</span></p>
              </div>
              {m.description && <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{m.description}</p>}
              <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                {m.benefits.slice(0, 3).map((b, i) => <li key={i}>· {b}</li>)}
              </ul>
              <div className="mt-3 flex justify-end gap-1.5">
                <button onClick={() => setEditMem(m)} className="rounded-full border px-3 py-1 text-xs">Edit</button>
                <button onClick={() => { if (confirm("Delete this template?")) memDelMut.mutate(m.id); }} className="rounded-full border border-red-300 px-3 py-1 text-xs text-red-700">Delete</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {editSvc && <ServiceTemplateModal initial={editSvc === "new" ? null : editSvc} submitting={svcMut.isPending} onClose={() => setEditSvc(null)} onSubmit={async (v) => { await svcMut.mutateAsync(v); setEditSvc(null); }} />}
      {editMem && <MembershipTemplateModal initial={editMem === "new" ? null : editMem} submitting={memMut.isPending} onClose={() => setEditMem(null)} onSubmit={async (v) => { await memMut.mutateAsync(v); setEditMem(null); }} />}
    </div>
  );
}

function ServiceTemplateModal({ initial, submitting, onClose, onSubmit }: {
  initial: ServiceTemplate | null; submitting: boolean; onClose: () => void;
  onSubmit: (v: Partial<ServiceTemplate> & { title: string }) => Promise<void>;
}) {
  const [f, setF] = useState({
    id: initial?.id, title: initial?.title ?? "", description: initial?.description ?? "",
    category: initial?.category ?? "", durationMin: initial?.durationMin ?? 30,
    suggestedPrice: initial?.suggestedPrice ?? 0, isActive: initial?.isActive ?? true,
  });
  return (
    <Modal onClose={onClose} title={initial ? "Edit service template" : "New service template"}>
      <div className="space-y-4">
        <Field label="Title" value={f.title} onChange={(v) => setF({ ...f, title: v })} />
        <Field label="Category" value={f.category} onChange={(v) => setF({ ...f, category: v })} placeholder="Hair, Beard, Treatment…" />
        <label className="block"><span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Description</span>
          <textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} rows={3} className="mt-2 w-full rounded-md border bg-background px-4 py-3 text-sm" />
        </label>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Duration (min)" value={String(f.durationMin)} onChange={(v) => setF({ ...f, durationMin: Number(v) || 0 })} />
          <Field label="Suggested price" value={String(f.suggestedPrice)} onChange={(v) => setF({ ...f, suggestedPrice: Number(v) || 0 })} />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="rounded-full border px-4 py-2 text-sm">Cancel</button>
          <button disabled={!f.title || submitting} onClick={() => onSubmit(f)} className="btn-luxury">{submitting ? "Saving…" : "Save"}</button>
        </div>
      </div>
    </Modal>
  );
}

function MembershipTemplateModal({ initial, submitting, onClose, onSubmit }: {
  initial: MembershipTemplate | null; submitting: boolean; onClose: () => void;
  onSubmit: (v: Partial<MembershipTemplate> & { tier: string; name: string }) => Promise<void>;
}) {
  const [f, setF] = useState({
    id: initial?.id, tier: initial?.tier ?? "gold", name: initial?.name ?? "",
    description: initial?.description ?? "", badge: initial?.badge ?? "",
    monthlyPrice: initial?.monthlyPrice ?? 0, includedCuts: initial?.includedCuts ?? 0,
    benefitsText: (initial?.benefits ?? []).join("\n"), isActive: initial?.isActive ?? true,
  });
  return (
    <Modal onClose={onClose} title={initial ? "Edit membership template" : "New membership template"}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Name" value={f.name} onChange={(v) => setF({ ...f, name: v })} placeholder="Gold" />
          <label className="block"><span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Tier</span>
            <select value={f.tier} onChange={(e) => setF({ ...f, tier: e.target.value })} className="mt-2 w-full rounded-md border bg-background px-4 py-3 text-sm">
              <option value="gold">Gold</option><option value="premium">Premium</option><option value="vip">VIP</option>
            </select>
          </label>
        </div>
        <Field label="Badge" value={f.badge} onChange={(v) => setF({ ...f, badge: v })} placeholder="Most popular" />
        <label className="block"><span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Description</span>
          <textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} rows={3} className="mt-2 w-full rounded-md border bg-background px-4 py-3 text-sm" />
        </label>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Monthly price" value={String(f.monthlyPrice)} onChange={(v) => setF({ ...f, monthlyPrice: Number(v) || 0 })} />
          <Field label="Included cuts" value={String(f.includedCuts)} onChange={(v) => setF({ ...f, includedCuts: Number(v) || 0 })} />
        </div>
        <label className="block"><span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Benefits (one per line)</span>
          <textarea value={f.benefitsText} onChange={(e) => setF({ ...f, benefitsText: e.target.value })} rows={4} className="mt-2 w-full rounded-md border bg-background px-4 py-3 text-sm" />
        </label>
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="rounded-full border px-4 py-2 text-sm">Cancel</button>
          <button disabled={!f.name || submitting} onClick={() => onSubmit({
            id: f.id, tier: f.tier, name: f.name, description: f.description, badge: f.badge,
            monthlyPrice: f.monthlyPrice, includedCuts: f.includedCuts || null,
            benefits: f.benefitsText.split("\n").map((b) => b.trim()).filter(Boolean),
            isActive: f.isActive,
          })} className="btn-luxury">{submitting ? "Saving…" : "Save"}</button>
        </div>
      </div>
    </Modal>
  );
}

/* ============== AUDIT ============== */

function AuditSection() {
  const list = useServerFn(listAuditLogs);
  const q = useQuery({ queryKey: ["audit"], queryFn: () => list({ data: { limit: 200 } }) });
  return (
    <div className="space-y-6 max-w-7xl">
      <header>
        <p className="eyebrow">Audit</p>
        <h1 className="font-display text-4xl mt-2">Activity log</h1>
        <p className="mt-2 text-sm text-muted-foreground">Recent platform actions — last 200 events.</p>
      </header>
      <div className="overflow-hidden rounded-2xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-[0.18em] text-muted-foreground">
            <tr>
              <th className="px-5 py-4">Time</th>
              <th className="px-5 py-4">Actor</th>
              <th className="px-5 py-4">Action</th>
              <th className="px-5 py-4">Tenant</th>
              <th className="px-5 py-4">Details</th>
            </tr>
          </thead>
          <tbody>
            {q.isLoading && <tr><td colSpan={5} className="px-5 py-10 text-center text-muted-foreground">Loading…</td></tr>}
            {q.data?.length === 0 && <tr><td colSpan={5} className="px-5 py-10 text-center text-muted-foreground">No activity recorded yet.</td></tr>}
            {q.data?.map((r) => (
              <tr key={r.id} className="border-t align-top">
                <td className="px-5 py-3 text-xs text-muted-foreground whitespace-nowrap">{new Date(r.createdAt).toLocaleString()}</td>
                <td className="px-5 py-3">{r.actorEmail ?? "—"}</td>
                <td className="px-5 py-3"><span className="rounded-full bg-muted px-2.5 py-1 text-xs">{r.action}</span></td>
                <td className="px-5 py-3">{r.businessName ?? "—"}</td>
                <td className="px-5 py-3 text-xs text-muted-foreground font-mono max-w-md truncate">{r.metadata && r.metadata !== "{}" ? r.metadata : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ============== SHARED ============== */

function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4" onClick={onClose}>
      <div className="w-full max-w-xl rounded-2xl bg-background border shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="font-display text-xl">{title}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="mt-2 w-full rounded-md border bg-background px-4 py-3 text-sm outline-none focus:border-[color:var(--bronze)]" />
    </label>
  );
}

function Chip({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} type="button"
      className={`rounded-full px-3 py-1.5 text-xs transition ${active ? "bg-[color:var(--bronze)] text-white" : "bg-background border hover:border-[color:var(--bronze)]"}`}>
      {children}
    </button>
  );
}