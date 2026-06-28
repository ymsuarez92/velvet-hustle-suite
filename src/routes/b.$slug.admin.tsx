import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { getTenant, type Tenant } from "@/data/tenants";
import { Crown, LayoutDashboard, Calendar, Scissors, Users, BadgeCheck, Image as ImageIcon, Settings, TrendingUp } from "lucide-react";

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
  component: AdminPlaceholder,
});

const NAV = [
  { icon: LayoutDashboard, label: "Dashboard", active: true },
  { icon: Calendar, label: "Appointments" },
  { icon: Scissors, label: "Services" },
  { icon: BadgeCheck, label: "Memberships" },
  { icon: Users, label: "Customers" },
  { icon: ImageIcon, label: "Website CMS" },
  { icon: Settings, label: "Settings" },
];

function AdminPlaceholder() {
  const { tenant } = Route.useLoaderData();
  return (
    <div className="min-h-screen bg-secondary/40">
      <div className="grid min-h-screen md:grid-cols-[260px_1fr]">
        <aside className="hidden border-r bg-sidebar text-sidebar-foreground md:block">
          <div className="flex h-20 items-center gap-3 border-b border-sidebar-border px-6">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-[color:var(--cream)]">
              <Crown className="h-4 w-4 text-[color:var(--bronze)]" />
            </span>
            <div>
              <p className="font-display text-lg leading-none">{tenant.name}</p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.22em] opacity-60">Admin</p>
            </div>
          </div>
          <nav className="px-3 py-4">
            {NAV.map((n) => (
              <button
                key={n.label}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                  n.active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                }`}
              >
                <n.icon className="h-4 w-4" />
                {n.label}
              </button>
            ))}
          </nav>
        </aside>

        <div>
          <header className="flex h-20 items-center justify-between border-b bg-background px-6 md:px-10">
            <div>
              <p className="eyebrow">Overview</p>
              <h1 className="mt-1 font-display text-2xl">Dashboard</h1>
            </div>
            <Link to="/b/$slug" params={{ slug: tenant.slug }} className="btn-ghost-luxury !py-2 !text-[11px]">
              View landing
            </Link>
          </header>

          <main className="space-y-6 p-6 md:p-10">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Monthly revenue", value: "$12,450", delta: "+12.5%" },
                { label: "Appointments", value: "156", delta: "+8.2%" },
                { label: "Active members", value: "87", delta: "+15.3%" },
                { label: "New customers", value: "23", delta: "+5.1%" },
              ].map((k) => (
                <div key={k.label} className="rounded-2xl border bg-card p-6 shadow-[var(--shadow-soft)]">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">{k.label}</p>
                  <p className="mt-3 font-display text-3xl">{k.value}</p>
                  <p className="mt-2 inline-flex items-center gap-1 text-xs text-[color:var(--bronze)]">
                    <TrendingUp className="h-3 w-3" /> {k.delta}
                  </p>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border bg-card p-10 text-center shadow-[var(--shadow-soft)]">
              <p className="eyebrow">Coming next</p>
              <h2 className="mt-3 font-display text-3xl">The full admin suite is in the next build</h2>
              <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground">
                Appointments, services, memberships, CRM, CMS and the dynamic availability engine will land once we enable Lovable Cloud and wire up the multi-tenant schema.
              </p>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}