import { createFileRoute, Link, useRouter, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  LayoutDashboard, Store, Users2, CreditCard, Receipt, Ticket, Bell, Settings,
  BarChart3, TrendingUp, Crown, Calendar, UserCircle2, FileText, Library, Folder, ScrollText,
  Search, HelpCircle, Plus, Building2, UserPlus, FilePlus2, PenSquare, ArrowUpRight,
  Store as StoreIcon, DollarSign, Menu, X,
} from "lucide-react";
import {
  listAllTenants, createTenant, updateTenant, setTenantStatus, deleteTenant,
  getPlatformStats, listPlatformUsers, createPlatformUser, resetUserPassword, deletePlatformUser,
  setUserRoles,
  listServiceTemplates, upsertServiceTemplate, deleteServiceTemplate,
  listMembershipTemplates, upsertMembershipTemplate, deleteMembershipTemplate,
  applyTemplatesToTenant, listAuditLogs,
  type AdminTenant, type ServiceTemplate, type MembershipTemplate, type PlatformUser,
} from "@/lib/admin.functions";
import { assignBusinessOwner } from "@/lib/business-admin.functions";
import { supabase } from "@/integrations/supabase/client";
import { getMyAccess } from "@/lib/access.functions";

function buildTenantPublicUrl(slug: string): string {
  if (typeof window === "undefined") return `/b/${slug}`;
  const { protocol, host } = window.location;
  // Preview hosts: id-preview--<id>.lovable.app  →  rewrite to published host project--<id>.lovable.app
  const previewMatch = host.match(/^id-preview--([a-z0-9-]+)\.lovable\.app$/i);
  const base = previewMatch ? `https://project--${previewMatch[1]}.lovable.app` : `${protocol}//${host}`;
  return `${base}/b/${slug}`;
}

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    const access = await getMyAccess();
    if (!access.isSuperAdmin) {
      if (access.businessSlugs.length > 0) {
        throw redirect({ to: "/b/$slug/admin", params: { slug: access.businessSlugs[0] } });
      }
      throw redirect({ to: "/forbidden" });
    }
    return { access };
  },
  component: SuperAdmin,
});

type Section = "overview" | "tenants" | "users" | "templates" | "audit";

type NavItem = { id: Section; label: string; Icon: React.ComponentType<{ className?: string }>; soon?: boolean };
const NAV_GROUPS: { title?: string; items: NavItem[] }[] = [
  { items: [{ id: "overview", label: "Dashboard", Icon: LayoutDashboard }] },
  {
    title: "Platform",
    items: [
      { id: "tenants", label: "Tenants (Negocios)", Icon: Store },
      { id: "users", label: "Usuarios", Icon: Users2 },
      { id: "tenants", label: "Planes & Suscripciones", Icon: CreditCard, soon: true },
      { id: "tenants", label: "Pagos & Facturación", Icon: Receipt, soon: true },
      { id: "tenants", label: "Cupones", Icon: Ticket, soon: true },
      { id: "audit", label: "Notificaciones", Icon: Bell, soon: true },
      { id: "overview", label: "Configuraciones", Icon: Settings, soon: true },
    ],
  },
  {
    title: "Reportes",
    items: [
      { id: "overview", label: "Analytics Global", Icon: BarChart3 },
      { id: "overview", label: "Ingresos", Icon: TrendingUp },
      { id: "templates", label: "Membresías", Icon: Crown },
      { id: "tenants", label: "Citas", Icon: Calendar, soon: true },
      { id: "users", label: "Clientes", Icon: UserCircle2, soon: true },
    ],
  },
  {
    title: "Herramientas",
    items: [
      { id: "templates", label: "Plantillas de Servicios", Icon: FileText },
      { id: "templates", label: "Plantillas de Membresías", Icon: Library },
      { id: "templates", label: "Recursos", Icon: Folder, soon: true },
      { id: "audit", label: "Logs de Actividad", Icon: ScrollText },
    ],
  },
];

function SuperAdmin() {
  const router = useRouter();
  const qc = useQueryClient();
  const [section, setSection] = useState<Section>("overview");
  const [activeKey, setActiveKey] = useState<string>("Dashboard");
  const [mobileNav, setMobileNav] = useState(false);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-[#f7f5f0] flex text-[#1c1c20]">
      {/* Mobile nav backdrop */}
      {mobileNav && (
        <button
          aria-label="Cerrar menú"
          onClick={() => setMobileNav(false)}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden animate-fade-in"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 flex flex-col bg-[#161618] text-neutral-300 transform transition-transform duration-300 ease-out lg:static lg:translate-x-0 lg:w-64 ${
          mobileNav ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
      >
        <div className="px-6 py-6 border-b border-white/5 flex items-center gap-3">
          <div className="h-10 w-10 rounded-md bg-gradient-to-br from-[#d4a85a] to-[#8a6a2e] grid place-items-center">
            <Crown className="h-5 w-5 text-[#161618]" />
          </div>
          <div className="flex-1">
            <p className="font-display text-[15px] tracking-[0.18em] text-white leading-none">ELITE BARBER</p>
            <p className="text-[10px] tracking-[0.45em] text-[#d4a85a] mt-1">CLUB</p>
          </div>
          <button
            onClick={() => setMobileNav(false)}
            className="lg:hidden h-8 w-8 grid place-items-center rounded-md text-neutral-400 hover:text-white hover:bg-white/5 transition"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-5">
          {NAV_GROUPS.map((g, gi) => (
            <div key={gi}>
              {g.title && <p className="px-3 pb-2 text-[10px] tracking-[0.3em] text-neutral-500 uppercase">{g.title}</p>}
              <ul className="space-y-0.5">
                {g.items.map((it) => {
                  const active = activeKey === it.label;
                  return (
                    <li key={it.label}>
                      <button
                        onClick={() => { setActiveKey(it.label); setSection(it.id); setMobileNav(false); }}
                        className={`group w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-all duration-200 ${
                          active
                            ? "bg-[#d4a85a]/15 text-[#d4a85a] shadow-[inset_2px_0_0_0_#d4a85a]"
                            : "text-neutral-400 hover:text-white hover:bg-white/5 hover:translate-x-0.5"
                        }`}
                      >
                        <it.Icon className={`h-4 w-4 transition-transform duration-200 ${active ? "" : "group-hover:scale-110"}`} />
                        <span className="truncate">{it.label}</span>
                        {it.soon && <span className="ml-auto text-[9px] tracking-widest text-neutral-600 group-hover:text-neutral-400 transition-colors">SOON</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
        <div className="border-t border-white/5 p-3">
          <div className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-white/5 transition-colors">
            <div className="h-9 w-9 rounded-md bg-gradient-to-br from-[#d4a85a] to-[#8a6a2e] grid place-items-center">
              <Crown className="h-4 w-4 text-[#161618]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">Elite Barber Club</p>
              <p className="text-[11px] text-neutral-500">Super Admin</p>
            </div>
            <button onClick={signOut} title="Cerrar sesión" className="text-neutral-500 hover:text-white text-xs transition-colors">⋮</button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-black/5 px-4 sm:px-6 lg:px-10 py-3 sm:py-4 flex items-center gap-3 sm:gap-4">
          <button
            onClick={() => setMobileNav(true)}
            className="lg:hidden h-9 w-9 grid place-items-center rounded-md border border-black/5 bg-white hover:bg-black/5 transition"
            aria-label="Abrir menú"
          >
            <Menu className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1 lg:flex-none">
            <h1 className="font-display text-lg sm:text-2xl leading-tight truncate">{activeKey}</h1>
            <p className="text-[11px] sm:text-xs text-neutral-500 hidden sm:block">Resumen general de la plataforma</p>
          </div>
          <div className="hidden lg:block flex-1" />
          <div className="hidden md:flex items-center gap-2 rounded-lg border border-black/5 bg-white px-3 py-2 w-[260px] xl:w-[320px] focus-within:ring-2 focus-within:ring-[#d4a85a]/30 focus-within:border-[#d4a85a]/40 transition-all">
            <Search className="h-4 w-4 text-neutral-400" />
            <input placeholder="Buscar negocios, usuarios..." className="flex-1 bg-transparent text-sm outline-none placeholder:text-neutral-400" />
            <kbd className="text-[10px] text-neutral-400 border rounded px-1.5 py-0.5">⌘K</kbd>
          </div>
          <button className="md:hidden h-9 w-9 grid place-items-center rounded-full hover:bg-black/5 transition" aria-label="Buscar">
            <Search className="h-4 w-4 text-neutral-600" />
          </button>
          <button className="relative h-9 w-9 grid place-items-center rounded-full hover:bg-black/5 transition active:scale-95">
            <Bell className="h-4 w-4 text-neutral-600" />
            <span className="absolute -top-0.5 -right-0.5 bg-[#d4a85a] text-[10px] text-white rounded-full h-4 w-4 grid place-items-center animate-pulse">3</span>
          </button>
          <button className="hidden sm:grid h-9 w-9 place-items-center rounded-full hover:bg-black/5 transition"><HelpCircle className="h-4 w-4 text-neutral-600" /></button>
          <div className="flex items-center gap-2 pl-2 sm:pl-3 sm:border-l">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[#d4a85a] to-[#8a6a2e] grid place-items-center text-white text-sm font-medium ring-2 ring-white shadow-sm">SA</div>
            <div className="text-right hidden xl:block">
              <p className="text-sm font-medium leading-tight">Super Admin</p>
              <p className="text-[11px] text-neutral-500">superadmin@elite.com</p>
            </div>
          </div>
        </header>

        <main className="px-4 sm:px-6 lg:px-10 py-5 sm:py-6 lg:py-8 flex-1 animate-fade-in">
          {section === "overview" && <OverviewSection onJump={(s) => { setSection(s); setActiveKey(s === "tenants" ? "Tenants (Negocios)" : s === "users" ? "Usuarios" : s === "templates" ? "Plantillas de Servicios" : s === "audit" ? "Logs de Actividad" : "Dashboard"); }} />}
          {section === "tenants" && <TenantsSection />}
          {section === "users" && <UsersSection />}
          {section === "templates" && <TemplatesSection />}
          {section === "audit" && <AuditSection />}
        </main>

        <footer className="px-4 sm:px-6 lg:px-10 py-4 text-[11px] text-neutral-500 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 border-t border-black/5 bg-white/40">
          <p>© {new Date().getFullYear()} Elite Barber Club. Todos los derechos reservados.</p>
          <p>Versión 1.0.0</p>
        </footer>
      </div>
    </div>
  );
}

/* ============== OVERVIEW ============== */

function OverviewSection({ onJump }: { onJump: (s: Section) => void }) {
  const stats = useServerFn(getPlatformStats);
  const q = useQuery({ queryKey: ["plat-stats"], queryFn: () => stats() });

  if (q.isLoading) return <OverviewSkeleton />;
  if (q.error) return <p className="text-red-600">{(q.error as Error).message}</p>;
  const d = q.data!;
  const growth = d.growth.appointmentsPrev30d === 0
    ? (d.growth.appointments30d > 0 ? 100 : 0)
    : Math.round(((d.growth.appointments30d - d.growth.appointmentsPrev30d) / d.growth.appointmentsPrev30d) * 100);

  const planColors: Record<string, string> = { starter: "#1c1c20", pro: "#d4a85a", elite: "#ead7ad" };
  const planLabels: Record<string, string> = { starter: "Plan Básico", pro: "Plan Premium", elite: "Plan VIP" };

  return (
    <div className="space-y-6">
      {/* CTA bar */}
      <div className="flex justify-end">
        <button onClick={() => onJump("tenants")} className="inline-flex items-center gap-2 rounded-md bg-[#d4a85a] hover:bg-[#c1974b] text-white px-4 py-2.5 text-sm font-medium shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200">
          <Plus className="h-4 w-4" /> Crear Nuevo Negocio
        </button>
      </div>

      {/* KPI row */}
      <section className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <Kpi icon={<StoreIcon className="h-5 w-5" />} label="Total Negocios" value={d.totals.businesses} delta={`+${d.growth.newBusinesses30d}`} sub="Negocios activos en la plataforma" />
        <Kpi icon={<Users2 className="h-5 w-5" />} label="Usuarios Activos" value={d.totals.customers} delta={`+${d.growth.newCustomers30d}`} sub="Administradores y empleados" />
        <Kpi icon={<Crown className="h-5 w-5" />} label="Membresías Activas" value={d.totals.members.toLocaleString()} delta={`+${Math.round((d.totals.members / Math.max(d.totals.customers, 1)) * 100)}%`} sub="Suscripciones activas" />
        <Kpi icon={<DollarSign className="h-5 w-5" />} label="Ingresos Mensuales" value={`$${d.totals.mrr.toLocaleString()}`} delta="+23%" sub="Ingresos recurrentes (MRR)" />
        <Kpi icon={<Calendar className="h-5 w-5" />} label="Citas este Mes" value={d.growth.appointments30d.toLocaleString()} delta={`${growth >= 0 ? "+" : ""}${growth}%`} sub="Citas programadas" />
      </section>

      {/* Charts + Activity */}
      <section className="grid gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-5" hover>
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-medium text-base">Ingresos Recurrentes</h2>
              <div className="flex items-end gap-3 mt-3">
                <p className="font-display text-3xl">${(d.revenueByMonth.reduce((a, b) => a + b.value, 0)).toLocaleString()}</p>
                <span className="text-emerald-600 text-xs pb-1.5">↑ 24.5% vs período anterior</span>
              </div>
            </div>
            <button className="text-xs text-neutral-500 border rounded-md px-3 py-1.5 hover:bg-black/5 transition">Últimos 6 meses ▾</button>
          </div>
          <div className="mt-4">
            <LineChart data={d.revenueByMonth} />
          </div>
        </Card>

        <Card className="lg:col-span-4" hover>
          <h2 className="font-medium text-base">Distribución de Planes</h2>
          <div className="mt-4 flex flex-col sm:flex-row items-center gap-6">
            <Donut data={d.planDistribution.map((p) => ({ label: planLabels[p.plan] ?? p.plan, value: p.count, color: planColors[p.plan] ?? "#999" }))} />
            <ul className="space-y-3 text-sm flex-1">
              {d.planDistribution.length === 0 && <li className="text-neutral-500 text-xs">Sin datos</li>}
              {d.planDistribution.map((p) => {
                const total = d.planDistribution.reduce((a, b) => a + b.count, 0) || 1;
                const pct = ((p.count / total) * 100).toFixed(1);
                return (
                  <li key={p.plan} className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: planColors[p.plan] ?? "#999" }} />
                    <span className="flex-1">{planLabels[p.plan] ?? p.plan}</span>
                    <span className="text-neutral-500">{p.count} ({pct}%)</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </Card>

        <Card className="lg:col-span-3" hover>
          <h2 className="font-medium text-base">Actividad Reciente</h2>
          <ul className="mt-4 space-y-3.5">
            {d.recentActivity.length === 0 && <li className="text-xs text-neutral-500">Sin actividad reciente.</li>}
            {d.recentActivity.map((a, idx) => (
              <li key={a.id} className="flex items-start gap-3 animate-fade-in" style={{ animationDelay: `${idx * 40}ms`, animationFillMode: "backwards" }}>
                <div className="h-8 w-8 rounded-full bg-[#d4a85a]/15 text-[#8a6a2e] grid place-items-center flex-shrink-0 transition-transform hover:scale-110">
                  <Building2 className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] text-neutral-600 leading-tight">{prettyAction(a.action)}</p>
                  <p className="text-sm font-medium truncate">{a.businessName ?? "—"}</p>
                </div>
                <span className="text-[11px] text-neutral-400 whitespace-nowrap">{timeAgo(a.createdAt)}</span>
              </li>
            ))}
          </ul>
          <button onClick={() => onJump("audit")} className="mt-4 text-xs text-[#8a6a2e] hover:text-[#d4a85a] inline-flex items-center gap-1 group transition-colors">
            Ver toda la actividad <ArrowUpRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </button>
        </Card>
      </section>

      {/* Recent businesses + side widgets */}
      <section className="grid gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-9" hover>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="font-medium text-base">Negocios Recientes</h2>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-md border bg-white px-3 py-1.5 text-xs focus-within:ring-2 focus-within:ring-[#d4a85a]/30 focus-within:border-[#d4a85a]/40 transition-all">
                <Search className="h-3.5 w-3.5 text-neutral-400" />
                <input placeholder="Buscar negocio..." className="bg-transparent outline-none w-32 sm:w-40" />
              </div>
              <button onClick={() => onJump("tenants")} className="rounded-md bg-[#d4a85a] hover:bg-[#c1974b] text-white text-xs px-3 py-1.5 transition-all hover:shadow-md active:scale-95">Ver Todos</button>
            </div>
          </div>
          <div className="mt-4 -mx-2 overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead className="text-[11px] uppercase tracking-wider text-neutral-500">
                <tr className="text-left">
                  <th className="px-2 py-2 font-medium">Negocio</th>
                  <th className="px-2 py-2 font-medium">Plan</th>
                  <th className="px-2 py-2 font-medium">Miembros</th>
                  <th className="px-2 py-2 font-medium">Ingresos (Mes)</th>
                  <th className="px-2 py-2 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {d.topTenants.length === 0 && <tr><td colSpan={5} className="px-2 py-8 text-center text-neutral-500 text-sm">Aún no hay negocios.</td></tr>}
                {d.topTenants.map((t) => (
                  <tr key={t.id} className="border-t hover:bg-[#faf7f0] transition-colors">
                    <td className="px-2 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-md bg-gradient-to-br from-[#d4a85a] to-[#8a6a2e] grid place-items-center text-white text-xs shadow-sm">
                          <Crown className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium leading-tight">{t.name}</p>
                          <p className="text-[11px] text-neutral-500">{t.slug}.com</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-3"><PlanBadge plan="pro" /></td>
                    <td className="px-2 py-3">{t.members}</td>
                    <td className="px-2 py-3">${t.mrr.toLocaleString()}</td>
                    <td className="px-2 py-3"><span className="text-emerald-600 text-xs font-medium">Activo</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="lg:col-span-3 space-y-4">
          <Card hover>
            <h2 className="font-medium text-base">Suscripciones por Vencer</h2>
            <ul className="mt-4 space-y-3">
              {d.expiringSubscriptions.length === 0 && <li className="text-xs text-neutral-500">Ninguna próxima a vencer.</li>}
              {d.expiringSubscriptions.map((s, i) => (
                <li key={i} className="flex items-center justify-between gap-2 hover:translate-x-0.5 transition-transform">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{s.businessName}</p>
                    <p className="text-[11px] text-neutral-500">Renovación en {s.daysLeft} días</p>
                  </div>
                  <PlanBadge plan={s.tier.toLowerCase()} />
                </li>
              ))}
            </ul>
            <button onClick={() => onJump("tenants")} className="mt-4 text-xs text-[#8a6a2e] hover:text-[#d4a85a] inline-flex items-center gap-1 group transition-colors">
              Ver todas las suscripciones <ArrowUpRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </button>
          </Card>

          <Card hover>
            <h2 className="font-medium text-base">Acciones Rápidas</h2>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <QuickAction icon={<Building2 className="h-4 w-4" />} label="Crear Negocio" onClick={() => onJump("tenants")} />
              <QuickAction icon={<UserPlus className="h-4 w-4" />} label="Invitar Usuario" onClick={() => onJump("users")} />
              <QuickAction icon={<FilePlus2 className="h-4 w-4" />} label="Crear Plantilla" onClick={() => onJump("templates")} />
              <QuickAction icon={<PenSquare className="h-4 w-4" />} label="Ver Reportes" onClick={() => onJump("audit")} />
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}

function Card({ children, className = "", hover = false }: { children: React.ReactNode; className?: string; hover?: boolean }) {
  const hoverCls = hover ? "transition-all duration-300 hover:shadow-[0_8px_24px_-12px_rgba(0,0,0,0.15)] hover:border-black/10 hover:-translate-y-0.5" : "";
  return <div className={`rounded-xl bg-white border border-black/5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-5 ${hoverCls} ${className}`}>{children}</div>;
}

function Kpi({ icon, label, value, delta, sub }: { icon: React.ReactNode; label: string; value: React.ReactNode; delta?: string; sub?: string }) {
  const positive = delta?.startsWith("+");
  return (
    <Card className="group cursor-default" hover>
      <div className="flex items-start gap-3">
        <div className="h-11 w-11 rounded-full bg-[#f4ecd8] text-[#8a6a2e] grid place-items-center flex-shrink-0 transition-all duration-300 group-hover:bg-[#d4a85a] group-hover:text-white group-hover:scale-110 group-hover:rotate-3 group-hover:shadow-md">{icon}</div>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] text-neutral-500">{label}</p>
          <div className="flex items-baseline gap-2 mt-1">
            <p className="font-display text-2xl leading-none tracking-tight">{value}</p>
            {delta && <span className={`text-[11px] ${positive ? "text-emerald-600" : "text-neutral-500"}`}>↑ {delta.replace("+", "")}</span>}
          </div>
          {sub && <p className="text-[11px] text-neutral-500 mt-2 leading-tight">{sub}</p>}
        </div>
      </div>
    </Card>
  );
}

function PlanBadge({ plan }: { plan: string }) {
  const p = (plan || "").toLowerCase();
  const map: Record<string, string> = {
    starter: "bg-neutral-100 text-neutral-700",
    basic: "bg-neutral-100 text-neutral-700",
    pro: "bg-[#f4ecd8] text-[#8a6a2e]",
    premium: "bg-[#f4ecd8] text-[#8a6a2e]",
    elite: "bg-[#1c1c20] text-[#d4a85a]",
    vip: "bg-[#1c1c20] text-[#d4a85a]",
    gold: "bg-[#f4ecd8] text-[#8a6a2e]",
  };
  const label = p === "starter" ? "Básico" : p === "pro" ? "Premium" : p === "elite" ? "VIP" : plan;
  return <span className={`inline-flex rounded-md px-2.5 py-0.5 text-[11px] font-medium ${map[p] ?? "bg-neutral-100 text-neutral-700"}`}>{label}</span>;
}

function QuickAction({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="group rounded-lg border border-black/5 bg-[#fafaf7] hover:bg-white hover:border-[#d4a85a]/40 hover:shadow-sm hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 p-3 text-left">
      <div className="h-8 w-8 rounded-md bg-white border grid place-items-center text-neutral-600 group-hover:text-[#8a6a2e] group-hover:border-[#d4a85a]/40 transition-colors">{icon}</div>
      <p className="mt-2 text-xs font-medium">{label}</p>
    </button>
  );
}

/* ============== SKELETONS ============== */

function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-gradient-to-r from-neutral-200/70 via-neutral-100 to-neutral-200/70 bg-[length:200%_100%] ${className}`} />;
}

function OverviewSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-end"><SkeletonBlock className="h-10 w-44" /></div>
      <section className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-xl bg-white border border-black/5 p-5">
            <div className="flex items-start gap-3">
              <SkeletonBlock className="h-11 w-11 rounded-full" />
              <div className="flex-1 space-y-2">
                <SkeletonBlock className="h-3 w-20" />
                <SkeletonBlock className="h-6 w-16" />
                <SkeletonBlock className="h-2 w-full" />
              </div>
            </div>
          </div>
        ))}
      </section>
      <section className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-5 rounded-xl bg-white border border-black/5 p-5 space-y-4">
          <SkeletonBlock className="h-4 w-40" /><SkeletonBlock className="h-8 w-32" /><SkeletonBlock className="h-[200px] w-full" />
        </div>
        <div className="lg:col-span-4 rounded-xl bg-white border border-black/5 p-5 space-y-4">
          <SkeletonBlock className="h-4 w-40" />
          <div className="flex items-center gap-6"><SkeletonBlock className="h-40 w-40 rounded-full" /><div className="flex-1 space-y-2"><SkeletonBlock className="h-3 w-full" /><SkeletonBlock className="h-3 w-3/4" /><SkeletonBlock className="h-3 w-2/3" /></div></div>
        </div>
        <div className="lg:col-span-3 rounded-xl bg-white border border-black/5 p-5 space-y-3">
          <SkeletonBlock className="h-4 w-40" />
          {Array.from({ length: 4 }).map((_, i) => <SkeletonBlock key={i} className="h-10 w-full" />)}
        </div>
      </section>
    </div>
  );
}

function LineChart({ data }: { data: Array<{ label: string; value: number }> }) {
  const W = 520, H = 200, pad = 30;
  const max = Math.max(1, ...data.map((d) => d.value));
  const step = data.length > 1 ? (W - pad * 2) / (data.length - 1) : 0;
  const points = data.map((d, i) => [pad + i * step, H - pad - (d.value / max) * (H - pad * 2)] as const);
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = `${path} L${(pad + (data.length - 1) * step).toFixed(1)},${H - pad} L${pad},${H - pad} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[200px]">
      <defs>
        <linearGradient id="rev" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#d4a85a" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#d4a85a" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map((t) => (
        <line key={t} x1={pad} x2={W - pad / 2} y1={pad + t * (H - pad * 2)} y2={pad + t * (H - pad * 2)} stroke="#eee" strokeDasharray="2 3" />
      ))}
      <path d={area} fill="url(#rev)" />
      <path d={path} fill="none" stroke="#d4a85a" strokeWidth="2" />
      {points.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="3" fill="#d4a85a" />)}
      {data.map((d, i) => (
        <text key={i} x={pad + i * step} y={H - 8} textAnchor="middle" fontSize="10" fill="#999">{d.label}</text>
      ))}
    </svg>
  );
}

function Donut({ data }: { data: Array<{ label: string; value: number; color: string }> }) {
  const total = data.reduce((a, b) => a + b.value, 0);
  const R = 64, r = 44, C = 2 * Math.PI * R;
  let offset = 0;
  return (
    <div className="relative" style={{ width: 160, height: 160 }}>
      <svg viewBox="0 0 160 160" className="-rotate-90">
        <circle cx="80" cy="80" r={R} fill="none" stroke="#f1ede3" strokeWidth={R - r} />
        {total > 0 && data.map((d, i) => {
          const len = (d.value / total) * C;
          const dash = `${len} ${C - len}`;
          const el = <circle key={i} cx="80" cy="80" r={R} fill="none" stroke={d.color} strokeWidth={R - r} strokeDasharray={dash} strokeDashoffset={-offset} />;
          offset += len;
          return el;
        })}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="font-display text-2xl leading-none">{total}</p>
          <p className="text-[11px] text-neutral-500 mt-1">Total</p>
        </div>
      </div>
    </div>
  );
}

function prettyAction(a: string) {
  const map: Record<string, string> = {
    "tenant.create": "Nuevo negocio registrado",
    "tenant.update": "Negocio actualizado",
    "tenant.published": "Negocio publicado",
    "tenant.suspended": "Negocio suspendido",
    "tenant.draft": "Negocio despublicado",
    "tenant.delete": "Negocio eliminado",
    "tenant.apply_templates": "Plantillas aplicadas",
    "user.create": "Nuevo usuario invitado",
    "user.password_reset": "Contraseña restablecida",
    "user.delete": "Usuario eliminado",
  };
  return map[a] ?? a;
}
function timeAgo(iso: string) {
  const s = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `Hace ${s}s`;
  const m = Math.round(s / 60); if (m < 60) return `Hace ${m} min`;
  const h = Math.round(m / 60); if (h < 24) return `Hace ${h}h`;
  const d = Math.round(h / 24); return `Hace ${d}d`;
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
                    <a
                      href={buildTenantPublicUrl(t.slug)}
                      target="_blank"
                      rel="noreferrer"
                      title={buildTenantPublicUrl(t.slug)}
                      className="rounded-full border border-[color:var(--bronze)] px-3 py-1 text-xs text-[color:var(--bronze)] hover:bg-[color:var(--bronze)] hover:text-white transition"
                    >
                      Ver sitio ↗
                    </a>
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