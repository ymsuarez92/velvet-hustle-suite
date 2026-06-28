import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { getTenant, type Tenant } from "@/data/tenants";
import {
  Crown,
  LayoutDashboard,
  Calendar,
  Scissors,
  Users,
  BadgeCheck,
  Settings,
  TrendingUp,
  Search,
  Plus,
  MoreHorizontal,
  Clock,
  DollarSign,
  CalendarCheck,
  UserPlus,
  ArrowUpRight,
  Bell,
  Check,
} from "lucide-react";

export const Route = createFileRoute("/b/$slug/admin")({
  head: ({ params }) => ({
    meta: [
      { title: `Admin — ${params.slug}` },
      { name: "description", content: "Admin dashboard for the Maison platform." },
    ],
  }),
  loader: ({ params }) => {
    const tenant = getTenant(params.slug);
    if (!tenant) throw notFound();
    return { tenant };
  },
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <p className="font-display text-2xl">House not found</p>
    </div>
  ),
  errorComponent: () => (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <p className="font-display text-2xl">Something went wrong</p>
    </div>
  ),
  component: AdminPage,
});

type SectionId = "dashboard" | "appointments" | "services" | "memberships" | "customers" | "settings";

const NAV: { id: SectionId; icon: typeof LayoutDashboard; label: string }[] = [
  { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { id: "appointments", icon: Calendar, label: "Agenda" },
  { id: "services", icon: Scissors, label: "Servicios" },
  { id: "memberships", icon: BadgeCheck, label: "Membresías" },
  { id: "customers", icon: Users, label: "Clientes" },
  { id: "settings", icon: Settings, label: "Ajustes" },
];

/* --------------------------------- MOCK DATA --------------------------------- */

const APPOINTMENTS = [
  { time: "09:00", client: "James Rodriguez", service: "Signature Haircut", barber: "Marco", status: "Confirmado", price: 65 },
  { time: "09:45", client: "Michael Thompson", service: "Hot Towel Shave", barber: "Andrea", status: "Confirmado", price: 55 },
  { time: "10:30", client: "David Lin", service: "Beard Sculpting", barber: "Marco", status: "Pendiente", price: 35 },
  { time: "11:15", client: "Carlos Mendez", service: "Signature Haircut", barber: "Luca", status: "Confirmado", price: 65 },
  { time: "12:00", client: "Andrew Bell", service: "Scalp Hydromassage", barber: "Andrea", status: "Confirmado", price: 45 },
  { time: "13:30", client: "Tomás García", service: "Signature Haircut + Beard", barber: "Marco", status: "Confirmado", price: 95 },
  { time: "15:00", client: "Nicolás V.", service: "Hot Towel Shave", barber: "Luca", status: "Pendiente", price: 55 },
  { time: "16:30", client: "Marcus King", service: "Signature Haircut", barber: "Andrea", status: "Confirmado", price: 65 },
];

const CUSTOMERS = [
  { name: "James Rodriguez", email: "james.r@mail.com", visits: 24, spent: 1560, tier: "VIP", lastVisit: "Hoy" },
  { name: "Michael Thompson", email: "michael.t@mail.com", visits: 18, spent: 1170, tier: "Premium", lastVisit: "Hoy" },
  { name: "David Lin", email: "david.l@mail.com", visits: 9, spent: 540, tier: "Gold", lastVisit: "Hace 3 días" },
  { name: "Carlos Mendez", email: "carlos.m@mail.com", visits: 12, spent: 780, tier: "Premium", lastVisit: "Hace 1 semana" },
  { name: "Andrew Bell", email: "andrew.b@mail.com", visits: 6, spent: 290, tier: "Gold", lastVisit: "Hace 2 días" },
  { name: "Tomás García", email: "tomas.g@mail.com", visits: 31, spent: 2340, tier: "VIP", lastVisit: "Hoy" },
];

const MEMBERS_SUBS = [
  { tier: "VIP", count: 18, mrr: 2322 },
  { tier: "Premium", count: 42, mrr: 3318 },
  { tier: "Gold", count: 27, mrr: 1323 },
];

/* ------------------------------- COMPONENT --------------------------------- */

function AdminPage() {
  const { tenant } = Route.useLoaderData();
  const [section, setSection] = useState<SectionId>("dashboard");

  return (
    <div className="min-h-screen bg-[color:var(--cream)]">
      <div className="grid min-h-screen md:grid-cols-[260px_1fr]">
        {/* Sidebar */}
        <aside className="hidden border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex md:flex-col">
          <div className="flex h-20 items-center gap-3 border-b border-sidebar-border px-6">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-[color:var(--cream)]">
              <Crown className="h-4 w-4 text-[color:var(--bronze)]" />
            </span>
            <div>
              <p className="font-display text-lg leading-none">{tenant.name}</p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.22em] opacity-60">Admin</p>
            </div>
          </div>
          <nav className="flex-1 px-3 py-4">
            {NAV.map((n) => (
              <button
                key={n.id}
                onClick={() => setSection(n.id)}
                className={`mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                  section === n.id
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                }`}
              >
                <n.icon className="h-4 w-4" />
                {n.label}
              </button>
            ))}
          </nav>
          <div className="border-t border-sidebar-border p-4">
            <Link
              to="/b/$slug"
              params={{ slug: tenant.slug }}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs uppercase tracking-[0.22em] text-sidebar-foreground/70 hover:text-sidebar-accent-foreground"
            >
              ← Ver landing
            </Link>
          </div>
        </aside>

        {/* Content */}
        <div className="flex min-w-0 flex-col">
          <header className="flex h-20 items-center justify-between gap-4 border-b bg-background px-6 md:px-10">
            <div>
              <p className="eyebrow">{NAV.find((n) => n.id === section)?.label}</p>
              <h1 className="mt-1 font-display text-2xl">
                {section === "dashboard" && "Resumen del día"}
                {section === "appointments" && "Agenda de hoy"}
                {section === "services" && "Servicios y precios"}
                {section === "memberships" && "Planes de membresía"}
                {section === "customers" && "Clientes"}
                {section === "settings" && "Ajustes de la casa"}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-2 rounded-full border bg-card px-4 py-2 md:flex">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input
                  placeholder="Buscar..."
                  className="w-48 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>
              <button className="grid h-10 w-10 place-items-center rounded-full border bg-card">
                <Bell className="h-4 w-4" />
              </button>
              <span className="grid h-10 w-10 place-items-center rounded-full bg-[color:var(--champagne)] font-display text-sm text-charcoal">
                {tenant.name.charAt(0)}
              </span>
            </div>
          </header>

          <main className="flex-1 space-y-6 p-6 md:p-10">
            {section === "dashboard" && <DashboardView tenant={tenant} />}
            {section === "appointments" && <AppointmentsView />}
            {section === "services" && <ServicesView tenant={tenant} />}
            {section === "memberships" && <MembershipsView tenant={tenant} />}
            {section === "customers" && <CustomersView />}
            {section === "settings" && <SettingsView tenant={tenant} />}
          </main>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------- VIEWS ---------------------------------- */

function Kpi({ icon: Icon, label, value, delta }: { icon: typeof DollarSign; label: string; value: string; delta: string }) {
  return (
    <div className="rounded-2xl border bg-card p-6 shadow-[var(--shadow-soft)]">
      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">{label}</p>
        <span className="grid h-9 w-9 place-items-center rounded-full bg-[color:var(--champagne)]/30 text-[color:var(--bronze)]">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-4 font-display text-3xl">{value}</p>
      <p className="mt-2 inline-flex items-center gap-1 text-xs text-[color:var(--bronze)]">
        <TrendingUp className="h-3 w-3" /> {delta} vs mes anterior
      </p>
    </div>
  );
}

function DashboardView({ tenant }: { tenant: Tenant }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={DollarSign} label="Ingresos del mes" value="$12,450" delta="+12.5%" />
        <Kpi icon={CalendarCheck} label="Citas este mes" value="156" delta="+8.2%" />
        <Kpi icon={BadgeCheck} label="Miembros activos" value="87" delta="+15.3%" />
        <Kpi icon={UserPlus} label="Nuevos clientes" value="23" delta="+5.1%" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border bg-card p-6 shadow-[var(--shadow-soft)] lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="eyebrow">Próximas citas</p>
              <h2 className="mt-1 font-display text-xl">Hoy en {tenant.name}</h2>
            </div>
            <button className="text-xs uppercase tracking-[0.22em] text-[color:var(--bronze)]">Ver todo →</button>
          </div>
          <ul className="mt-6 divide-y">
            {APPOINTMENTS.slice(0, 5).map((a) => (
              <li key={a.time} className="flex items-center gap-4 py-4">
                <div className="w-14 font-display text-xl text-[color:var(--bronze)]">{a.time}</div>
                <div className="flex-1">
                  <p className="font-medium">{a.client}</p>
                  <p className="text-xs text-muted-foreground">{a.service} · {a.barber}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.18em] ${
                  a.status === "Confirmado" ? "bg-[color:var(--champagne)]/30 text-[color:var(--bronze)]" : "bg-secondary text-foreground/70"
                }`}>{a.status}</span>
                <span className="font-display text-base">${a.price}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-[var(--shadow-soft)]">
          <p className="eyebrow">Membresías activas</p>
          <h2 className="mt-1 font-display text-xl">Distribución</h2>
          <div className="mt-6 space-y-5">
            {MEMBERS_SUBS.map((m) => {
              const total = MEMBERS_SUBS.reduce((a, b) => a + b.count, 0);
              const pct = Math.round((m.count / total) * 100);
              return (
                <div key={m.tier}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{m.tier}</span>
                    <span className="text-muted-foreground">{m.count} miembros · ${m.mrr}/mes</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full rounded-full bg-[color:var(--bronze)]" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-7 rounded-xl bg-[color:var(--champagne)]/15 p-4 text-sm">
            <p className="font-medium">MRR total</p>
            <p className="mt-1 font-display text-3xl">${MEMBERS_SUBS.reduce((a, b) => a + b.mrr, 0).toLocaleString()}</p>
          </div>
        </div>
      </div>
    </>
  );
}

function AppointmentsView() {
  return (
    <div className="rounded-2xl border bg-card shadow-[var(--shadow-soft)]">
      <div className="flex items-center justify-between border-b p-6">
        <div>
          <p className="eyebrow">Hoy · {new Date().toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" })}</p>
          <h2 className="mt-1 font-display text-xl">8 citas programadas</h2>
        </div>
        <button className="btn-luxury !py-2.5 !text-[11px]">
          <Plus className="h-4 w-4" /> Nueva cita
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40 text-left text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            <tr>
              <th className="px-6 py-3">Hora</th>
              <th className="px-6 py-3">Cliente</th>
              <th className="px-6 py-3">Servicio</th>
              <th className="px-6 py-3">Barbero</th>
              <th className="px-6 py-3">Estado</th>
              <th className="px-6 py-3 text-right">Precio</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody>
            {APPOINTMENTS.map((a) => (
              <tr key={a.time} className="border-t hover:bg-secondary/30">
                <td className="px-6 py-4 font-display text-base text-[color:var(--bronze)]">{a.time}</td>
                <td className="px-6 py-4 font-medium">{a.client}</td>
                <td className="px-6 py-4 text-muted-foreground">{a.service}</td>
                <td className="px-6 py-4">{a.barber}</td>
                <td className="px-6 py-4">
                  <span className={`rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.18em] ${
                    a.status === "Confirmado" ? "bg-[color:var(--champagne)]/30 text-[color:var(--bronze)]" : "bg-secondary text-foreground/70"
                  }`}>{a.status}</span>
                </td>
                <td className="px-6 py-4 text-right font-display">${a.price}</td>
                <td className="px-6 py-4">
                  <button className="text-muted-foreground hover:text-foreground"><MoreHorizontal className="h-4 w-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ServicesView({ tenant }: { tenant: Tenant }) {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{tenant.services.length} servicios en el menú</p>
        <button className="btn-luxury !py-2.5 !text-[11px]"><Plus className="h-4 w-4" /> Nuevo servicio</button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {tenant.services.map((s) => (
          <div key={s.id} className="flex gap-4 overflow-hidden rounded-2xl border bg-card shadow-[var(--shadow-soft)]">
            <img src={s.image} alt={s.name} loading="lazy" className="h-32 w-32 shrink-0 object-cover" />
            <div className="flex flex-1 flex-col p-4">
              <div className="flex items-start justify-between">
                <h3 className="font-display text-lg">{s.name}</h3>
                <span className="font-display text-lg text-[color:var(--bronze)]">${s.price}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{s.description}</p>
              <div className="mt-auto flex items-center justify-between pt-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {s.durationMin} min</span>
                <button className="text-[color:var(--bronze)] hover:underline">Editar</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MembershipsView({ tenant }: { tenant: Tenant }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-3">
        {tenant.memberships.map((m, i) => (
          <div key={m.id} className="rounded-2xl border bg-card p-6 shadow-[var(--shadow-soft)]">
            <div className="flex items-center justify-between">
              <p className="eyebrow">{m.name}</p>
              {m.badge && <span className="rounded-full bg-[color:var(--champagne)] px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-charcoal">{m.badge}</span>}
            </div>
            <p className="mt-4 font-display text-4xl">${m.price}<span className="text-base text-muted-foreground">/mes</span></p>
            <div className="mt-4 grid grid-cols-2 gap-3 border-y py-4 text-center text-xs">
              <div>
                <p className="font-display text-2xl">{MEMBERS_SUBS[i]?.count ?? 0}</p>
                <p className="text-muted-foreground">Miembros</p>
              </div>
              <div>
                <p className="font-display text-2xl">${MEMBERS_SUBS[i]?.mrr.toLocaleString() ?? 0}</p>
                <p className="text-muted-foreground">MRR</p>
              </div>
            </div>
            <ul className="mt-4 space-y-2 text-sm">
              {m.benefits.map((b) => (
                <li key={b} className="flex items-start gap-2"><Check className="mt-0.5 h-3.5 w-3.5 text-[color:var(--bronze)]" /> {b}</li>
              ))}
            </ul>
            <button className="btn-ghost-luxury mt-6 w-full !py-2.5 !text-[11px]">Editar plan</button>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border bg-card p-6 shadow-[var(--shadow-soft)]">
        <p className="eyebrow">Suscriptores recientes</p>
        <h3 className="mt-1 font-display text-xl">Últimos clientes suscritos</h3>
        <ul className="mt-6 divide-y">
          {CUSTOMERS.slice(0, 5).map((c) => (
            <li key={c.email} className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-[color:var(--champagne)]/30 font-display text-sm">{c.name.charAt(0)}</span>
                <div>
                  <p className="font-medium">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.email}</p>
                </div>
              </div>
              <span className={`rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.18em] ${
                c.tier === "VIP" ? "bg-[color:var(--bronze)] text-cream" : c.tier === "Premium" ? "bg-[color:var(--champagne)] text-charcoal" : "bg-secondary text-foreground/70"
              }`}>{c.tier}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function CustomersView() {
  return (
    <div className="rounded-2xl border bg-card shadow-[var(--shadow-soft)]">
      <div className="flex items-center justify-between border-b p-6">
        <p className="text-sm text-muted-foreground">{CUSTOMERS.length} clientes en la casa</p>
        <button className="btn-luxury !py-2.5 !text-[11px]"><UserPlus className="h-4 w-4" /> Añadir cliente</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40 text-left text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            <tr>
              <th className="px-6 py-3">Cliente</th>
              <th className="px-6 py-3">Membresía</th>
              <th className="px-6 py-3 text-right">Visitas</th>
              <th className="px-6 py-3 text-right">Total gastado</th>
              <th className="px-6 py-3">Última visita</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody>
            {CUSTOMERS.map((c) => (
              <tr key={c.email} className="border-t hover:bg-secondary/30">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-[color:var(--champagne)]/30 font-display text-sm">{c.name.charAt(0)}</span>
                    <div>
                      <p className="font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.18em] ${
                    c.tier === "VIP" ? "bg-[color:var(--bronze)] text-cream" : c.tier === "Premium" ? "bg-[color:var(--champagne)] text-charcoal" : "bg-secondary text-foreground/70"
                  }`}>{c.tier}</span>
                </td>
                <td className="px-6 py-4 text-right">{c.visits}</td>
                <td className="px-6 py-4 text-right font-display">${c.spent.toLocaleString()}</td>
                <td className="px-6 py-4 text-muted-foreground">{c.lastVisit}</td>
                <td className="px-6 py-4">
                  <button className="inline-flex items-center gap-1 text-xs text-[color:var(--bronze)] hover:underline">Ver <ArrowUpRight className="h-3 w-3" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SettingsView({ tenant }: { tenant: Tenant }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-2xl border bg-card p-6 shadow-[var(--shadow-soft)]">
        <p className="eyebrow">Información general</p>
        <h3 className="mt-1 font-display text-xl">Datos de la casa</h3>
        <dl className="mt-6 space-y-4 text-sm">
          <Field label="Nombre" value={tenant.name} />
          <Field label="Ciudad" value={tenant.city} />
          <Field label="Dirección" value={tenant.address} />
          <Field label="Teléfono" value={tenant.phone} />
          <Field label="Email" value={tenant.email} />
          <Field label="URL pública" value={`/b/${tenant.slug}`} />
        </dl>
      </div>
      <div className="rounded-2xl border bg-card p-6 shadow-[var(--shadow-soft)]">
        <p className="eyebrow">Horario de atención</p>
        <h3 className="mt-1 font-display text-xl">Apertura semanal</h3>
        <ul className="mt-6 divide-y">
          {tenant.hours.map((h) => (
            <li key={h.day} className="flex items-center justify-between py-4 text-sm">
              <span className="text-foreground/80">{h.day}</span>
              <span className="font-display text-base">{h.hours}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b pb-3 last:border-0">
      <dt className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}