import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { getPublicTenant, type PublicTenant } from "@/lib/tenants.functions";
import { BookingDialog } from "@/components/booking-dialog";
import { useI18n } from "@/lib/i18n";
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
  Menu,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export const Route = createFileRoute("/b/$slug")({
  head: ({ loaderData, params }) => {
    const t = (loaderData as { tenant?: PublicTenant } | undefined)?.tenant;
    const title = t ? `${t.name} — Premium Grooming${t.city ? `, ${t.city}` : ""}` : "Maison House";
    const desc = t?.tagline ?? "A premium grooming experience.";
    const path = `/b/${params.slug}`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:url", content: path },
        { property: "og:type", content: "website" },
        { property: "og:locale", content: "en_US" },
        { property: "og:locale:alternate", content: "es_ES" },
        ...(t ? [{ property: "og:image", content: t.hero.image } as const] : []),
      ],
      links: [
        { rel: "canonical", href: path },
        { rel: "alternate", hrefLang: "en", href: `${path}?lang=en` },
        { rel: "alternate", hrefLang: "es", href: `${path}?lang=es` },
        { rel: "alternate", hrefLang: "x-default", href: path },
      ],
    };
  },
  loader: async ({ params }) => {
    const tenant = await getPublicTenant({ data: { slug: params.slug } });
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
  const [booking, setBooking] = useState<{ open: boolean; serviceId?: string }>({ open: false });
  useEffect(() => {
    function onOpen(e: Event) {
      const ce = e as CustomEvent<{ serviceId?: string }>;
      setBooking({ open: true, serviceId: ce.detail?.serviceId });
    }
    window.addEventListener("open-booking", onOpen as EventListener);
    return () => window.removeEventListener("open-booking", onOpen as EventListener);
  }, []);
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
      <BookingDialog
        open={booking.open}
        onClose={() => setBooking({ open: false })}
        slug={tenant.slug}
        services={tenant.services.map((s: PublicTenant["services"][number]) => ({ id: s.id, name: s.name, durationMin: s.durationMin, price: s.price }))}
        initialServiceId={booking.serviceId}
      />
    </main>
  );
}

/* ------------------------------------------------------------------ */

function Navbar({ tenant }: { tenant: PublicTenant }) {
  const { t, lang, setLang } = useI18n();
  const [open, setOpen] = useState(false);
  const links = [
    { href: "#home", label: t("nav.home") },
    { href: "#services", label: t("nav.services") },
    { href: "#memberships", label: t("nav.memberships") },
    { href: "#gallery", label: t("nav.gallery") },
    { href: "#testimonials", label: t("nav.about") },
    { href: "#contact", label: t("nav.contact") },
  ];
  return (
    <header className="sticky top-0 z-40 glass-nav">
      <div className="container-luxury flex h-16 items-center justify-between gap-3 lg:h-20">
        <Link to="/b/$slug" params={{ slug: tenant.slug }} className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-foreground text-background">
            <Crown className="h-4 w-4 text-[color:var(--champagne)]" />
          </span>
          <span className="flex min-w-0 flex-col leading-none">
            <span className="truncate font-display text-base tracking-tight sm:text-lg lg:text-xl">{tenant.name}</span>
            <span className="mt-1 truncate whitespace-nowrap text-[9px] uppercase tracking-[0.3em] text-[color:var(--bronze)]">Barber Club</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-5 lg:flex xl:gap-7">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="text-[13px] font-medium text-foreground/75 transition hover:text-[color:var(--bronze)]">
              {l.label}
            </a>
          ))}
        </nav>
        <div className="flex shrink-0 items-center gap-2">
          <div className="hidden items-center rounded-full bg-foreground p-1 text-[11px] font-medium lg:flex">
            <button onClick={() => setLang("en")} className={`rounded-full px-3 py-1 transition ${lang === "en" ? "bg-background text-foreground" : "text-background/70 hover:text-background"}`}>EN</button>
            <button onClick={() => setLang("es")} className={`rounded-full px-3 py-1 transition ${lang === "es" ? "bg-background text-foreground" : "text-background/70 hover:text-background"}`}>ES</button>
          </div>
          <button type="button" onClick={() => window.dispatchEvent(new CustomEvent("open-booking"))} className="hidden items-center gap-2 rounded-full border border-foreground/15 bg-background/80 px-4 py-2 text-xs font-medium backdrop-blur lg:inline-flex">
            <Clock className="h-3.5 w-3.5" /> {t("nav.book")}
          </button>
          <Link
            to="/b/$slug/admin"
            params={{ slug: tenant.slug }}
            className="hidden text-[11px] uppercase tracking-[0.22em] text-foreground/50 hover:text-foreground xl:block"
          >
            {t("nav.admin")}
          </Link>
          <a href="#memberships" className="hidden items-center gap-2 rounded-full bg-[color:var(--bronze)] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--cream)] transition hover:opacity-90 lg:inline-flex">
            {t("nav.join")}
          </a>
          {/* Mobile: lang pill + hamburger */}
          <button onClick={() => setLang(lang === "en" ? "es" : "en")} className="rounded-full border border-foreground/15 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] lg:hidden" aria-label="Toggle language">
            {lang.toUpperCase()}
          </button>
          <button onClick={() => setOpen((v) => !v)} aria-label="Menu" className="grid h-10 w-10 place-items-center rounded-full border border-foreground/15 lg:hidden">
            <Menu className="h-4 w-4" />
          </button>
        </div>
      </div>
      {open && (
        <div className="border-t border-foreground/10 bg-background/95 backdrop-blur lg:hidden">
          <nav className="container-luxury flex flex-col py-3">
            {links.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="py-3 text-sm font-medium text-foreground/80">
                {l.label}
              </a>
            ))}
            <div className="mt-2 flex flex-col gap-2 pt-3 border-t border-foreground/10 sm:flex-row">
              <button type="button" onClick={() => { setOpen(false); window.dispatchEvent(new CustomEvent("open-booking")); }} className="flex-1 rounded-full bg-foreground px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-background">
                {t("nav.book")}
              </button>
              <a href="#memberships" onClick={() => setOpen(false)} className="flex-1 rounded-full bg-[color:var(--bronze)] px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--cream)]">
                {t("nav.join")}
              </a>
            </div>
            <Link to="/b/$slug/admin" params={{ slug: tenant.slug }} onClick={() => setOpen(false)} className="mt-3 block text-center text-[11px] uppercase tracking-[0.22em] text-foreground/50">
              {t("nav.admin")}
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}

function Hero({ tenant }: { tenant: PublicTenant }) {
  const { t, tx } = useI18n();
  return (
    <section id="home" className="relative overflow-hidden" style={{ background: "linear-gradient(180deg, var(--cream) 0%, oklch(0.96 0.02 80) 100%)" }}>
      <div className="container-luxury grid gap-10 py-12 lg:grid-cols-12 lg:gap-12 lg:py-24 xl:py-28">
        <div className="lg:col-span-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--champagne)]/60 bg-[color:var(--champagne)]/20 px-4 py-1.5 text-xs text-foreground/80 animate-fade-up">
            <Star className="h-3.5 w-3.5 fill-[color:var(--bronze)] text-[color:var(--bronze)]" strokeWidth={0} />
            {t("hero.rated")}
          </div>
          <h1 className="mt-6 whitespace-pre-line font-display text-[2.25rem] leading-[1.05] sm:text-[3rem] md:text-[3.75rem] lg:text-7xl xl:text-[5.25rem] animate-fade-up">
            {tx(tenant.hero.title).split("\n").map((line, i) => (
              <span key={i} className="block">
                {i === 1 ? <span className="italic text-[color:var(--bronze)]">{line}</span> : line}
              </span>
            ))}
          </h1>
          <p className="mt-6 max-w-md text-[15px] text-muted-foreground md:max-w-lg md:text-lg animate-fade-up">
            {tx(tenant.hero.subtitle)}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center animate-fade-up">
            <button type="button" onClick={() => window.dispatchEvent(new CustomEvent("open-booking"))} className="inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-6 py-3.5 text-sm font-medium text-background transition hover:opacity-90">
              {t("hero.book")} <ArrowRight className="h-4 w-4" />
            </button>
            <a href={`https://wa.me/${tenant.whatsapp}`} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-full bg-[color:var(--bronze)] px-6 py-3.5 text-sm font-medium text-[color:var(--cream)] transition hover:opacity-90">
              <MessageCircle className="h-4 w-4" /> {t("hero.whatsapp")}
            </a>
            <a href="#memberships" className="text-center text-sm font-medium text-foreground/75 underline-offset-4 hover:underline sm:text-left">
              {t("hero.join")}
            </a>
          </div>
          <div className="mt-10 grid grid-cols-2 divide-x divide-y divide-border overflow-hidden rounded-2xl border border-border bg-background/60 backdrop-blur md:mt-12 lg:grid-cols-4 lg:divide-y-0">
            {tenant.stats.map((s) => (
              <div key={s.label} className="px-4 py-5 md:px-5 md:py-6">
                <p className="font-display text-2xl md:text-[2rem]">{s.value}</p>
                <p className="mt-1.5 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{tx(s.label)}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="relative lg:col-span-6">
          <div className="relative aspect-[4/5] overflow-hidden rounded-3xl shadow-[var(--shadow-luxury)] animate-fade-in lg:rounded-[2rem]">
            <img src={tenant.hero.image} alt={tenant.name} className="h-full w-full object-cover" />
          </div>
          <div className="absolute -bottom-6 left-4 right-4 mx-auto flex max-w-xs items-center gap-3 rounded-2xl border border-border bg-background/95 p-3 shadow-[var(--shadow-luxury)] backdrop-blur sm:left-auto sm:right-6 sm:max-w-[260px]">
            <div className="flex -space-x-2">
              {["https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=80","https://images.pexels.com/photos/697509/pexels-photo-697509.jpeg?auto=compress&cs=tinysrgb&w=80","https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=80"].map((src) => (
                <img key={src} src={src} alt="" className="h-9 w-9 rounded-full border-2 border-background object-cover" loading="lazy" />
              ))}
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight">{t("hero.membersLove")}</p>
              <p className="text-xs text-muted-foreground">{t("hero.membersJoin")}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Pillars({ tenant }: { tenant: PublicTenant }) {
  const { tx } = useI18n();
  const map = { scissors: Scissors, sparkles: Sparkles, crown: Crown, star: Star } as const;
  return (
    <section className="border-y bg-secondary/40">
      <div className="container-luxury grid grid-cols-2 divide-x divide-y divide-border md:divide-y-0 lg:grid-cols-4">
        {tenant.pillars.map((p) => {
          const Icon = map[p.icon as keyof typeof map] ?? Star;
          return (
            <div key={p.title} className="flex items-center gap-3 px-4 py-6 md:px-6 md:py-8">
              <Icon className="h-5 w-5 text-[color:var(--bronze)]" strokeWidth={1.4} />
              <span className="text-xs uppercase tracking-[0.2em] text-foreground/75">{tx(p.title)}</span>
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

function Services({ tenant }: { tenant: PublicTenant }) {
  const { t, tx } = useI18n();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [idx, setIdx] = useState(0);
  const count = tenant.services.length;
  const scrollTo = (i: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const target = ((i % count) + count) % count;
    el.scrollTo({ left: target * el.clientWidth, behavior: "smooth" });
  };
  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== idx) setIdx(i);
  };
  return (
    <section id="services" className="container-luxury py-16 md:py-32">
      <SectionHeader eyebrow={t("services.eyebrow")} title={t("services.title")} subtitle={t("services.subtitle")} />
      {/* Mobile carousel */}
      <div className="mt-10 md:hidden">
        <div
          ref={scrollRef}
          onScroll={onScroll}
          className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth -mx-4 px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-y pinch-zoom" }}
        >
            {tenant.services.map((s) => (
              <article key={s.id} className="w-full shrink-0 snap-center pr-3">
                <div className="overflow-hidden rounded-2xl border bg-card shadow-[var(--shadow-soft)]">
                  <div className="relative aspect-[4/5] overflow-hidden">
                    <img src={s.image ?? undefined} alt={tx(s.name)} loading="lazy" className="h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-charcoal/55 via-transparent" />
                    <div className="absolute right-4 top-4 rounded-full bg-background/90 px-3 py-1 text-[10px] uppercase tracking-[0.2em]">
                      {s.durationMin} {t("services.min")}
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="flex items-baseline justify-between gap-3">
                      <h3 className="font-display text-xl">{tx(s.name)}</h3>
                      <span className="font-display text-xl text-[color:var(--bronze)]">${s.price}</span>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-3">{tx(s.description)}</p>
                    <button
                      type="button"
                      onClick={() => window.dispatchEvent(new CustomEvent("open-booking", { detail: { serviceId: s.id } }))}
                      className="mt-4 inline-flex w-full items-center justify-center rounded-full border border-foreground/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] hover:bg-foreground hover:text-background transition"
                    >
                      {t("services.book")}
                    </button>
                  </div>
                </div>
              </article>
            ))}
        </div>
        <div className="mt-5 flex items-center justify-between">
          <button onClick={() => scrollTo(idx - 1)} aria-label="Previous" className="grid h-11 w-11 place-items-center rounded-full border border-foreground/15 bg-background active:scale-95 transition">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex gap-2">
            {tenant.services.map((_, i) => (
              <button key={i} onClick={() => scrollTo(i)} aria-label={`Slide ${i + 1}`} className={`h-2 rounded-full transition-all ${i === idx ? "w-8 bg-[color:var(--bronze)]" : "w-2 bg-foreground/20"}`} />
            ))}
          </div>
          <button onClick={() => scrollTo(idx + 1)} aria-label="Next" className="grid h-11 w-11 place-items-center rounded-full border border-foreground/15 bg-background active:scale-95 transition">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      {/* Desktop grid */}
      <div className="mt-16 hidden gap-6 md:grid sm:grid-cols-2 lg:grid-cols-4">
        {tenant.services.map((s) => (
          <article key={s.id} className="group relative overflow-hidden rounded-2xl border bg-card shadow-[var(--shadow-soft)] transition hover:shadow-[var(--shadow-luxury)]">
            <div className="relative aspect-[4/5] overflow-hidden">
              <img src={s.image ?? undefined} alt={tx(s.name)} loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.05]" />
              <div className="absolute inset-0 bg-gradient-to-t from-charcoal/55 via-transparent" />
              <div className="absolute right-4 top-4 rounded-full bg-background/90 px-3 py-1 text-[10px] uppercase tracking-[0.2em]">
                {s.durationMin} {t("services.min")}
              </div>
            </div>
            <div className="p-5">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="font-display text-xl">{tx(s.name)}</h3>
                <span className="font-display text-xl text-[color:var(--bronze)]">${s.price}</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground line-clamp-3">{tx(s.description)}</p>
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent("open-booking", { detail: { serviceId: s.id } }))}
                className="mt-4 inline-flex w-full items-center justify-center rounded-full border border-foreground/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] hover:bg-foreground hover:text-background transition"
              >
                {t("services.book")}
              </button>
            </div>
          </article>
        ))}
      </div>
      <div className="mt-10 text-center md:mt-12">
        <button type="button" onClick={() => window.dispatchEvent(new CustomEvent("open-booking"))} className="btn-ghost-luxury">{t("services.cta")}</button>
      </div>
    </section>
  );
}

function Memberships({ tenant }: { tenant: PublicTenant }) {
  const { t, tx } = useI18n();
  return (
    <section id="memberships" className="relative overflow-hidden py-16 md:py-32" style={{ background: "linear-gradient(180deg, var(--cream) 0%, oklch(0.92 0.03 80) 100%)" }}>
      <div className="absolute inset-0 opacity-[0.5]" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, var(--champagne) 0%, transparent 40%), radial-gradient(circle at 80% 70%, var(--champagne) 0%, transparent 45%)" }} />
      <div className="container-luxury relative">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">{t("memberships.eyebrow")}</p>
          <h2 className="mt-4 font-display text-3xl text-foreground sm:text-4xl md:text-5xl lg:text-6xl">
            {t("memberships.title")}
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-[15px] text-muted-foreground md:text-base">{t("memberships.subtitle")}</p>
        </div>

        <div className="mt-10 grid gap-5 md:mt-16 md:grid-cols-3 md:gap-6">
          {tenant.memberships.map((m) => (
            <div
              key={m.id}
              className={`relative rounded-2xl border p-6 transition md:p-8 ${
                m.highlight
                  ? "border-[color:var(--bronze)] bg-card text-foreground shadow-[var(--shadow-champagne)] lg:-translate-y-3"
                  : "border-border bg-card/70 text-foreground backdrop-blur hover:border-[color:var(--champagne)]"
              }`}
            >
              {m.badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[color:var(--champagne)] px-4 py-1 text-[10px] uppercase tracking-[0.22em] text-charcoal">
                  {tx(m.badge)}
                </span>
              )}
              <p className="eyebrow">{m.name}</p>
              <div className="mt-5 flex items-baseline gap-1">
                <span className="font-display text-5xl md:text-6xl">${m.price}</span>
                <span className="text-sm opacity-70">{t("memberships.per")}</span>
              </div>
              <div className="my-7 h-px bg-foreground/10" />
              <ul className="space-y-3">
                {m.benefits.map((b) => (
                  <li key={b} className="flex items-start gap-3 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--bronze)]" />
                    <span className="text-foreground/85">{tx(b)}</span>
                  </li>
                ))}
              </ul>
              <button className={`mt-8 w-full ${m.highlight ? "btn-luxury" : "btn-ghost-luxury"}`}>
                {t("memberships.join")} {m.name}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Gallery({ tenant }: { tenant: PublicTenant }) {
  const { t } = useI18n();
  return (
    <section id="gallery" className="container-luxury py-16 md:py-32">
      <SectionHeader eyebrow={t("gallery.eyebrow")} title={t("gallery.title")} subtitle={t("gallery.subtitle")} />
      <div className="mt-10 grid grid-cols-2 gap-3 md:mt-16 md:grid-cols-4 md:gap-4">
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

function Testimonials({ tenant }: { tenant: PublicTenant }) {
  const { t, tx } = useI18n();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [idx, setIdx] = useState(0);
  const items = tenant.testimonials;
  const count = items.length;
  const scrollTo = (i: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const target = ((i % count) + count) % count;
    el.scrollTo({ left: target * el.clientWidth, behavior: "smooth" });
  };
  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== idx) setIdx(i);
  };
  return (
    <section id="testimonials" className="bg-secondary/50 py-16 md:py-32">
      <div className="container-luxury">
        <SectionHeader eyebrow={t("testimonials.eyebrow")} title={t("testimonials.title")} />
        {/* Mobile carousel */}
        <div className="mt-10 md:hidden">
          <div
            ref={scrollRef}
            onScroll={onScroll}
            className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth -mx-4 px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-y pinch-zoom" }}
          >
              {items.map((tt) => (
                <figure key={tt.name} className="w-full shrink-0 snap-center pr-3">
                  <div className="flex h-full flex-col rounded-2xl border bg-card p-6 shadow-[var(--shadow-soft)]">
                    <div className="flex gap-0.5 text-[color:var(--champagne)]">
                      {Array.from({ length: tt.rating }).map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-current" strokeWidth={0} />
                      ))}
                    </div>
                    <blockquote className="mt-5 font-serif text-lg leading-snug text-foreground/85">"{tx(tt.quote)}"</blockquote>
                    <figcaption className="mt-6 border-t pt-4">
                      <p className="font-display text-lg">{tt.name}</p>
                      <p className="mt-0.5 text-xs uppercase tracking-[0.2em] text-muted-foreground">{tx(tt.role)}</p>
                    </figcaption>
                  </div>
                </figure>
              ))}
          </div>
          <div className="mt-5 flex items-center justify-between">
            <button onClick={() => scrollTo(idx - 1)} aria-label="Previous" className="grid h-11 w-11 place-items-center rounded-full border border-foreground/15 bg-background active:scale-95 transition">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex gap-2">
              {items.map((_, i) => (
                <button key={i} onClick={() => scrollTo(i)} aria-label={`Slide ${i + 1}`} className={`h-2 rounded-full transition-all ${i === idx ? "w-8 bg-[color:var(--bronze)]" : "w-2 bg-foreground/20"}`} />
              ))}
            </div>
            <button onClick={() => scrollTo(idx + 1)} aria-label="Next" className="grid h-11 w-11 place-items-center rounded-full border border-foreground/15 bg-background active:scale-95 transition">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        {/* Desktop grid */}
        <div className="mt-16 hidden gap-6 md:grid md:grid-cols-3">
          {tenant.testimonials.map((tt) => (
            <figure key={tt.name} className="flex h-full flex-col rounded-2xl border bg-card p-8 shadow-[var(--shadow-soft)]">
              <div className="flex gap-0.5 text-[color:var(--champagne)]">
                {Array.from({ length: tt.rating }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-current" strokeWidth={0} />
                ))}
              </div>
              <blockquote className="mt-6 font-serif text-xl leading-snug text-foreground/85">
                "{tx(tt.quote)}"
              </blockquote>
              <figcaption className="mt-8 border-t pt-5">
                <p className="font-display text-lg">{tt.name}</p>
                <p className="mt-0.5 text-xs uppercase tracking-[0.2em] text-muted-foreground">{tx(tt.role)}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function Contact({ tenant }: { tenant: PublicTenant }) {
  const { t, tx } = useI18n();
  return (
    <section id="contact" className="container-luxury py-16 md:py-32">
      <div id="book" className="grid gap-10 lg:grid-cols-2 lg:gap-20">
        <div>
          <p className="eyebrow">{t("contact.eyebrow")}</p>
          <h2 className="mt-4 font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl">{t("contact.title")}</h2>
          <p className="mt-5 max-w-md text-[15px] text-muted-foreground md:text-base">{t("contact.subtitle")}</p>
          <div className="mt-10 flex flex-wrap gap-3">
            <a href={`https://wa.me/${tenant.whatsapp}?text=${encodeURIComponent(`Hi ${tenant.name}, I'd like to book an appointment.`)}`} target="_blank" rel="noreferrer" className="btn-luxury">
              <MessageCircle className="h-4 w-4" /> {t("contact.whatsapp")}
            </a>
            <a href={`tel:${tenant.phone}`} className="btn-ghost-luxury">
              <Phone className="h-4 w-4" /> {t("contact.call")}
            </a>
          </div>

          <dl className="mt-12 space-y-5 border-t pt-8 text-sm">
            <Row icon={<MapPin className="h-4 w-4" />} label={t("contact.address")} value={tenant.address ?? "—"} />
            <Row icon={<Phone className="h-4 w-4" />} label={t("contact.phone")} value={tenant.phone ?? "—"} />
            <Row icon={<Instagram className="h-4 w-4" />} label={t("contact.instagram")} value={tenant.instagram ?? "—"} />
            <Row icon={<Mail className="h-4 w-4" />} label={t("contact.email")} value={tenant.email ?? "—"} />
          </dl>
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-[var(--shadow-soft)] md:p-10">
          <p className="eyebrow">{t("hours.eyebrow")}</p>
          <h3 className="mt-4 font-display text-2xl md:text-3xl">{t("hours.title")}</h3>
          <ul className="mt-8 divide-y">
            {tenant.hours.map((h) => (
              <li key={h.day} className="flex items-center justify-between py-4 text-sm">
                <span className="flex items-center gap-3 text-foreground/80">
                  <Clock className="h-4 w-4 text-[color:var(--bronze)]" />
                  {tx(h.day)}
                </span>
                <span className="font-display text-base md:text-lg">{tx(h.hours)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-8 rounded-xl bg-[color:var(--champagne)]/15 p-5 text-sm text-foreground/80">
            <p className="font-medium text-foreground">{t("hours.dynamic")}</p>
            <p className="mt-1 text-muted-foreground">{t("hours.dynamicDesc")}</p>
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

function Footer({ tenant }: { tenant: PublicTenant }) {
  const { t, tx } = useI18n();
  return (
    <footer className="border-t bg-secondary/40">
      <div className="container-luxury py-10 flex flex-col items-center gap-5 text-center md:py-12 md:flex-row md:justify-between md:text-left">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-foreground text-background">
            <Crown className="h-4 w-4 text-[color:var(--champagne)]" />
          </span>
          <div>
            <p className="font-display text-xl leading-none">{tenant.name}</p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{tx(tenant.tagline)}</p>
          </div>
        </div>
        <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          © {new Date().getFullYear()} {tenant.name} · {t("footer.poweredBy")}
        </p>
      </div>
    </footer>
  );
}

function WhatsAppFab({ tenant }: { tenant: PublicTenant }) {
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