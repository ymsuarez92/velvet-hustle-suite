import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { getTenant, type Tenant } from "@/data/tenants";
import {
  Scissors,
  Sparkles,
  Crown,
  Star,
  MapPin,
  Phone,
  Instagram,
  MessageCircle,
  Mail,
  Clock,
  ArrowRight,
  Check,
} from "lucide-react";

export const Route = createFileRoute("/b/$slug")({
  head: ({ params }) => {
    const t = getTenant(params.slug);
    const title = t ? `${t.name} — Premium Grooming, ${t.city}` : "Maison House";
    const desc = t?.tagline ?? "A premium grooming experience.";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        ...(t ? [{ property: "og:image", content: t.hero.image } as const] : []),
      ],
    };
  },
  loader: ({ params }) => {
    const tenant = getTenant(params.slug);
    if (!tenant) throw notFound();
    return { tenant };
  },
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <p className="eyebrow">Not found</p>
        <h1 className="mt-4 font-display text-4xl">This house doesn't exist</h1>
        <Link to="/" className="btn-luxury mt-8">Back home</Link>
      </div>
    </div>
  ),
  errorComponent: () => (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="font-display text-3xl">Something went wrong</h1>
        <Link to="/" className="btn-luxury mt-8">Back home</Link>
      </div>
    </div>
  ),
  component: TenantLanding,
});

function TenantLanding() {
  const { tenant } = Route.useLoaderData();
  return (
    <main className="min-h-screen bg-background text-foreground">
      <Navbar tenant={tenant} />
      <Hero tenant={tenant} />
      <Pillars tenant={tenant} />
      <Services tenant={tenant} />
      <Memberships tenant={tenant} />
      <Gallery tenant={tenant} />
      <Testimonials tenant={tenant} />
      <Contact tenant={tenant} />
      <Footer tenant={tenant} />
      <WhatsAppFab tenant={tenant} />
    </main>
  );
}

/* ------------------------------------------------------------------ */

function Navbar({ tenant }: { tenant: Tenant }) {
  const links = [
    { href: "#home", label: "Home" },
    { href: "#services", label: "Services" },
    { href: "#memberships", label: "Memberships" },
    { href: "#gallery", label: "Gallery" },
    { href: "#testimonials", label: "About" },
    { href: "#contact", label: "Contact" },
  ];
  return (
    <header className="sticky top-0 z-40 glass-nav">
      <div className="container-luxury flex h-16 items-center justify-between md:h-20">
        <Link to="/b/$slug" params={{ slug: tenant.slug }} className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-foreground text-background">
            <Crown className="h-4 w-4 text-[color:var(--champagne)]" />
          </span>
          <span className="flex flex-col leading-none">
            <span className="font-display text-lg tracking-tight md:text-xl">{tenant.name}</span>
            <span className="mt-1 text-[9px] uppercase tracking-[0.3em] text-[color:var(--bronze)]">Barber Club</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-7 md:flex">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="text-[13px] font-medium text-foreground/75 transition hover:text-[color:var(--bronze)]">
              {l.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <div className="hidden items-center rounded-full bg-foreground p-1 text-[11px] font-medium md:flex">
            <span className="rounded-full bg-background px-3 py-1 text-foreground">EN</span>
            <span className="px-3 py-1 text-background/70">ES</span>
          </div>
          <a href="#book" className="hidden items-center gap-2 rounded-full border border-foreground/15 bg-background/80 px-4 py-2 text-xs font-medium backdrop-blur md:inline-flex">
            <MessageCircle className="h-3.5 w-3.5" /> Book
          </a>
          <Link
            to="/b/$slug/admin"
            params={{ slug: tenant.slug }}
            className="hidden text-[11px] uppercase tracking-[0.22em] text-foreground/50 hover:text-foreground md:block"
          >
            Admin
          </Link>
          <a href="#memberships" className="inline-flex items-center gap-2 rounded-full bg-[color:var(--bronze)] px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--cream)] transition hover:opacity-90">
            Join Membership
          </a>
        </div>
      </div>
    </header>
  );
}

function Hero({ tenant }: { tenant: Tenant }) {
  return (
    <section id="home" className="relative overflow-hidden" style={{ background: "linear-gradient(180deg, var(--cream) 0%, oklch(0.96 0.02 80) 100%)" }}>
      <div className="container-luxury grid gap-12 py-16 md:grid-cols-12 md:gap-12 md:py-24 lg:py-28">
        <div className="md:col-span-6 lg:col-span-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--champagne)]/60 bg-[color:var(--champagne)]/20 px-4 py-1.5 text-xs text-foreground/80 animate-fade-up">
            <Star className="h-3.5 w-3.5 fill-[color:var(--bronze)] text-[color:var(--bronze)]" strokeWidth={0} />
            Rated 5.0 by 1,400+ members
          </div>
          <h1 className="mt-7 whitespace-pre-line font-display text-[2.75rem] leading-[1] md:text-7xl lg:text-[5.25rem] animate-fade-up">
            {tenant.hero.title.split("\n").map((line, i) => (
              <span key={i} className="block">
                {i === 1 ? <span className="italic text-[color:var(--bronze)]">{line}</span> : line}
              </span>
            ))}
          </h1>
          <p className="mt-7 max-w-md text-base text-muted-foreground md:text-lg animate-fade-up">
            {tenant.hero.subtitle}
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3 animate-fade-up">
            <a href={`https://wa.me/${tenant.whatsapp}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3.5 text-sm font-medium text-background transition hover:opacity-90">
              <MessageCircle className="h-4 w-4" /> Book via WhatsApp <ArrowRight className="h-4 w-4" />
            </a>
            <a href="#services" className="inline-flex items-center gap-2 rounded-full bg-[color:var(--bronze)] px-6 py-3.5 text-sm font-medium text-[color:var(--cream)] transition hover:opacity-90">
              Explore Services
            </a>
            <a href="#memberships" className="text-sm font-medium text-foreground/75 underline-offset-4 hover:underline">
              Join Membership
            </a>
          </div>
          <div className="mt-12 grid grid-cols-2 divide-x divide-y divide-border overflow-hidden rounded-2xl border border-border bg-background/60 backdrop-blur md:grid-cols-4 md:divide-y-0">
            {tenant.stats.map((s) => (
              <div key={s.label} className="px-5 py-6">
                <p className="font-display text-3xl md:text-[2rem]">{s.value}</p>
                <p className="mt-2 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="relative md:col-span-6 lg:col-span-6">
          <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] shadow-[var(--shadow-luxury)] animate-fade-in">
            <img src={tenant.hero.image} alt={tenant.name} className="h-full w-full object-cover" />
          </div>
          <div className="absolute -bottom-6 left-4 right-4 mx-auto flex max-w-xs items-center gap-3 rounded-2xl border border-border bg-background/95 p-3 shadow-[var(--shadow-luxury)] backdrop-blur md:left-auto md:right-6 md:max-w-[260px]">
            <div className="flex -space-x-2">
              {["https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=80","https://images.pexels.com/photos/697509/pexels-photo-697509.jpeg?auto=compress&cs=tinysrgb&w=80","https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=80"].map((src) => (
                <img key={src} src={src} alt="" className="h-9 w-9 rounded-full border-2 border-background object-cover" loading="lazy" />
              ))}
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight">Members love it</p>
              <p className="text-xs text-muted-foreground">Join 1,400+ gentlemen</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Pillars({ tenant }: { tenant: Tenant }) {
  const map = { scissors: Scissors, sparkles: Sparkles, crown: Crown, star: Star } as const;
  return (
    <section className="border-y bg-secondary/40">
      <div className="container-luxury grid grid-cols-2 divide-x divide-border md:grid-cols-4">
        {tenant.pillars.map((p) => {
          const Icon = map[p.icon as keyof typeof map] ?? Star;
          return (
            <div key={p.title} className="flex items-center gap-3 px-4 py-6 md:px-6 md:py-8">
              <Icon className="h-5 w-5 text-[color:var(--bronze)]" strokeWidth={1.4} />
              <span className="text-xs uppercase tracking-[0.2em] text-foreground/75">{p.title}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function SectionHeader({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="mt-4 font-display text-4xl md:text-5xl lg:text-6xl">{title}</h2>
      {subtitle && <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground">{subtitle}</p>}
      <div className="hairline mx-auto mt-6" />
    </div>
  );
}

function Services({ tenant }: { tenant: Tenant }) {
  return (
    <section id="services" className="container-luxury py-24 md:py-32">
      <SectionHeader eyebrow="Our craft" title="Considered rituals" subtitle="A short, deliberate menu of grooming rituals — each performed unhurried, by hand." />
      <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {tenant.services.map((s) => (
          <article key={s.id} className="group relative overflow-hidden rounded-2xl border bg-card shadow-[var(--shadow-soft)] transition hover:shadow-[var(--shadow-luxury)]">
            <div className="relative aspect-[4/5] overflow-hidden">
              <img src={s.image} alt={s.name} loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.05]" />
              <div className="absolute inset-0 bg-gradient-to-t from-charcoal/55 via-transparent" />
              <div className="absolute right-4 top-4 rounded-full bg-background/90 px-3 py-1 text-[10px] uppercase tracking-[0.2em]">
                {s.durationMin} min
              </div>
            </div>
            <div className="p-5">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="font-display text-xl">{s.name}</h3>
                <span className="font-display text-xl text-[color:var(--bronze)]">${s.price}</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground line-clamp-3">{s.description}</p>
            </div>
          </article>
        ))}
      </div>
      <div className="mt-12 text-center">
        <a href="#book" className="btn-ghost-luxury">View all services</a>
      </div>
    </section>
  );
}

function Memberships({ tenant }: { tenant: Tenant }) {
  return (
    <section id="memberships" className="relative overflow-hidden py-24 md:py-32" style={{ background: "linear-gradient(180deg, var(--cream) 0%, oklch(0.92 0.03 80) 100%)" }}>
      <div className="absolute inset-0 opacity-[0.5]" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, var(--champagne) 0%, transparent 40%), radial-gradient(circle at 80% 70%, var(--champagne) 0%, transparent 45%)" }} />
      <div className="container-luxury relative">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">Memberships</p>
          <h2 className="mt-4 font-display text-4xl text-foreground md:text-5xl lg:text-6xl">
            Belong to the house
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground">
            Three tiers. One philosophy. Choose the ritual cadence that fits your life.
          </p>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {tenant.memberships.map((m) => (
            <div
              key={m.id}
              className={`relative rounded-2xl border p-8 transition ${
                m.highlight
                  ? "border-[color:var(--bronze)] bg-card text-foreground shadow-[var(--shadow-champagne)] md:-translate-y-3"
                  : "border-border bg-card/70 text-foreground backdrop-blur hover:border-[color:var(--champagne)]"
              }`}
            >
              {m.badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[color:var(--champagne)] px-4 py-1 text-[10px] uppercase tracking-[0.22em] text-charcoal">
                  {m.badge}
                </span>
              )}
              <p className="eyebrow">{m.name}</p>
              <div className="mt-5 flex items-baseline gap-1">
                <span className="font-display text-6xl">${m.price}</span>
                <span className="text-sm opacity-70">/month</span>
              </div>
              <div className="my-7 h-px bg-foreground/10" />
              <ul className="space-y-3">
                {m.benefits.map((b) => (
                  <li key={b} className="flex items-start gap-3 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--bronze)]" />
                    <span className="text-foreground/85">{b}</span>
                  </li>
                ))}
              </ul>
              <button className={`mt-8 w-full ${m.highlight ? "btn-luxury" : "btn-ghost-luxury"}`}>
                Join {m.name}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Gallery({ tenant }: { tenant: Tenant }) {
  return (
    <section id="gallery" className="container-luxury py-24 md:py-32">
      <SectionHeader eyebrow="The house" title="A glimpse inside" subtitle="Quiet corners, warm light and the unhurried craft of being well-kept." />
      <div className="mt-16 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {tenant.gallery.map((src, i) => {
          const tall = i === 0 || i === 3;
          return (
            <div
              key={i}
              className={`group relative overflow-hidden rounded-2xl ${
                tall ? "row-span-2 aspect-[3/5]" : "aspect-square"
              }`}
            >
              <img src={src} alt="" loading="lazy" className="h-full w-full object-cover transition duration-[1200ms] group-hover:scale-[1.06]" />
              <div className="absolute inset-0 bg-charcoal/0 transition group-hover:bg-charcoal/10" />
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Testimonials({ tenant }: { tenant: Tenant }) {
  return (
    <section id="testimonials" className="bg-secondary/50 py-24 md:py-32">
      <div className="container-luxury">
        <SectionHeader eyebrow="Members" title="In their words" />
        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {tenant.testimonials.map((t) => (
            <figure key={t.name} className="flex h-full flex-col rounded-2xl border bg-card p-8 shadow-[var(--shadow-soft)]">
              <div className="flex gap-0.5 text-[color:var(--champagne)]">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-current" strokeWidth={0} />
                ))}
              </div>
              <blockquote className="mt-6 font-serif text-xl leading-snug text-foreground/85">
                "{t.quote}"
              </blockquote>
              <figcaption className="mt-8 border-t pt-5">
                <p className="font-display text-lg">{t.name}</p>
                <p className="mt-0.5 text-xs uppercase tracking-[0.2em] text-muted-foreground">{t.role}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function Contact({ tenant }: { tenant: Tenant }) {
  return (
    <section id="contact" className="container-luxury py-24 md:py-32">
      <div id="book" className="grid gap-12 lg:grid-cols-2 lg:gap-20">
        <div>
          <p className="eyebrow">Visit · Book</p>
          <h2 className="mt-4 font-display text-4xl md:text-5xl lg:text-6xl">Reserve your ritual</h2>
          <p className="mt-5 max-w-md text-base text-muted-foreground">
            Tap below to book via WhatsApp — or step inside during opening hours. Members get priority booking up to 6 weeks ahead.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <a href={`https://wa.me/${tenant.whatsapp}?text=${encodeURIComponent(`Hi ${tenant.name}, I'd like to book an appointment.`)}`} target="_blank" rel="noreferrer" className="btn-luxury">
              <MessageCircle className="h-4 w-4" /> Book via WhatsApp
            </a>
            <a href={`tel:${tenant.phone}`} className="btn-ghost-luxury">
              <Phone className="h-4 w-4" /> Call us
            </a>
          </div>

          <dl className="mt-12 space-y-5 border-t pt-8 text-sm">
            <Row icon={<MapPin className="h-4 w-4" />} label="Address" value={tenant.address} />
            <Row icon={<Phone className="h-4 w-4" />} label="Phone" value={tenant.phone} />
            <Row icon={<Instagram className="h-4 w-4" />} label="Instagram" value={tenant.instagram} />
            <Row icon={<Mail className="h-4 w-4" />} label="Email" value={tenant.email} />
          </dl>
        </div>

        <div className="rounded-2xl border bg-card p-8 shadow-[var(--shadow-soft)] md:p-10">
          <p className="eyebrow">Opening hours</p>
          <h3 className="mt-4 font-display text-3xl">Open daily</h3>
          <ul className="mt-8 divide-y">
            {tenant.hours.map((h) => (
              <li key={h.day} className="flex items-center justify-between py-4 text-sm">
                <span className="flex items-center gap-3 text-foreground/80">
                  <Clock className="h-4 w-4 text-[color:var(--bronze)]" />
                  {h.day}
                </span>
                <span className="font-display text-lg">{h.hours}</span>
              </li>
            ))}
          </ul>
          <div className="mt-8 rounded-xl bg-[color:var(--champagne)]/15 p-5 text-sm text-foreground/80">
            <p className="font-medium text-foreground">Dynamic availability</p>
            <p className="mt-1 text-muted-foreground">Slots update in real time based on bookings, breaks and barber schedules.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-4">
      <span className="mt-0.5 grid h-9 w-9 place-items-center rounded-full bg-secondary text-[color:var(--bronze)]">{icon}</span>
      <div>
        <dt className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{label}</dt>
        <dd className="mt-1 font-display text-lg">{value}</dd>
      </div>
    </div>
  );
}

function Footer({ tenant }: { tenant: Tenant }) {
  return (
    <footer className="border-t bg-secondary/40">
      <div className="container-luxury py-12 flex flex-col items-center gap-6 text-center md:flex-row md:justify-between md:text-left">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-foreground text-background">
            <Crown className="h-4 w-4 text-[color:var(--champagne)]" />
          </span>
          <div>
            <p className="font-display text-xl leading-none">{tenant.name}</p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{tenant.tagline}</p>
          </div>
        </div>
        <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          © {new Date().getFullYear()} {tenant.name} · Powered by Maison
        </p>
      </div>
    </footer>
  );
}

function WhatsAppFab({ tenant }: { tenant: Tenant }) {
  return (
    <a
      href={`https://wa.me/${tenant.whatsapp}`}
      target="_blank"
      rel="noreferrer"
      aria-label="Book via WhatsApp"
      className="fixed bottom-6 right-6 z-50 grid h-14 w-14 place-items-center rounded-full bg-[color:var(--bronze)] text-[color:var(--cream)] shadow-[var(--shadow-luxury)] transition hover:scale-110"
    >
      <MessageCircle className="h-6 w-6" />
    </a>
  );
}