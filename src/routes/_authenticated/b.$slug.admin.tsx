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
  listCustomers,
  upsertCustomer,
  deleteCustomer,
  getCustomerDetail,
  listStaff,
  upsertStaff,
  deleteStaff,
  type AdminPayload,
  type AdminService,
  type AdminMembership,
  type AdminCustomer,
  type AdminStaff,
  type OwnerOverview,
} from "@/lib/business-admin.functions";
import {
  getSchedule, updateBusinessHours, addBlockedDate, removeBlockedDate,
  listAppointments, updateAppointmentStatus, createAppointmentAdmin,
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

type Tab = "overview" | "site" | "services" | "memberships" | "schedule" | "agenda" | "customers" | "staff" | "settings";

const TABS: { id: Tab; label: string; icon: string; desc: string }[] = [
  { id: "overview",    label: "Resumen",     icon: "◆", desc: "KPIs y próximas citas" },
  { id: "agenda",      label: "Agenda",      icon: "▦", desc: "Citas confirmadas" },
  { id: "customers",   label: "Clientes",    icon: "◉", desc: "CRM de clientes" },
  { id: "schedule",    label: "Horarios",    icon: "◷", desc: "Disponibilidad" },
  { id: "services",    label: "Servicios",   icon: "✂", desc: "Catálogo y precios" },
  { id: "memberships", label: "Membresías",  icon: "◈", desc: "Planes activos" },
  { id: "staff",       label: "Equipo",      icon: "◎", desc: "Barberos y staff" },
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
      <header className="sticky top-0 z-30 border-b bg-card/85 backdrop-blur supports-[backdrop-filter]:bg-card/70">
        <div className="container-luxury grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3 sm:py-4">
          <div className="flex min-w-0 items-center gap-3">
            <Link to="/admin" aria-label="Platform"
              className="shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-full border text-sm text-muted-foreground hover:bg-secondary/60">←</Link>
            <div className="min-w-0">
              <p className="eyebrow truncate text-[10px]">{bundle.business.city ?? "Owner panel"}</p>
              <div className="flex min-w-0 items-center gap-2">
                <h1 className="truncate font-display text-lg sm:text-2xl">{bundle.business.name}</h1>
                <span className={`hidden shrink-0 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.15em] sm:inline ${
                  bundle.business.status === "published" ? "bg-emerald-100 text-emerald-800"
                  : bundle.business.status === "suspended" ? "bg-red-100 text-red-800"
                  : "bg-amber-100 text-amber-800"}`}>{bundle.business.status}</span>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link to="/b/$slug" params={{ slug }}
              className="hidden rounded-full border px-4 py-2 text-xs uppercase tracking-[0.18em] hover:bg-secondary/60 md:inline-block">
              Ver sitio ↗
            </Link>
            <Link to="/b/$slug" params={{ slug }} aria-label="Ver sitio"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border text-sm md:hidden">↗</Link>
            <button onClick={signOut}
              className="rounded-full border px-3 py-2 text-[11px] uppercase tracking-[0.18em] hover:bg-secondary/60 sm:px-4">
              Salir
            </button>
          </div>
        </div>
        <div className="border-t bg-card/70">
          <nav aria-label="Secciones"
            className="container-luxury -mx-2 flex gap-1 overflow-x-auto px-2 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {TABS.map((t) => {
              const active = tab === t.id;
              return (
                <button key={t.id} onClick={() => setTab(t.id)} aria-current={active ? "page" : undefined}
                  className={`group relative shrink-0 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs uppercase tracking-[0.18em] transition ${
                    active
                      ? "bg-[color:var(--bronze)] text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                  }`}>
                  <span aria-hidden className="text-sm">{t.icon}</span>
                  <span>{t.label}</span>
                  {active && (
                    <span aria-hidden className="absolute -bottom-2 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[color:var(--bronze)]" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>
        <div className="container-luxury px-4 pb-2 pt-1 text-[11px] text-muted-foreground sm:hidden">
          {TABS.find((t) => t.id === tab)?.desc}
        </div>
      </header>

      <main className="container-luxury py-10">
        {tab === "overview" && <OverviewPanel slug={slug} bundle={bundle} onJump={setTab} />}
        {tab === "site" && <SiteEditor bundle={bundle} onSaved={() => q.refetch()} />}
        {tab === "services" && <ServicesEditor bundle={bundle} onSaved={() => q.refetch()} />}
        {tab === "memberships" && <MembershipsEditor bundle={bundle} onSaved={() => q.refetch()} />}
        {tab === "schedule" && <ScheduleEditor slug={slug} />}
        {tab === "agenda" && <AgendaView slug={slug} />}
        {tab === "customers" && <CustomersPanel slug={slug} />}
        {tab === "staff" && <StaffPanel slug={slug} />}
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

        <div className="space-y-6">
          {/* Top servicios */}
          <div className="rounded-2xl border bg-card p-6">
            <h3 className="font-display text-xl">Top servicios</h3>
            <p className="mt-1 text-xs text-muted-foreground">Más solicitados (citas completadas).</p>
            {q.isLoading ? (
              <div className="mt-4 space-y-2">
                {[1,2,3].map((i) => <div key={i} className="h-5 animate-pulse rounded bg-secondary" />)}
              </div>
            ) : !o || o.topServices.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">Sin datos aún.</p>
            ) : (
              <ul className="mt-4 space-y-2">
                {o.topServices.map((s, i) => {
                  const maxCount = o.topServices[0].count;
                  const pct = Math.round((s.count / maxCount) * 100);
                  return (
                    <li key={s.serviceName} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium truncate">{i + 1}. {s.serviceName}</span>
                        <span className="ml-3 shrink-0 text-muted-foreground">{s.count} citas</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div className="h-full rounded-full bg-[color:var(--bronze)]" style={{ width: `${pct}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Atajos */}
          <div className="rounded-2xl border bg-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-xl">Atajos</h3>
                <p className="mt-1 text-xs text-muted-foreground">Salta a cualquier sección.</p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2">
              {TABS.filter((t) => t.id !== "overview").slice(0, 6).map((t) => (
                <button key={t.id} onClick={() => onJump(t.id)}
                  className="group flex flex-col items-start gap-1.5 rounded-xl border bg-background p-3 text-left transition hover:-translate-y-0.5 hover:border-[color:var(--bronze)] hover:shadow-sm">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-base">{t.icon}</span>
                  <span className="block text-xs font-medium">{t.label}</span>
                  <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground group-hover:text-[color:var(--bronze)]">Abrir →</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

/* -------------------- SITE -------------------- */
type Stat = { value: string; label: string };
type Pillar = { icon: string; title: string };
type Testimonial = { name: string; role: string; quote: string; rating: number };

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
  const [stats, setStats] = useState<Stat[]>(
    bundle.content.stats.length > 0
      ? bundle.content.stats
      : [{ value: "500+", label: "Happy clients" }, { value: "10+", label: "Years" }],
  );
  const [pillars, setPillars] = useState<Pillar[]>(
    bundle.content.pillars.length > 0
      ? bundle.content.pillars
      : [{ icon: "scissors", title: "Precision cuts" }, { icon: "crown", title: "Premium service" }],
  );
  const [testimonials, setTestimonials] = useState<Testimonial[]>(
    bundle.content.testimonials.length > 0
      ? bundle.content.testimonials
      : [],
  );

  const m = useMutation({
    mutationFn: () => save({ data: { businessId: bundle.business.id, patch: {
      hero_eyebrow: form.hero_eyebrow || null,
      hero_title: form.hero_title || null,
      hero_subtitle: form.hero_subtitle || null,
      hero_image_url: form.hero_image_url || null,
      about_title: form.about_title || null,
      about_body: form.about_body || null,
      gallery: form.gallery.split("\n").map((s) => s.trim()).filter(Boolean),
      stats,
      pillars,
      testimonials,
    } } }),
    onSuccess: onSaved,
  });

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="rounded-2xl border bg-card p-8">
        <h2 className="font-display text-2xl">Hero</h2>
        <p className="mt-1 text-sm text-muted-foreground">La sección principal visible al llegar al sitio.</p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Field label="Eyebrow (texto pequeño)" value={form.hero_eyebrow} onChange={(v) => setForm({ ...form, hero_eyebrow: v })} placeholder="Private grooming house" />
          <Field label="Hero image URL" value={form.hero_image_url} onChange={(v) => setForm({ ...form, hero_image_url: v })} placeholder="https://…" />
          <div className="md:col-span-2">
            <Field label="Título principal" value={form.hero_title} onChange={(v) => setForm({ ...form, hero_title: v })} placeholder="Premium grooming experience" />
          </div>
          <div className="md:col-span-2">
            <TextArea label="Subtítulo" value={form.hero_subtitle} onChange={(v) => setForm({ ...form, hero_subtitle: v })} />
          </div>
        </div>
        {form.hero_image_url && (
          <div className="mt-4 rounded-xl overflow-hidden aspect-video w-full max-w-sm">
            <img src={form.hero_image_url} alt="" className="h-full w-full object-cover" />
          </div>
        )}
      </section>

      {/* Stats */}
      <section className="rounded-2xl border bg-card p-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl">Estadísticas</h2>
            <p className="mt-1 text-sm text-muted-foreground">Números que aparecen en el hero (p.ej. "500+ clientes").</p>
          </div>
          <button onClick={() => setStats([...stats, { value: "", label: "" }])} className="rounded-full border px-3 py-1.5 text-xs hover:border-[color:var(--bronze)]">+ Añadir</button>
        </div>
        <div className="mt-6 space-y-3">
          {stats.map((st, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-3 items-end">
              <Field label={i === 0 ? "Valor" : ""} value={st.value} onChange={(v) => setStats(stats.map((s, j) => j === i ? { ...s, value: v } : s))} placeholder="500+" />
              <Field label={i === 0 ? "Etiqueta" : ""} value={st.label} onChange={(v) => setStats(stats.map((s, j) => j === i ? { ...s, label: v } : s))} placeholder="Clientes felices" />
              <button onClick={() => setStats(stats.filter((_, j) => j !== i))} className="rounded-full border border-red-300 text-red-700 px-3 py-2.5 text-xs mb-[2px]">✕</button>
            </div>
          ))}
          {stats.length === 0 && <p className="text-sm text-muted-foreground">Sin estadísticas. Añade una.</p>}
        </div>
      </section>

      {/* Pillars */}
      <section className="rounded-2xl border bg-card p-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl">Pilares / Features</h2>
            <p className="mt-1 text-sm text-muted-foreground">Frases cortas con ícono que aparecen bajo el hero.</p>
          </div>
          <button onClick={() => setPillars([...pillars, { icon: "star", title: "" }])} className="rounded-full border px-3 py-1.5 text-xs hover:border-[color:var(--bronze)]">+ Añadir</button>
        </div>
        <div className="mt-6 space-y-3">
          {pillars.map((p, i) => (
            <div key={i} className="grid grid-cols-[120px_1fr_auto] gap-3 items-end">
              <label className="block">
                {i === 0 && <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Ícono</span>}
                <select value={p.icon} onChange={(e) => setPillars(pillars.map((pl, j) => j === i ? { ...pl, icon: e.target.value } : pl))}
                  className={`w-full rounded-md border bg-background px-3 py-3 text-sm ${i === 0 ? "mt-2" : ""}`}>
                  <option value="scissors">✂ Scissors</option>
                  <option value="crown">♛ Crown</option>
                  <option value="sparkles">✦ Sparkles</option>
                  <option value="star">★ Star</option>
                </select>
              </label>
              <Field label={i === 0 ? "Texto" : ""} value={p.title} onChange={(v) => setPillars(pillars.map((pl, j) => j === i ? { ...pl, title: v } : pl))} placeholder="Precision cuts" />
              <button onClick={() => setPillars(pillars.filter((_, j) => j !== i))} className="rounded-full border border-red-300 text-red-700 px-3 py-2.5 text-xs mb-[2px]">✕</button>
            </div>
          ))}
          {pillars.length === 0 && <p className="text-sm text-muted-foreground">Sin pilares. Añade uno.</p>}
        </div>
      </section>

      {/* About */}
      <section className="rounded-2xl border bg-card p-8">
        <h2 className="font-display text-2xl">Sobre nosotros</h2>
        <div className="mt-6 grid gap-4">
          <Field label="Título" value={form.about_title} onChange={(v) => setForm({ ...form, about_title: v })} placeholder="Nuestra historia" />
          <TextArea label="Descripción" value={form.about_body} onChange={(v) => setForm({ ...form, about_body: v })} rows={5} />
        </div>
      </section>

      {/* Gallery */}
      <section className="rounded-2xl border bg-card p-8">
        <h2 className="font-display text-2xl">Galería</h2>
        <p className="mt-1 text-sm text-muted-foreground">Una URL de imagen por línea.</p>
        <TextArea label="URLs de galería" value={form.gallery} onChange={(v) => setForm({ ...form, gallery: v })} rows={6} />
      </section>

      {/* Testimonials */}
      <section className="rounded-2xl border bg-card p-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl">Testimonios</h2>
            <p className="mt-1 text-sm text-muted-foreground">Reseñas que aparecen en el sitio.</p>
          </div>
          <button
            onClick={() => setTestimonials([...testimonials, { name: "", role: "Cliente", quote: "", rating: 5 }])}
            className="rounded-full border px-3 py-1.5 text-xs hover:border-[color:var(--bronze)]"
          >+ Añadir</button>
        </div>
        <div className="mt-6 space-y-4">
          {testimonials.map((t, i) => (
            <div key={i} className="rounded-xl border bg-muted/20 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Testimonio {i + 1}</p>
                <button onClick={() => setTestimonials(testimonials.filter((_, j) => j !== i))} className="text-red-600 text-xs hover:text-red-700">Eliminar</button>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <Field label="Nombre" value={t.name} onChange={(v) => setTestimonials(testimonials.map((tt, j) => j === i ? { ...tt, name: v } : tt))} placeholder="Juan García" />
                <Field label="Rol / cargo" value={t.role} onChange={(v) => setTestimonials(testimonials.map((tt, j) => j === i ? { ...tt, role: v } : tt))} placeholder="Cliente frecuente" />
                <label className="block">
                  <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Calificación</span>
                  <select value={t.rating} onChange={(e) => setTestimonials(testimonials.map((tt, j) => j === i ? { ...tt, rating: Number(e.target.value) } : tt))}
                    className="mt-2 w-full rounded-md border bg-background px-3 py-3 text-sm">
                    {[5, 4, 3].map((r) => <option key={r} value={r}>{r} estrellas</option>)}
                  </select>
                </label>
              </div>
              <TextArea label="Cita / reseña" value={t.quote} onChange={(v) => setTestimonials(testimonials.map((tt, j) => j === i ? { ...tt, quote: v } : tt))} rows={2} />
            </div>
          ))}
          {testimonials.length === 0 && <p className="text-sm text-muted-foreground">Sin testimonios. Añade uno.</p>}
        </div>
      </section>

      <div className="flex items-center justify-end gap-3">
        {m.error && <p className="text-sm text-red-600">{(m.error as Error).message}</p>}
        {m.isSuccess && <p className="text-sm text-emerald-700">Guardado ✓</p>}
        <button onClick={() => m.mutate()} disabled={m.isPending} className="btn-luxury">
          {m.isPending ? "Guardando…" : "Guardar sitio web"}
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
  const createAppt = useServerFn(createAppointmentAdmin);
  const qc = useQueryClient();
  const [from, setFrom] = useState(new Date().toISOString().slice(0,10));
  const [showCreate, setShowCreate] = useState(false);

  const q = useQuery({
    queryKey: ["appts", slug, from],
    queryFn: () => fetchAppts({ data: { slug, from: new Date(from + "T00:00:00").toISOString() } }),
  });
  const statusMut = useMutation({
    mutationFn: (v: { id: string; status: "confirmed"|"cancelled"|"completed"|"no_show" }) => updateStatus({ data: { slug, ...v } }),
    onSuccess: () => q.refetch(),
  });
  const createMut = useMutation({
    mutationFn: (d: any) => createAppt({ data: { slug, ...d } }),
    onSuccess: () => { q.refetch(); setShowCreate(false); },
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

  // Fetch bundle for services list (needed by create modal)
  const fetchBundle = useServerFn(getBusinessAdminBundle);
  const bundleQ = useQuery({
    queryKey: ["admin", "bundle", slug],
    queryFn: () => fetchBundle({ data: { slug } }),
    staleTime: 5 * 60_000,
  });
  const services = (bundleQ.data as AdminPayload | undefined)?.services ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-card p-6">
        <div>
          <h2 className="font-display text-2xl">Agenda</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {q.data?.length ?? "—"} citas desde la fecha seleccionada.
          </p>
        </div>
        <div className="flex items-end gap-3 flex-wrap">
          <label className="block">
            <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Desde</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-2 rounded-md border bg-background px-3 py-2 text-sm" />
          </label>
          <button onClick={() => setShowCreate(true)} className="btn-luxury">+ Nueva cita</button>
        </div>
      </div>

      {q.isLoading && <p className="text-sm text-muted-foreground">Cargando…</p>}
      {q.data && q.data.length === 0 && (
        <div className="rounded-2xl border bg-card p-10 text-center">
          <p className="text-muted-foreground">No hay citas programadas.</p>
          <button onClick={() => setShowCreate(true)} className="mt-4 btn-luxury">Crear primera cita</button>
        </div>
      )}

      {grouped.map(([day, list]: [string, AppointmentRow[]]) => (
        <section key={day} className="rounded-2xl border bg-card overflow-hidden">
          <header className="border-b bg-secondary/50 px-6 py-3">
            <p className="font-display text-lg">{new Date(day + "T00:00:00").toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" })}</p>
          </header>
          <ul className="divide-y divide-border">
            {list.map((a: AppointmentRow) => (
              <li key={a.id} className="grid grid-cols-[72px_1fr_auto] items-start gap-4 px-6 py-4">
                <div className="pt-0.5">
                  <p className="font-display text-xl leading-none">{new Date(a.startsAt).toLocaleTimeString(undefined,{hour:"2-digit",minute:"2-digit"})}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">→ {new Date(a.endsAt).toLocaleTimeString(undefined,{hour:"2-digit",minute:"2-digit"})}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{a.customerName}
                    {a.serviceName && <span className="ml-2 font-normal text-muted-foreground">{a.serviceName}</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">{[a.customerPhone, a.customerEmail].filter(Boolean).join(" · ")}</p>
                  {a.notes && <p className="mt-1 text-xs text-muted-foreground italic">"{a.notes}"</p>}
                </div>
                <div className="flex items-center gap-2 pt-0.5 flex-wrap justify-end">
                  <StatusBadge status={a.status} />
                  <select
                    value={a.status}
                    onChange={(e) => statusMut.mutate({ id: a.id, status: e.target.value as any })}
                    className="rounded-md border bg-background px-2 py-1.5 text-xs"
                  >
                    <option value="pending">Pendiente</option>
                    <option value="confirmed">Confirmada</option>
                    <option value="completed">Completada</option>
                    <option value="cancelled">Cancelada</option>
                    <option value="no_show">No-show</option>
                  </select>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {showCreate && (
        <CreateAppointmentModal
          services={services}
          submitting={createMut.isPending}
          error={createMut.error as Error | null}
          onClose={() => setShowCreate(false)}
          onSubmit={(d) => createMut.mutate(d)}
        />
      )}
    </div>
  );
}

function CreateAppointmentModal({ services, submitting, error, onClose, onSubmit }: {
  services: AdminService[];
  submitting: boolean;
  error: Error | null;
  onClose: () => void;
  onSubmit: (d: any) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [f, setF] = useState({
    serviceId: services[0]?.id ?? "",
    date: today,
    time: "10:00",
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    notes: "",
    status: "confirmed" as "confirmed" | "pending",
  });

  const startsAt = `${f.date}T${f.time}:00`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl border bg-card p-8" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-display text-2xl">Nueva cita</h3>
        <p className="mt-1 text-sm text-muted-foreground">Crea una cita manualmente para un cliente.</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {/* Service */}
          <label className="block sm:col-span-2">
            <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Servicio</span>
            <select value={f.serviceId} onChange={(e) => setF({ ...f, serviceId: e.target.value })}
              className="mt-2 w-full rounded-md border bg-background px-4 py-3 text-sm">
              {services.filter((s) => s.isActive).map((s) => (
                <option key={s.id} value={s.id}>{s.name} · {s.durationMin} min · ${s.price}</option>
              ))}
            </select>
          </label>
          {/* Date & time */}
          <label className="block">
            <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Fecha</span>
            <input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })}
              className="mt-2 w-full rounded-md border bg-background px-4 py-3 text-sm" />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Hora</span>
            <input type="time" value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })}
              className="mt-2 w-full rounded-md border bg-background px-4 py-3 text-sm" />
          </label>
          {/* Customer */}
          <Field label="Nombre del cliente" value={f.customerName} onChange={(v) => setF({ ...f, customerName: v })} placeholder="Juan García" />
          <Field label="Teléfono" value={f.customerPhone} onChange={(v) => setF({ ...f, customerPhone: v })} placeholder="+1 555-0000" />
          <div className="sm:col-span-2">
            <Field label="Email (opcional)" value={f.customerEmail} onChange={(v) => setF({ ...f, customerEmail: v })} placeholder="juan@ejemplo.com" />
          </div>
          <label className="block sm:col-span-2">
            <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Notas (opcional)</span>
            <textarea value={f.notes} rows={2} onChange={(e) => setF({ ...f, notes: e.target.value })}
              className="mt-2 w-full rounded-md border bg-background px-4 py-3 text-sm outline-none focus:border-[color:var(--bronze)]"
              placeholder="Observaciones, preferencias…" />
          </label>
          {/* Status */}
          <label className="block sm:col-span-2">
            <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Estado inicial</span>
            <select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as any })}
              className="mt-2 w-full rounded-md border bg-background px-4 py-3 text-sm">
              <option value="confirmed">Confirmada</option>
              <option value="pending">Pendiente</option>
            </select>
          </label>
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error.message}</p>}
        <div className="mt-8 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-full border px-4 py-2 text-xs uppercase tracking-[0.18em]">Cancelar</button>
          <button
            disabled={submitting || !f.serviceId || !f.customerName || !f.date || !f.time}
            onClick={() => onSubmit({ serviceId: f.serviceId, startsAt, customerName: f.customerName, customerPhone: f.customerPhone || undefined, customerEmail: f.customerEmail || undefined, notes: f.notes || undefined, status: f.status })}
            className="btn-luxury"
          >
            {submitting ? "Guardando…" : "Crear cita"}
          </button>
        </div>
      </div>
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

/* -------------------- CUSTOMERS CRM -------------------- */
function CustomersPanel({ slug }: { slug: string }) {
  const fetchCustomers = useServerFn(listCustomers);
  const upsertCust = useServerFn(upsertCustomer);
  const delCust = useServerFn(deleteCustomer);
  const fetchDetail = useServerFn(getCustomerDetail);
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["customers", slug],
    queryFn: () => fetchCustomers({ data: { slug } }),
  });

  const upsertMut = useMutation({
    mutationFn: (customer: any) => upsertCust({ data: { slug, customer } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customers", slug] }),
  });
  const delMut = useMutation({
    mutationFn: (customerId: string) => delCust({ data: { slug, customerId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customers", slug] }),
  });

  const [edit, setEdit] = useState<Partial<AdminCustomer> | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const customers = q.data ?? [];
  const filtered = customers.filter((c) =>
    !search || c.fullName.toLowerCase().includes(search.toLowerCase()) ||
    (c.email ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (c.phone ?? "").includes(search),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-display text-3xl">Clientes</h2>
          <p className="mt-1 text-sm text-muted-foreground">{customers.length} clientes registrados</p>
        </div>
        <button onClick={() => setEdit({ fullName: "", email: "", phone: "", notes: "" })} className="btn-luxury">+ Nuevo cliente</button>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border bg-card p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Total clientes</p>
          <p className="mt-2 font-display text-3xl">{customers.length}</p>
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Con membresía activa</p>
          <p className="mt-2 font-display text-3xl">{customers.filter((c) => c.activeMembership).length}</p>
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Total visitas</p>
          <p className="mt-2 font-display text-3xl">{customers.reduce((a, c) => a + c.totalVisits, 0)}</p>
        </div>
      </div>

      {/* Search */}
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por nombre, email o teléfono…"
        className="w-full rounded-full border bg-background px-4 py-2.5 text-sm outline-none focus:border-[color:var(--bronze)]"
      />

      {q.isLoading && <p className="text-sm text-muted-foreground">Cargando clientes…</p>}
      {!q.isLoading && filtered.length === 0 && (
        <div className="rounded-2xl border bg-card p-10 text-center text-muted-foreground">
          {search ? "Sin resultados para esa búsqueda." : "No hay clientes aún. ¡Agrega el primero!"}
        </div>
      )}

      {/* Desktop table */}
      {filtered.length > 0 && (
        <div className="hidden md:block overflow-hidden rounded-2xl border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <tr>
                <th className="px-5 py-4">Cliente</th>
                <th className="px-5 py-4">Contacto</th>
                <th className="px-5 py-4">Membresía</th>
                <th className="px-5 py-4">Visitas</th>
                <th className="px-5 py-4">Última cita</th>
                <th className="px-5 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-t hover:bg-muted/20 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-[color:var(--bronze)]/15 text-[color:var(--bronze)] grid place-items-center font-display text-sm shrink-0">
                        {c.fullName[0]?.toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{c.fullName}</p>
                        <p className="text-xs text-muted-foreground truncate">{c.email ?? "Sin email"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">{c.phone ?? "—"}</td>
                  <td className="px-5 py-4">
                    {c.activeMembership
                      ? <span className="rounded-full bg-[color:var(--bronze)]/15 text-[color:var(--bronze)] px-2.5 py-1 text-xs">{c.activeMembership.name}</span>
                      : <span className="text-xs text-muted-foreground">—</span>}
                  </td>
                  <td className="px-5 py-4">{c.totalVisits}</td>
                  <td className="px-5 py-4 text-xs text-muted-foreground">
                    {c.lastAppointment ? new Date(c.lastAppointment).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="inline-flex gap-1.5">
                      <button onClick={() => setDetail(c.id)} className="rounded-full border px-3 py-1 text-xs hover:border-[color:var(--bronze)]">Ver</button>
                      <button onClick={() => setEdit(c)} className="rounded-full border px-3 py-1 text-xs">Editar</button>
                      <button onClick={() => { if (confirm(`¿Eliminar a ${c.fullName}?`)) delMut.mutate(c.id); }} className="rounded-full border border-red-300 text-red-700 px-3 py-1 text-xs">Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Mobile cards */}
      {filtered.length > 0 && (
        <div className="grid gap-3 md:hidden">
          {filtered.map((c) => (
            <div key={c.id} className="rounded-2xl border bg-card p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-[color:var(--bronze)]/15 text-[color:var(--bronze)] grid place-items-center font-display shrink-0">
                  {c.fullName[0]?.toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{c.fullName}</p>
                  <p className="text-xs text-muted-foreground">{c.phone ?? c.email ?? "—"}</p>
                </div>
                {c.activeMembership && (
                  <span className="rounded-full bg-[color:var(--bronze)]/15 text-[color:var(--bronze)] px-2 py-0.5 text-[10px] shrink-0">{c.activeMembership.name}</span>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <button onClick={() => setDetail(c.id)} className="rounded-full border px-3 py-1.5 text-xs">Ver perfil</button>
                <button onClick={() => setEdit(c)} className="rounded-full border px-3 py-1.5 text-xs">Editar</button>
                <button onClick={() => { if (confirm(`¿Eliminar a ${c.fullName}?`)) delMut.mutate(c.id); }} className="rounded-full border border-red-300 text-red-700 px-3 py-1.5 text-xs">Eliminar</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {edit !== null && (
        <CustomerModal
          initial={edit}
          submitting={upsertMut.isPending}
          onClose={() => setEdit(null)}
          onSubmit={async (d) => { await upsertMut.mutateAsync(d); setEdit(null); }}
        />
      )}

      {/* Detail Modal */}
      {detail && (
        <CustomerDetailModal
          slug={slug}
          customerId={detail}
          fetchDetail={fetchDetail}
          onClose={() => setDetail(null)}
        />
      )}
    </div>
  );
}

function CustomerModal({ initial, submitting, onClose, onSubmit }: {
  initial: Partial<AdminCustomer>;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (d: any) => Promise<void>;
}) {
  const [f, setF] = useState({
    id: initial.id,
    full_name: initial.fullName ?? "",
    email: initial.email ?? "",
    phone: initial.phone ?? "",
    notes: initial.notes ?? "",
  });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl border bg-card p-8" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-display text-2xl">{f.id ? "Editar cliente" : "Nuevo cliente"}</h3>
        <div className="mt-6 grid gap-4">
          <Field label="Nombre completo" value={f.full_name} onChange={(v) => setF({ ...f, full_name: v })} placeholder="Juan García" />
          <Field label="Email" value={f.email} onChange={(v) => setF({ ...f, email: v })} placeholder="juan@ejemplo.com" />
          <Field label="Teléfono" value={f.phone} onChange={(v) => setF({ ...f, phone: v })} placeholder="+1 555-0000" />
          <label className="block">
            <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Notas</span>
            <textarea value={f.notes} rows={3} onChange={(e) => setF({ ...f, notes: e.target.value })}
              className="mt-2 w-full rounded-md border bg-background px-4 py-3 text-sm outline-none focus:border-[color:var(--bronze)]"
              placeholder="Preferencias, alergias, notas especiales…" />
          </label>
        </div>
        <div className="mt-8 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-full border px-4 py-2 text-xs uppercase tracking-[0.18em]">Cancelar</button>
          <button onClick={() => onSubmit(f)} disabled={submitting || !f.full_name} className="btn-luxury">
            {submitting ? "Guardando…" : "Guardar cliente"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CustomerDetailModal({ slug, customerId, fetchDetail, onClose }: {
  slug: string;
  customerId: string;
  fetchDetail: ReturnType<typeof useServerFn<typeof getCustomerDetail>>;
  onClose: () => void;
}) {
  const q = useQuery({
    queryKey: ["customer-detail", slug, customerId],
    queryFn: () => fetchDetail({ data: { slug, customerId } }),
  });
  const data = q.data as Awaited<ReturnType<typeof getCustomerDetail>> | undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/40 p-4" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-2xl border bg-card max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h3 className="font-display text-xl">Perfil del cliente</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>
        {q.isLoading && <div className="p-8 text-center text-muted-foreground">Cargando…</div>}
        {data && (
          <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-[color:var(--bronze)]/15 text-[color:var(--bronze)] grid place-items-center font-display text-2xl shrink-0">
                {(data.customer as any).full_name?.[0]?.toUpperCase()}
              </div>
              <div>
                <h4 className="font-display text-2xl">{(data.customer as any).full_name}</h4>
                <p className="text-sm text-muted-foreground">{(data.customer as any).email ?? ""} {(data.customer as any).phone ? `· ${(data.customer as any).phone}` : ""}</p>
                <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
                  <span>{(data.customer as any).total_visits} visitas</span>
                  <span>${Number((data.customer as any).total_spend).toFixed(0)} gastado</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {(data.customer as any).notes && (
              <div className="rounded-xl border bg-muted/30 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Notas</p>
                <p className="mt-2 text-sm">{(data.customer as any).notes}</p>
              </div>
            )}

            {/* Subscriptions */}
            <div>
              <h5 className="font-display text-lg">Membresías</h5>
              {data.subscriptions.length === 0
                ? <p className="mt-2 text-sm text-muted-foreground">Sin membresías.</p>
                : (
                  <ul className="mt-3 divide-y divide-border rounded-xl border overflow-hidden">
                    {data.subscriptions.map((s) => (
                      <li key={s.id} className="flex items-center justify-between gap-4 px-4 py-3 bg-card">
                        <div>
                          <p className="font-medium text-sm">{s.membershipName}</p>
                          <p className="text-xs text-muted-foreground">
                            Desde {new Date(s.startedAt).toLocaleDateString()}
                            {s.endsAt ? ` · hasta ${new Date(s.endsAt).toLocaleDateString()}` : ""}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`rounded-full px-2.5 py-1 text-xs ${s.status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-muted text-muted-foreground"}`}>{s.status}</span>
                          {s.includedCuts && (
                            <p className="mt-1 text-xs text-muted-foreground">{s.cutsUsed}/{s.includedCuts} cortes</p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )
              }
            </div>

            {/* Appointments */}
            <div>
              <h5 className="font-display text-lg">Historial de citas</h5>
              {data.appointments.length === 0
                ? <p className="mt-2 text-sm text-muted-foreground">Sin citas.</p>
                : (
                  <ul className="mt-3 divide-y divide-border rounded-xl border overflow-hidden">
                    {data.appointments.map((a) => (
                      <li key={a.id} className="flex items-center justify-between gap-4 px-4 py-3 bg-card">
                        <div>
                          <p className="text-sm font-medium">{a.serviceName ?? "Servicio"}</p>
                          <p className="text-xs text-muted-foreground">{new Date(a.startsAt).toLocaleString()}</p>
                          {a.notes && <p className="text-xs text-muted-foreground italic">"{a.notes}"</p>}
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-[10px] ${
                          a.status === "completed" ? "bg-blue-100 text-blue-800"
                          : a.status === "confirmed" ? "bg-emerald-100 text-emerald-800"
                          : a.status === "cancelled" ? "bg-red-100 text-red-800"
                          : "bg-amber-100 text-amber-800"
                        }`}>{a.status}</span>
                      </li>
                    ))}
                  </ul>
                )
              }
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* -------------------- STAFF MANAGEMENT -------------------- */
function StaffPanel({ slug }: { slug: string }) {
  const fetchStaff = useServerFn(listStaff);
  const upsertMember = useServerFn(upsertStaff);
  const delMember = useServerFn(deleteStaff);
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["staff", slug],
    queryFn: () => fetchStaff({ data: { slug } }),
  });

  const upsertMut = useMutation({
    mutationFn: (member: any) => upsertMember({ data: { slug, member } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["staff", slug] }),
  });
  const delMut = useMutation({
    mutationFn: (staffId: string) => delMember({ data: { slug, staffId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["staff", slug] }),
  });

  const [edit, setEdit] = useState<Partial<AdminStaff> | null>(null);
  const staff = q.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl">Equipo</h2>
          <p className="mt-1 text-sm text-muted-foreground">{staff.filter((s) => s.isActive).length} miembros activos</p>
        </div>
        <button onClick={() => setEdit({ fullName: "", role: "", avatarUrl: "", isActive: true })} className="btn-luxury">+ Añadir</button>
      </div>

      {q.isLoading && <p className="text-sm text-muted-foreground">Cargando equipo…</p>}

      {!q.isLoading && staff.length === 0 && (
        <div className="rounded-2xl border bg-card p-10 text-center text-muted-foreground">
          Aún no tienes miembros de equipo. ¡Agrega tu primer barbero!
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {staff.map((s) => (
          <div key={s.id} className={`rounded-2xl border bg-card p-6 transition ${!s.isActive ? "opacity-50" : ""}`}>
            <div className="flex items-center gap-4">
              {s.avatarUrl
                ? <img src={s.avatarUrl} alt={s.fullName} className="h-16 w-16 rounded-full object-cover border-2 border-[color:var(--bronze)]/20" />
                : (
                  <div className="h-16 w-16 rounded-full bg-gradient-to-br from-[color:var(--bronze)]/20 to-[color:var(--bronze)]/5 grid place-items-center font-display text-2xl text-[color:var(--bronze)] shrink-0">
                    {s.fullName[0]?.toUpperCase()}
                  </div>
                )
              }
              <div className="min-w-0">
                <p className="font-display text-lg truncate">{s.fullName}</p>
                <p className="text-xs text-muted-foreground truncate">{s.role ?? "Barbero"}</p>
                {!s.isActive && <p className="text-xs text-red-600 mt-0.5">Inactivo</p>}
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setEdit(s)} className="rounded-full border px-3 py-1 text-xs">Editar</button>
              <button
                onClick={() => upsertMut.mutate({ id: s.id, full_name: s.fullName, role: s.role, avatar_url: s.avatarUrl, is_active: !s.isActive })}
                className={`rounded-full border px-3 py-1 text-xs ${s.isActive ? "border-amber-300 text-amber-700" : "border-emerald-300 text-emerald-700"}`}
              >
                {s.isActive ? "Desactivar" : "Activar"}
              </button>
              <button onClick={() => { if (confirm(`¿Eliminar a ${s.fullName}?`)) delMut.mutate(s.id); }} className="rounded-full border border-red-300 text-red-700 px-3 py-1 text-xs">Eliminar</button>
            </div>
          </div>
        ))}
      </div>

      {edit !== null && (
        <StaffModal
          initial={edit}
          submitting={upsertMut.isPending}
          onClose={() => setEdit(null)}
          onSubmit={async (d) => { await upsertMut.mutateAsync(d); setEdit(null); }}
        />
      )}
    </div>
  );
}

function StaffModal({ initial, submitting, onClose, onSubmit }: {
  initial: Partial<AdminStaff>;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (d: any) => Promise<void>;
}) {
  const [f, setF] = useState({
    id: initial.id,
    full_name: initial.fullName ?? "",
    role: initial.role ?? "",
    avatar_url: initial.avatarUrl ?? "",
    is_active: initial.isActive ?? true,
  });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border bg-card p-8" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-display text-2xl">{f.id ? "Editar miembro" : "Nuevo miembro"}</h3>
        <div className="mt-6 grid gap-4">
          <Field label="Nombre completo" value={f.full_name} onChange={(v) => setF({ ...f, full_name: v })} placeholder="Carlos Mendez" />
          <Field label="Rol / Especialidad" value={f.role} onChange={(v) => setF({ ...f, role: v })} placeholder="Barbero senior, Barba specialist…" />
          <Field label="URL de foto (opcional)" value={f.avatar_url} onChange={(v) => setF({ ...f, avatar_url: v })} placeholder="https://…" />
          {f.avatar_url && (
            <img src={f.avatar_url} alt="" className="h-20 w-20 rounded-full object-cover border mx-auto" />
          )}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={f.is_active} onChange={(e) => setF({ ...f, is_active: e.target.checked })} />
            Miembro activo (aparece en el sitio público)
          </label>
        </div>
        <div className="mt-8 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-full border px-4 py-2 text-xs uppercase tracking-[0.18em]">Cancelar</button>
          <button onClick={() => onSubmit(f)} disabled={submitting || !f.full_name} className="btn-luxury">
            {submitting ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
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