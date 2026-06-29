import { createFileRoute, Link, useRouter, redirect } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getBusinessAdminBundle,
  updateBusinessSettings,
  updateWebsiteContent,
  upsertService,
  deleteService,
  upsertMembership,
  deleteMembership,
  getOwnerOverview,
  type AdminPayload,
  type AdminService,
  type AdminMembership,
  type OwnerOverview,
} from "@/lib/business-admin.functions";
import {
  getSchedule, updateBusinessHours, addBlockedDate, removeBlockedDate,
  listAppointments, updateAppointmentStatus,
  type ScheduleBundle, type AppointmentRow,
} from "@/lib/booking.functions";
import { supabase } from "@/integrations/supabase/client";
import { getMyAccess } from "@/lib/access.functions";

export const Route = createFileRoute("/_authenticated/b/$slug/admin")({
  beforeLoad: async ({ params }) => {
    const access = await getMyAccess();
    const allowed = access.isSuperAdmin || access.businessSlugs.includes(params.slug);
    if (!allowed) throw redirect({ to: "/forbidden" });
    return { access };
  },
  head: ({ params }) => ({
    meta: [{ title: `Admin — ${params.slug}` }],
  }),
  errorComponent: ({ error }) => (
    <div className="min-h-screen flex items-center justify-center bg-background p-8">
      <div className="max-w-md text-center">
        <p className="eyebrow text-red-700">Access error</p>
        <h1 className="mt-3 font-display text-3xl">{error.message}</h1>
        <Link to="/admin" className="mt-6 inline-block btn-luxury">Back to platform</Link>
      </div>
    </div>
  ),
  notFoundComponent: () => <div className="p-12">Not found</div>,
  component: BusinessAdmin,
});

type Tab = "overview" | "site" | "services" | "memberships" | "schedule" | "agenda" | "settings";

const TABS: { id: Tab; label: string; icon: string; desc: string }[] = [
  { id: "overview",    label: "Resumen",     icon: "◆", desc: "KPIs y próximas citas" },
  { id: "agenda",      label: "Agenda",      icon: "▦", desc: "Citas confirmadas" },
  { id: "schedule",    label: "Horarios",    icon: "◷", desc: "Disponibilidad" },
  { id: "services",    label: "Servicios",   icon: "✂", desc: "Catálogo y precios" },
  { id: "memberships", label: "Membresías",  icon: "◈", desc: "Planes activos" },
  { id: "site",        label: "Sitio web",   icon: "❖", desc: "Contenido público" },
  { id: "settings",    label: "Ajustes",     icon: "⚙", desc: "Datos del negocio" },
];

function BusinessAdmin() {
  const { slug } = Route.useParams();
  const router = useRouter();
  const qc = useQueryClient();
  const fetchBundle = useServerFn(getBusinessAdminBundle);

  const q = useQuery({
    queryKey: ["admin", "bundle", slug],
    queryFn: () => fetchBundle({ data: { slug } }),
  });

  const [tab, setTab] = useState<Tab>("overview");

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  }

  if (q.isLoading) return <div className="min-h-screen flex items-center justify-center">Loading…</div>;
  if (q.error) throw q.error;
  const bundle = q.data as AdminPayload;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container-luxury flex items-center justify-between py-5">
          <div className="flex items-center gap-4">
            <Link to="/admin" className="text-xs uppercase tracking-[0.18em] text-muted-foreground">← Platform</Link>
            <div>
              <p className="eyebrow">{bundle.business.city ?? ""}</p>
              <h1 className="font-display text-2xl">{bundle.business.name}</h1>
            </div>
            <span className={`ml-3 rounded-full px-3 py-1 text-xs ${
              bundle.business.status === "published" ? "bg-emerald-100 text-emerald-800"
              : bundle.business.status === "suspended" ? "bg-red-100 text-red-800"
              : "bg-amber-100 text-amber-800"}`}>{bundle.business.status}</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/b/$slug" params={{ slug }} className="rounded-full border px-4 py-2 text-xs uppercase tracking-[0.18em]">View site →</Link>
            <button onClick={signOut} className="rounded-full border px-4 py-2 text-xs uppercase tracking-[0.18em]">Sign out</button>
          </div>
        </div>
        <nav className="container-luxury -mx-2 flex gap-1 overflow-x-auto px-2 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`shrink-0 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs uppercase tracking-[0.18em] transition ${tab === t.id ? "bg-[color:var(--bronze)] text-white shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"}`}>
              <span aria-hidden className="text-sm">{t.icon}</span>{t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="container-luxury py-10">
        {tab === "overview" && <OverviewPanel slug={slug} bundle={bundle} onJump={setTab} />}
        {tab === "site" && <SiteEditor bundle={bundle} onSaved={() => q.refetch()} />}
        {tab === "services" && <ServicesEditor bundle={bundle} onSaved={() => q.refetch()} />}
        {tab === "memberships" && <MembershipsEditor bundle={bundle} onSaved={() => q.refetch()} />}
        {tab === "schedule" && <ScheduleEditor slug={slug} />}
        {tab === "agenda" && <AgendaView slug={slug} />}
        {tab === "settings" && <SettingsEditor bundle={bundle} onSaved={() => q.refetch()} />}
      </main>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text" }:
  { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="mt-2 w-full rounded-md border bg-background px-4 py-3 text-sm outline-none focus:border-[color:var(--bronze)]" />
    </label>
  );
}

function TextArea({ label, value, onChange, rows = 3 }: { label: string; value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</span>
      <textarea value={value} rows={rows} onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-md border bg-background px-4 py-3 text-sm outline-none focus:border-[color:var(--bronze)]" />
    </label>
  );
}

/* -------------------- OVERVIEW -------------------- */
function fmtCurrency(n: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

function OverviewPanel({ slug, bundle, onJump }: { slug: string; bundle: AdminPayload; onJump: (t: Tab) => void }) {
  const fetchOverview = useServerFn(getOwnerOverview);
  const q = useQuery({
    queryKey: ["owner-overview", slug],
    queryFn: () => fetchOverview({ data: { slug } }),
  });

  const o = q.data as OwnerOverview | undefined;

  const cards = [
    { label: "Ingresos estimados (30d)", value: o ? fmtCurrency(o.estimatedRevenue30d) : "—", hint: o ? `${o.completedCount30d} citas completadas` : "" },
    { label: "Citas hoy",                 value: o ? String(o.todayCount) : "—",               hint: o ? `${o.upcomingCount} próximas` : "" },
    { label: "Membresías activas",        value: o ? String(o.activeMemberships) : "—",        hint: o ? `MRR ${fmtCurrency(o.mrrEstimate)}` : "" },
    { label: "Clientes nuevos (30d)",     value: o ? String(o.newCustomers30d) : "—",          hint: `${bundle.services.length} servicios · ${bundle.memberships.length} planes` },
  ];

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border bg-gradient-to-br from-card to-secondary/40 p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Bienvenido</p>
            <h2 className="font-display text-3xl">{bundle.business.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">Resumen del negocio en tiempo real.</p>
          </div>
          <div className="flex gap-2">
            <Link to="/b/$slug" params={{ slug }} className="rounded-full border px-4 py-2 text-xs uppercase tracking-[0.18em] hover:bg-secondary/60">Ver sitio público ↗</Link>
            <button onClick={() => onJump("agenda")} className="btn-luxury">Abrir agenda</button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border bg-card p-6">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{c.label}</p>
            <p className="mt-3 font-display text-3xl">{q.isLoading ? <span className="inline-block h-7 w-20 animate-pulse rounded bg-secondary" /> : c.value}</p>
            {c.hint && <p className="mt-2 text-xs text-muted-foreground">{c.hint}</p>}
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-2xl border bg-card overflow-hidden">
          <header className="flex items-center justify-between border-b px-6 py-4">
            <div>
              <h3 className="font-display text-xl">Próximas citas</h3>
              <p className="text-xs text-muted-foreground">Las siguientes 6 reservas.</p>
            </div>
            <button onClick={() => onJump("agenda")} className="text-xs uppercase tracking-[0.18em] text-[color:var(--bronze)]">Ver todas →</button>
          </header>
          {q.isLoading ? (
            <div className="p-6 text-sm text-muted-foreground">Cargando…</div>
          ) : !o || o.upcoming.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">No hay citas próximas.</div>
          ) : (
            <ul className="divide-y divide-border">
              {o.upcoming.map((a) => {
                const d = new Date(a.startsAt);
                return (
                  <li key={a.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-4 px-6 py-4">
                    <div className="min-w-[64px]">
                      <p className="font-display text-lg leading-none">{d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</p>
                      <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{d.toLocaleDateString(undefined, { day: "numeric", month: "short" })}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{a.customerName}</p>
                      <p className="truncate text-xs text-muted-foreground">{a.serviceName ?? "—"}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.18em] ${a.status === "confirmed" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{a.status}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border bg-card p-6">
          <h3 className="font-display text-xl">Atajos</h3>
          <p className="mt-1 text-xs text-muted-foreground">Acciones más usadas.</p>
          <div className="mt-5 grid gap-2">
            {TABS.filter((t) => t.id !== "overview").map((t) => (
              <button key={t.id} onClick={() => onJump(t.id)}
                className="group flex items-center justify-between rounded-xl border bg-background px-4 py-3 text-left transition hover:border-[color:var(--bronze)] hover:bg-secondary/40">
                <span className="flex items-center gap-3">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-sm">{t.icon}</span>
                  <span>
                    <span className="block text-sm font-medium">{t.label}</span>
                    <span className="block text-xs text-muted-foreground">{t.desc}</span>
                  </span>
                </span>
                <span className="text-muted-foreground group-hover:text-[color:var(--bronze)]">→</span>
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

/* -------------------- SITE -------------------- */
function SiteEditor({ bundle, onSaved }: { bundle: AdminPayload; onSaved: () => void }) {
  const save = useServerFn(updateWebsiteContent);
  const [form, setForm] = useState({
    hero_eyebrow: bundle.content.heroEyebrow ?? "",
    hero_title: bundle.content.heroTitle ?? "",
    hero_subtitle: bundle.content.heroSubtitle ?? "",
    hero_image_url: bundle.content.heroImageUrl ?? "",
    about_title: bundle.content.aboutTitle ?? "",
    about_body: bundle.content.aboutBody ?? "",
    gallery: bundle.content.gallery.join("\n"),
  });
  const m = useMutation({
    mutationFn: () => save({ data: { businessId: bundle.business.id, patch: {
      hero_eyebrow: form.hero_eyebrow || null,
      hero_title: form.hero_title || null,
      hero_subtitle: form.hero_subtitle || null,
      hero_image_url: form.hero_image_url || null,
      about_title: form.about_title || null,
      about_body: form.about_body || null,
      gallery: form.gallery.split("\n").map((s) => s.trim()).filter(Boolean),
    } } }),
    onSuccess: onSaved,
  });

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border bg-card p-8">
        <h2 className="font-display text-2xl">Hero</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Field label="Eyebrow" value={form.hero_eyebrow} onChange={(v) => setForm({ ...form, hero_eyebrow: v })} placeholder="Private grooming house" />
          <Field label="Hero image URL" value={form.hero_image_url} onChange={(v) => setForm({ ...form, hero_image_url: v })} placeholder="https://…" />
          <div className="md:col-span-2"><Field label="Title" value={form.hero_title} onChange={(v) => setForm({ ...form, hero_title: v })} placeholder="Premium grooming experience" /></div>
          <div className="md:col-span-2"><TextArea label="Subtitle" value={form.hero_subtitle} onChange={(v) => setForm({ ...form, hero_subtitle: v })} /></div>
        </div>
      </section>

      <section className="rounded-2xl border bg-card p-8">
        <h2 className="font-display text-2xl">About</h2>
        <div className="mt-6 grid gap-4">
          <Field label="About title" value={form.about_title} onChange={(v) => setForm({ ...form, about_title: v })} />
          <TextArea label="About body" value={form.about_body} onChange={(v) => setForm({ ...form, about_body: v })} rows={5} />
        </div>
      </section>

      <section className="rounded-2xl border bg-card p-8">
        <h2 className="font-display text-2xl">Gallery</h2>
        <p className="mt-1 text-sm text-muted-foreground">One image URL per line.</p>
        <TextArea label="Gallery URLs" value={form.gallery} onChange={(v) => setForm({ ...form, gallery: v })} rows={6} />
      </section>

      <div className="flex items-center justify-end gap-3">
        {m.error && <p className="text-sm text-red-600">{(m.error as Error).message}</p>}
        {m.isSuccess && <p className="text-sm text-emerald-700">Saved ✓</p>}
        <button onClick={() => m.mutate()} disabled={m.isPending} className="btn-luxury">
          {m.isPending ? "Saving…" : "Save website"}
        </button>
      </div>
    </div>
  );
}

/* -------------------- SCHEDULE -------------------- */
const WEEKDAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

function ScheduleEditor({ slug }: { slug: string }) {
  const fetchSched = useServerFn(getSchedule);
  const saveHours = useServerFn(updateBusinessHours);
  const addBlock = useServerFn(addBlockedDate);
  const rmBlock = useServerFn(removeBlockedDate);
  const q = useQuery({ queryKey: ["sched", slug], queryFn: () => fetchSched({ data: { slug } }) });
  const [hours, setHours] = useState<ScheduleBundle["hours"] | null>(null);
  const [newDate, setNewDate] = useState("");
  const [newReason, setNewReason] = useState("");

  if (q.isLoading) return <p>Loading…</p>;
  if (q.error) return <p className="text-red-600">{(q.error as Error).message}</p>;
  const data = (hours ? { ...q.data!, hours } : q.data!) as ScheduleBundle;

  function patchDay(i: number, patch: Partial<ScheduleBundle["hours"][number]>) {
    const next = data.hours.map((h, idx) => idx === i ? { ...h, ...patch } : h);
    setHours(next);
  }

  const saveMut = useMutation({
    mutationFn: () => saveHours({ data: { slug, hours: data.hours } }),
    onSuccess: () => { setHours(null); q.refetch(); },
  });
  const addMut = useMutation({
    mutationFn: () => addBlock({ data: { slug, date: newDate, reason: newReason || undefined } }),
    onSuccess: () => { setNewDate(""); setNewReason(""); q.refetch(); },
  });
  const rmMut = useMutation({
    mutationFn: (id: string) => rmBlock({ data: { slug, id } }),
    onSuccess: () => q.refetch(),
  });

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border bg-card p-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl">Business hours</h2>
            <p className="mt-1 text-sm text-muted-foreground">Available booking slots are calculated from these hours.</p>
          </div>
          <button onClick={() => saveMut.mutate()} disabled={saveMut.isPending || !hours} className="btn-luxury">
            {saveMut.isPending ? "Saving…" : "Save hours"}
          </button>
        </div>
        <div className="mt-6 divide-y divide-border">
          {data.hours.map((h, i) => (
            <div key={h.weekday} className="grid grid-cols-[120px_80px_1fr_1fr_1fr_1fr] items-center gap-3 py-3 text-sm">
              <span className="font-medium">{WEEKDAYS[h.weekday]}</span>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={h.isOpen} onChange={(e) => patchDay(i, { isOpen: e.target.checked })} />
                <span className="text-xs text-muted-foreground">Open</span>
              </label>
              <TimeInput label="Open" value={h.open ?? ""} disabled={!h.isOpen} onChange={(v) => patchDay(i, { open: v || null })} />
              <TimeInput label="Close" value={h.close ?? ""} disabled={!h.isOpen} onChange={(v) => patchDay(i, { close: v || null })} />
              <TimeInput label="Break start" value={h.breakStart ?? ""} disabled={!h.isOpen} onChange={(v) => patchDay(i, { breakStart: v || null })} />
              <TimeInput label="Break end" value={h.breakEnd ?? ""} disabled={!h.isOpen} onChange={(v) => patchDay(i, { breakEnd: v || null })} />
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border bg-card p-8">
        <h2 className="font-display text-2xl">Blocked dates</h2>
        <p className="mt-1 text-sm text-muted-foreground">Holidays, closures, off days. No bookings will be accepted on these dates.</p>
        <div className="mt-6 flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Date</span>
            <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="mt-2 rounded-md border bg-background px-4 py-3 text-sm" />
          </label>
          <label className="block flex-1 min-w-[200px]">
            <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Reason (optional)</span>
            <input value={newReason} onChange={(e) => setNewReason(e.target.value)} placeholder="Holiday" className="mt-2 w-full rounded-md border bg-background px-4 py-3 text-sm" />
          </label>
          <button disabled={!newDate || addMut.isPending} onClick={() => addMut.mutate()} className="btn-luxury">Add</button>
        </div>
        <ul className="mt-6 divide-y divide-border">
          {data.blocked.length === 0 && <li className="py-4 text-sm text-muted-foreground">No blocked dates.</li>}
          {data.blocked.map((b) => (
            <li key={b.id} className="flex items-center justify-between py-3 text-sm">
              <span><strong className="font-display">{new Date(b.date + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "long", year: "numeric" })}</strong>{b.reason ? ` · ${b.reason}` : ""}</span>
              <button onClick={() => rmMut.mutate(b.id)} className="text-xs uppercase tracking-[0.18em] text-red-700">Remove</button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function TimeInput({ label, value, onChange, disabled }: { label: string; value: string; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</span>
      <input type="time" value={value?.slice(0,5) ?? ""} disabled={disabled} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-40" />
    </label>
  );
}

/* -------------------- AGENDA -------------------- */
function AgendaView({ slug }: { slug: string }) {
  const fetchAppts = useServerFn(listAppointments);
  const updateStatus = useServerFn(updateAppointmentStatus);
  const [from, setFrom] = useState(new Date().toISOString().slice(0,10));
  const q = useQuery({
    queryKey: ["appts", slug, from],
    queryFn: () => fetchAppts({ data: { slug, from: new Date(from + "T00:00:00").toISOString() } }),
  });
  const statusMut = useMutation({
    mutationFn: (v: { id: string; status: "confirmed"|"cancelled"|"completed"|"no_show" }) => updateStatus({ data: { slug, ...v } }),
    onSuccess: () => q.refetch(),
  });

  const grouped = useMemo<[string, AppointmentRow[]][]>(() => {
    const map = new Map<string, AppointmentRow[]>();
    for (const a of q.data ?? []) {
      const k = a.startsAt.slice(0, 10);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(a);
    }
    return Array.from(map.entries()).sort(([a],[b]) => a.localeCompare(b));
  }, [q.data]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between rounded-2xl border bg-card p-6">
        <div>
          <h2 className="font-display text-2xl">Agenda</h2>
          <p className="mt-1 text-sm text-muted-foreground">All upcoming appointments. Updates happen in real time.</p>
        </div>
        <label className="block">
          <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">From</span>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-2 rounded-md border bg-background px-3 py-2 text-sm" />
        </label>
      </div>

      {q.isLoading && <p>Loading…</p>}
      {q.data && q.data.length === 0 && <div className="rounded-2xl border bg-card p-10 text-center text-muted-foreground">No appointments scheduled.</div>}

      {grouped.map(([day, list]: [string, AppointmentRow[]]) => (
        <section key={day} className="rounded-2xl border bg-card overflow-hidden">
          <header className="border-b bg-secondary/50 px-6 py-3">
            <p className="font-display text-lg">{new Date(day + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}</p>
          </header>
          <ul className="divide-y divide-border">
            {list.map((a: AppointmentRow) => (
              <li key={a.id} className="grid grid-cols-[80px_1fr_auto] items-center gap-4 px-6 py-4">
                <div>
                  <p className="font-display text-xl">{new Date(a.startsAt).toLocaleTimeString(undefined,{hour:"2-digit",minute:"2-digit"})}</p>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">→ {new Date(a.endsAt).toLocaleTimeString(undefined,{hour:"2-digit",minute:"2-digit"})}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold">{a.customerName} <span className="ml-2 text-muted-foreground font-normal">{a.serviceName ?? ""}</span></p>
                  <p className="text-xs text-muted-foreground">{a.customerPhone}{a.customerEmail ? ` · ${a.customerEmail}` : ""}</p>
                  {a.notes && <p className="mt-1 text-xs text-muted-foreground italic">"{a.notes}"</p>}
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={a.status} />
                  <select
                    value={a.status}
                    onChange={(e) => statusMut.mutate({ id: a.id, status: e.target.value as any })}
                    className="rounded-md border bg-background px-2 py-1 text-xs"
                  >
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="no_show">No-show</option>
                  </select>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string,string> = {
    pending: "bg-amber-100 text-amber-800",
    confirmed: "bg-emerald-100 text-emerald-800",
    completed: "bg-blue-100 text-blue-800",
    cancelled: "bg-red-100 text-red-800",
    no_show: "bg-zinc-200 text-zinc-700",
  };
  return <span className={`rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.18em] ${map[status] ?? "bg-zinc-100"}`}>{status}</span>;
}

/* -------------------- SERVICES -------------------- */
function ServicesEditor({ bundle, onSaved }: { bundle: AdminPayload; onSaved: () => void }) {
  const save = useServerFn(upsertService);
  const del = useServerFn(deleteService);
  const [edit, setEdit] = useState<Partial<AdminService> | null>(null);

  const saveMut = useMutation({
    mutationFn: (s: Partial<AdminService>) => save({ data: { businessId: bundle.business.id, service: {
      id: s.id, name: s.name!, description: s.description ?? null, category: s.category ?? null,
      duration_min: s.durationMin ?? 30, price: s.price ?? 0, image_url: s.imageUrl ?? null,
      is_active: s.isActive ?? true, sort_order: s.sortOrder ?? 0,
    } } }),
    onSuccess: () => { setEdit(null); onSaved(); },
  });
  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { businessId: bundle.business.id, id } }),
    onSuccess: onSaved,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-3xl">Services</h2>
        <button onClick={() => setEdit({ name: "", durationMin: 30, price: 0, isActive: true, sortOrder: bundle.services.length })} className="btn-luxury">+ New service</button>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-[0.18em] text-muted-foreground">
            <tr><th className="px-6 py-4">Name</th><th className="px-6 py-4">Duration</th><th className="px-6 py-4">Price</th><th className="px-6 py-4">Active</th><th className="px-6 py-4 text-right">Actions</th></tr>
          </thead>
          <tbody>
            {bundle.services.length === 0 && <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">No services yet.</td></tr>}
            {bundle.services.map((s) => (
              <tr key={s.id} className="border-t">
                <td className="px-6 py-4 font-medium">{s.name}</td>
                <td className="px-6 py-4">{s.durationMin} min</td>
                <td className="px-6 py-4">${s.price.toFixed(2)}</td>
                <td className="px-6 py-4">{s.isActive ? "Yes" : "No"}</td>
                <td className="px-6 py-4 text-right">
                  <div className="inline-flex gap-2">
                    <button onClick={() => setEdit(s)} className="rounded-full border px-3 py-1 text-xs">Edit</button>
                    <button onClick={() => { if (confirm("Delete?")) delMut.mutate(s.id); }} className="rounded-full border border-red-300 text-red-700 px-3 py-1 text-xs">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {edit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/40 p-4" onClick={() => setEdit(null)}>
          <div className="w-full max-w-2xl rounded-2xl border bg-card p-8" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-2xl">{edit.id ? "Edit service" : "New service"}</h3>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2"><Field label="Name" value={edit.name ?? ""} onChange={(v) => setEdit({ ...edit, name: v })} /></div>
              <Field label="Category" value={edit.category ?? ""} onChange={(v) => setEdit({ ...edit, category: v })} />
              <Field label="Image URL" value={edit.imageUrl ?? ""} onChange={(v) => setEdit({ ...edit, imageUrl: v })} />
              <Field label="Duration (min)" type="number" value={String(edit.durationMin ?? 30)} onChange={(v) => setEdit({ ...edit, durationMin: Number(v) })} />
              <Field label="Price" type="number" value={String(edit.price ?? 0)} onChange={(v) => setEdit({ ...edit, price: Number(v) })} />
              <div className="md:col-span-2"><TextArea label="Description" value={edit.description ?? ""} onChange={(v) => setEdit({ ...edit, description: v })} /></div>
              <label className="flex items-center gap-2 md:col-span-2 text-sm">
                <input type="checkbox" checked={edit.isActive ?? true} onChange={(e) => setEdit({ ...edit, isActive: e.target.checked })} />
                Active (visible on website)
              </label>
            </div>
            <div className="mt-8 flex justify-end gap-3">
              {saveMut.error && <p className="text-sm text-red-600">{(saveMut.error as Error).message}</p>}
              <button onClick={() => setEdit(null)} className="rounded-full border px-4 py-2 text-xs uppercase tracking-[0.18em]">Cancel</button>
              <button onClick={() => saveMut.mutate(edit)} disabled={saveMut.isPending || !edit.name} className="btn-luxury">
                {saveMut.isPending ? "Saving…" : "Save service"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------- MEMBERSHIPS -------------------- */
function MembershipsEditor({ bundle, onSaved }: { bundle: AdminPayload; onSaved: () => void }) {
  const save = useServerFn(upsertMembership);
  const del = useServerFn(deleteMembership);
  const [edit, setEdit] = useState<(Partial<AdminMembership> & { benefitsText?: string }) | null>(null);

  const saveMut = useMutation({
    mutationFn: (m: Partial<AdminMembership> & { benefitsText?: string }) => save({ data: { businessId: bundle.business.id, membership: {
      id: m.id, name: m.name!, price: m.price ?? 0, included_cuts: m.includedCuts ?? null,
      benefits: (m.benefitsText ?? "").split("\n").map((s) => s.trim()).filter(Boolean),
      badge: m.badge ?? null, highlighted: m.highlighted ?? false,
      is_active: m.isActive ?? true, sort_order: m.sortOrder ?? 0,
    } } }),
    onSuccess: () => { setEdit(null); onSaved(); },
  });
  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { businessId: bundle.business.id, id } }),
    onSuccess: onSaved,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-3xl">Memberships</h2>
        <button onClick={() => setEdit({ name: "", price: 0, isActive: true, sortOrder: bundle.memberships.length, benefitsText: "" })} className="btn-luxury">+ New tier</button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {bundle.memberships.length === 0 && <p className="text-muted-foreground">No memberships yet.</p>}
        {bundle.memberships.map((m) => (
          <div key={m.id} className={`rounded-2xl border bg-card p-6 ${m.highlighted ? "ring-2 ring-[color:var(--bronze)]" : ""}`}>
            <div className="flex items-start justify-between">
              <div>
                {m.badge && <p className="eyebrow">{m.badge}</p>}
                <h3 className="font-display text-2xl">{m.name}</h3>
              </div>
              <span className="font-display text-2xl">${m.price.toFixed(0)}</span>
            </div>
            <ul className="mt-4 space-y-1 text-sm text-muted-foreground">
              {m.benefits.map((b, i) => <li key={i}>• {b}</li>)}
            </ul>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setEdit({ ...m, benefitsText: m.benefits.join("\n") })} className="rounded-full border px-3 py-1 text-xs">Edit</button>
              <button onClick={() => { if (confirm("Delete?")) delMut.mutate(m.id); }} className="rounded-full border border-red-300 text-red-700 px-3 py-1 text-xs">Delete</button>
            </div>
          </div>
        ))}
      </div>

      {edit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/40 p-4" onClick={() => setEdit(null)}>
          <div className="w-full max-w-2xl rounded-2xl border bg-card p-8" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-2xl">{edit.id ? "Edit membership" : "New membership"}</h3>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Field label="Name" value={edit.name ?? ""} onChange={(v) => setEdit({ ...edit, name: v })} />
              <Field label="Badge" value={edit.badge ?? ""} onChange={(v) => setEdit({ ...edit, badge: v })} placeholder="Most popular" />
              <Field label="Monthly price" type="number" value={String(edit.price ?? 0)} onChange={(v) => setEdit({ ...edit, price: Number(v) })} />
              <Field label="Included cuts" type="number" value={String(edit.includedCuts ?? 0)} onChange={(v) => setEdit({ ...edit, includedCuts: Number(v) })} />
              <div className="md:col-span-2"><TextArea label="Benefits (one per line)" rows={6} value={edit.benefitsText ?? ""} onChange={(v) => setEdit({ ...edit, benefitsText: v })} /></div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={edit.highlighted ?? false} onChange={(e) => setEdit({ ...edit, highlighted: e.target.checked })} /> Highlighted
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={edit.isActive ?? true} onChange={(e) => setEdit({ ...edit, isActive: e.target.checked })} /> Active
              </label>
            </div>
            <div className="mt-8 flex justify-end gap-3">
              {saveMut.error && <p className="text-sm text-red-600">{(saveMut.error as Error).message}</p>}
              <button onClick={() => setEdit(null)} className="rounded-full border px-4 py-2 text-xs uppercase tracking-[0.18em]">Cancel</button>
              <button onClick={() => saveMut.mutate(edit)} disabled={saveMut.isPending || !edit.name} className="btn-luxury">
                {saveMut.isPending ? "Saving…" : "Save tier"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------- SETTINGS -------------------- */
function SettingsEditor({ bundle, onSaved }: { bundle: AdminPayload; onSaved: () => void }) {
  const save = useServerFn(updateBusinessSettings);
  const [form, setForm] = useState({
    name: bundle.business.name,
    tagline: bundle.business.tagline ?? "",
    city: bundle.business.city ?? "",
    address: bundle.business.address ?? "",
    phone: bundle.business.phone ?? "",
    whatsapp: bundle.business.whatsapp ?? "",
    email: bundle.business.email ?? "",
    instagram: bundle.business.instagram ?? "",
    logo_url: bundle.business.logoUrl ?? "",
    primary_color: bundle.business.primaryColor ?? "",
    accent_color: bundle.business.accentColor ?? "",
  });
  const m = useMutation({
    mutationFn: () => save({ data: { businessId: bundle.business.id, patch: {
      name: form.name, tagline: form.tagline || null, city: form.city || null,
      address: form.address || null, phone: form.phone || null, whatsapp: form.whatsapp || null,
      email: form.email || null, instagram: form.instagram || null,
      logo_url: form.logo_url || null, primary_color: form.primary_color || null,
      accent_color: form.accent_color || null,
    } } }),
    onSuccess: onSaved,
  });

  return (
    <div className="space-y-6">
      <h2 className="font-display text-3xl">Business settings</h2>
      <section className="rounded-2xl border bg-card p-8 grid gap-4 md:grid-cols-2">
        <Field label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
        <Field label="Tagline" value={form.tagline} onChange={(v) => setForm({ ...form, tagline: v })} />
        <Field label="City" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
        <Field label="Address" value={form.address} onChange={(v) => setForm({ ...form, address: v })} />
        <Field label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
        <Field label="WhatsApp" value={form.whatsapp} onChange={(v) => setForm({ ...form, whatsapp: v })} placeholder="+1..." />
        <Field label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
        <Field label="Instagram" value={form.instagram} onChange={(v) => setForm({ ...form, instagram: v })} />
        <Field label="Logo URL" value={form.logo_url} onChange={(v) => setForm({ ...form, logo_url: v })} />
        <Field label="Primary color" value={form.primary_color} onChange={(v) => setForm({ ...form, primary_color: v })} placeholder="#B0844A" />
        <Field label="Accent color" value={form.accent_color} onChange={(v) => setForm({ ...form, accent_color: v })} placeholder="#EFE6D6" />
      </section>
      <div className="flex items-center justify-end gap-3">
        {m.error && <p className="text-sm text-red-600">{(m.error as Error).message}</p>}
        {m.isSuccess && <p className="text-sm text-emerald-700">Saved ✓</p>}
        <button onClick={() => m.mutate()} disabled={m.isPending} className="btn-luxury">
          {m.isPending ? "Saving…" : "Save settings"}
        </button>
      </div>
    </div>
  );
}