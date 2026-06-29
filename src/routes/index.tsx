import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { listPublicTenants, type TenantSummary } from "@/lib/tenants.functions";
import heroImg from "@/assets/hero-barbershop.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Maison — Premium Grooming Platform" },
      { name: "description", content: "Multi-tenant SaaS platform powering luxury barber shops and grooming houses." },
      { property: "og:title", content: "Maison — Premium Grooming Platform" },
      { property: "og:description", content: "Multi-tenant SaaS platform powering luxury barber shops and grooming houses." },
      { property: "og:url", content: "/" },
      { property: "og:locale", content: "en_US" },
      { property: "og:locale:alternate", content: "es_ES" },
    ],
    links: [
      { rel: "canonical", href: "/" },
      { rel: "alternate", hrefLang: "en", href: "/?lang=en" },
      { rel: "alternate", hrefLang: "es", href: "/?lang=es" },
      { rel: "alternate", hrefLang: "x-default", href: "/" },
    ],
  }),
  loader: () => listPublicTenants(),
  errorComponent: () => (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <h1 className="font-display text-3xl">Something went wrong</h1>
    </div>
  ),
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <h1 className="font-display text-3xl">Not found</h1>
    </div>
  ),
  component: Index,
});

function Index() {
  const tenants = Route.useLoaderData() as TenantSummary[];
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroImg} alt="" className="h-full w-full object-cover opacity-25" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/70 to-background" />
        </div>
        <div className="container-luxury relative py-28 md:py-36">
          <p className="eyebrow animate-fade-up">The Maison platform</p>
          <h1 className="mt-6 font-display text-5xl leading-[0.95] text-foreground md:text-7xl lg:text-8xl animate-fade-up">
            A grooming house,<br />
            <span className="italic text-[color:var(--bronze)]">considered.</span>
          </h1>
          <p className="mt-8 max-w-xl text-base text-muted-foreground md:text-lg animate-fade-up">
            Maison is the multi-tenant platform behind the world's most considered barber shops — bookings, memberships and a member-first website, in one elegant system.
          </p>
          <div className="mt-10 flex flex-wrap gap-3 animate-fade-up">
            <Link to="/b/$slug" params={{ slug: "elite-barber" }} className="btn-luxury">
              Visit a demo house
            </Link>
            <a href="#houses" className="btn-ghost-luxury">Explore houses</a>
            <Link to="/auth" className="btn-ghost-luxury">Sign in</Link>
          </div>
        </div>
      </section>

      <section id="houses" className="container-luxury py-24 md:py-32">
        <div className="flex items-end justify-between gap-6 flex-wrap">
          <div>
            <p className="eyebrow">Demo tenants</p>
            <h2 className="mt-3 font-display text-4xl md:text-5xl">Two houses on the platform</h2>
          </div>
          <p className="max-w-md text-sm text-muted-foreground">
            Each business gets its own URL, brand, services, memberships and admin — fully isolated, beautifully presented.
          </p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {tenants.map((t) => (
            <Link key={t.slug} to="/b/$slug" params={{ slug: t.slug }} className="group relative block overflow-hidden rounded-2xl border bg-card shadow-[var(--shadow-soft)] transition hover:shadow-[var(--shadow-luxury)]">
              <div className="relative aspect-[4/3] overflow-hidden">
                <img src={t.heroImage ?? heroImg} alt={t.name} className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal/70 via-transparent" />
                <div className="absolute left-6 top-6">
                  <span className="rounded-full bg-background/85 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-foreground/80">
                    {t.city ?? ""}
                  </span>
                </div>
              </div>
              <div className="p-7">
                <h3 className="font-display text-3xl">{t.name}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{t.tagline}</p>
                <div className="mt-6 flex items-center justify-between">
                  <span className="text-xs uppercase tracking-[0.22em] text-[color:var(--bronze)]">/b/{t.slug}</span>
                  <span className="text-sm font-medium">Enter →</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <footer className="border-t bg-secondary/40">
        <div className="container-luxury py-10 flex flex-wrap items-center justify-between gap-3 text-xs uppercase tracking-[0.22em] text-muted-foreground">
          <span>© {new Date().getFullYear()} Maison Platform</span>
          <span>Premium grooming, powered.</span>
        </div>
      </footer>
    </main>
  );
}
