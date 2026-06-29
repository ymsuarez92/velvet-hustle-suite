import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "es";

const dict = {
  en: {
    "nav.home": "Home",
    "nav.services": "Services",
    "nav.memberships": "Memberships",
    "nav.gallery": "Gallery",
    "nav.about": "About",
    "nav.contact": "Contact",
    "nav.book": "Book",
    "nav.admin": "Admin",
    "nav.join": "Join Membership",
    "hero.rated": "Rated 5.0 by 1,400+ members",
    "hero.book": "Book your visit",
    "hero.whatsapp": "WhatsApp",
    "hero.join": "Join Membership",
    "hero.membersLove": "Members love it",
    "hero.membersJoin": "Join 1,400+ gentlemen",
    "services.eyebrow": "Our craft",
    "services.title": "Considered rituals",
    "services.subtitle": "A short, deliberate menu of grooming rituals — each performed unhurried, by hand.",
    "services.book": "Book",
    "services.cta": "Book an appointment",
    "services.min": "min",
    "memberships.eyebrow": "Memberships",
    "memberships.title": "Belong to the house",
    "memberships.subtitle": "Three tiers. One philosophy. Choose the ritual cadence that fits your life.",
    "memberships.per": "/month",
    "memberships.join": "Join",
    "gallery.eyebrow": "The house",
    "gallery.title": "A glimpse inside",
    "gallery.subtitle": "Quiet corners, warm light and the unhurried craft of being well-kept.",
    "testimonials.eyebrow": "Members",
    "testimonials.title": "In their words",
    "contact.eyebrow": "Visit · Book",
    "contact.title": "Reserve your ritual",
    "contact.subtitle": "Tap below to book via WhatsApp — or step inside during opening hours. Members get priority booking up to 6 weeks ahead.",
    "contact.whatsapp": "Book via WhatsApp",
    "contact.call": "Call us",
    "contact.address": "Address",
    "contact.phone": "Phone",
    "contact.instagram": "Instagram",
    "contact.email": "Email",
    "hours.eyebrow": "Opening hours",
    "hours.title": "Open daily",
    "hours.dynamic": "Dynamic availability",
    "hours.dynamicDesc": "Slots update in real time based on bookings, breaks and barber schedules.",
    "footer.poweredBy": "Powered by Maison",
    "book.title": "Book your visit",
    "book.reservation": "Reservation",
    "book.service": "Service",
    "book.date": "Date",
    "book.time": "Time",
    "book.loading": "Loading availability…",
    "book.empty": "No availability on this day. Try another date.",
    "book.name": "Full name *",
    "book.namePh": "John Smith",
    "book.phone": "Phone *",
    "book.phonePh": "+1 555 0000",
    "book.email": "Email",
    "book.emailPh": "you@email.com",
    "book.comment": "Comment",
    "book.commentPh": "Tell us anything we should know (style, allergies, preferences)",
    "book.confirm": "Confirm booking",
    "book.booking": "Booking…",
    "book.requested": "Appointment requested",
    "book.willConfirm": "We'll confirm shortly. A receipt is on its way.",
    "book.done": "Done",
    "book.pickService": "Choose a service",
    "book.pickDate": "Choose a date",
    "book.pickTime": "Choose a time",
  },
  es: {
    "nav.home": "Inicio",
    "nav.services": "Servicios",
    "nav.memberships": "Membresías",
    "nav.gallery": "Galería",
    "nav.about": "Nosotros",
    "nav.contact": "Contacto",
    "nav.book": "Reservar",
    "nav.admin": "Admin",
    "nav.join": "Unirme",
    "hero.rated": "5.0 valorado por +1,400 miembros",
    "hero.book": "Reserva tu visita",
    "hero.whatsapp": "WhatsApp",
    "hero.join": "Unirme",
    "hero.membersLove": "A los miembros les encanta",
    "hero.membersJoin": "Únete a +1,400 caballeros",
    "services.eyebrow": "Nuestro oficio",
    "services.title": "Rituales cuidados",
    "services.subtitle": "Un menú breve y deliberado — cada ritual ejecutado sin prisa, a mano.",
    "services.book": "Reservar",
    "services.cta": "Agendar una cita",
    "services.min": "min",
    "memberships.eyebrow": "Membresías",
    "memberships.title": "Pertenece a la casa",
    "memberships.subtitle": "Tres niveles. Una filosofía. Elige la cadencia que se ajusta a tu vida.",
    "memberships.per": "/mes",
    "memberships.join": "Unirme a",
    "gallery.eyebrow": "La casa",
    "gallery.title": "Un vistazo adentro",
    "gallery.subtitle": "Rincones tranquilos, luz cálida y el oficio paciente de estar bien cuidado.",
    "testimonials.eyebrow": "Miembros",
    "testimonials.title": "En sus palabras",
    "contact.eyebrow": "Visita · Reserva",
    "contact.title": "Reserva tu ritual",
    "contact.subtitle": "Toca abajo para reservar por WhatsApp — o pasa durante el horario de apertura. Miembros reservan con hasta 6 semanas de prioridad.",
    "contact.whatsapp": "Reservar por WhatsApp",
    "contact.call": "Llamar",
    "contact.address": "Dirección",
    "contact.phone": "Teléfono",
    "contact.instagram": "Instagram",
    "contact.email": "Email",
    "hours.eyebrow": "Horario",
    "hours.title": "Abierto todos los días",
    "hours.dynamic": "Disponibilidad dinámica",
    "hours.dynamicDesc": "Los horarios se actualizan en tiempo real según reservas, descansos y agenda de barberos.",
    "footer.poweredBy": "Powered by Maison",
    "book.title": "Reserva tu visita",
    "book.reservation": "Reserva",
    "book.service": "Servicio",
    "book.date": "Fecha",
    "book.time": "Hora",
    "book.loading": "Cargando disponibilidad…",
    "book.empty": "Sin disponibilidad este día. Prueba otra fecha.",
    "book.name": "Nombre completo *",
    "book.namePh": "Juan Pérez",
    "book.phone": "Teléfono *",
    "book.phonePh": "+34 600 000 000",
    "book.email": "Email",
    "book.emailPh": "tu@email.com",
    "book.comment": "Comentario",
    "book.commentPh": "Cuéntanos lo que debamos saber (estilo, alergias, preferencias)",
    "book.confirm": "Confirmar reserva",
    "book.booking": "Reservando…",
    "book.requested": "Cita solicitada",
    "book.willConfirm": "Confirmaremos en breve. Te enviamos un recibo.",
    "book.done": "Listo",
    "book.pickService": "Elige un servicio",
    "book.pickDate": "Elige una fecha",
    "book.pickTime": "Elige un horario",
  },
} as const;

export type TKey = keyof typeof dict["en"];

// Translations of canonical English strings coming from the database / seeds.
// Used by `tx()` to localize dynamic content without touching the schema.
const dynEs: Record<string, string> = {
  // hero titles
  "Premium Grooming\nExperience": "Experiencia de\nGrooming Premium",
  "Sharp Lines\nSlow Rituals": "Líneas Marcadas\nRituales Pausados",
  // hero subtitles
  "A private grooming club where master barbers, considered rituals, and a serene atelier come together for the modern gentleman.":
    "Un club privado de grooming donde maestros barberos, rituales pensados y un atelier sereno se unen para el caballero moderno.",
  "A modern barbering atelier built around craft, conversation and the unhurried pleasure of being well-kept.":
    "Un atelier moderno construido en torno al oficio, la conversación y el placer pausado de estar bien cuidado.",
  // hero eyebrows / taglines
  "Members-only grooming house": "Casa de grooming solo para miembros",
  "Brooklyn atelier": "Atelier en Brooklyn",
  "More than a haircut, it's a ritual.": "Más que un corte, es un ritual.",
  "Sharp lines. Slow rituals.": "Líneas marcadas. Rituales pausados.",
  // stats labels
  "Of craft": "De oficio",
  "Active members": "Miembros activos",
  "Master barbers": "Maestros barberos",
  "Member rating": "Valoración",
  // pillars
  "Master Barbers": "Maestros Barberos",
  "Heritage Products": "Productos Heritage",
  "Members Lounge": "Salón de Miembros",
  "Lifetime Care": "Cuidado de por Vida",
  "Master Fades": "Maestros del Fade",
  "Botanical Oils": "Aceites Botánicos",
  "Atelier Lounge": "Salón Atelier",
  // hours
  "Mon — Fri": "Lun — Vie",
  "Tue — Fri": "Mar — Vie",
  "Sat — Sun": "Sáb — Dom",
  "Saturday": "Sábado",
  "Sunday": "Domingo",
  "Monday": "Lunes",
  "Closed": "Cerrado",
  // services
  "Signature Haircut": "Corte Signature",
  "Beard Sculpting": "Esculpido de Barba",
  "Hot Towel Shave": "Afeitado con Toalla Caliente",
  "Scalp Hydromassage": "Hidromasaje Capilar",
  "Atelier Cut": "Corte Atelier",
  "Beard Architecture": "Arquitectura de Barba",
  "Straight Razor Ritual": "Ritual de Navaja",
  "Scalp Therapy": "Terapia Capilar",
  "A 45-minute consultation, scissor cut and finish tailored to your hair architecture.":
    "Consulta de 45 minutos, corte con tijera y acabado a la medida de tu arquitectura capilar.",
  "Precision line-up, hot-towel softening and conditioning oil for a defined finish.":
    "Línea de precisión, suavizado con toalla caliente y aceite acondicionador para un acabado definido.",
  "A traditional straight-razor ritual with apothecary balms and steamed towels.":
    "Ritual tradicional de navaja con bálsamos artesanales y toallas calientes.",
  "Twenty minutes of pressure-point scalp therapy with botanical infusions.":
    "Veinte minutos de terapia de presión capilar con infusiones botánicas.",
  "Signature consultation, scissor & clipper craft for a sharp, modern silhouette.":
    "Consulta signature, tijera y máquina para una silueta moderna y marcada.",
  "Razor line-up, hot-towel softening and finishing oil.":
    "Línea con navaja, suavizado con toalla caliente y aceite de acabado.",
  "Traditional shave with apothecary balms and steamed towels.":
    "Afeitado tradicional con bálsamos artesanales y toallas calientes.",
  "Pressure-point scalp ritual with botanical infusions.":
    "Ritual de presión capilar con infusiones botánicas.",
  // memberships
  "Most chosen": "El más elegido",
  "2 signature haircuts / month": "2 cortes signature / mes",
  "Beard trim included": "Recorte de barba incluido",
  "10% off apothecary": "10% off en productos",
  "Priority booking window": "Ventana de reserva prioritaria",
  "4 signature haircuts / month": "4 cortes signature / mes",
  "Unlimited beard trims": "Recortes de barba ilimitados",
  "15% off apothecary": "15% off en productos",
  "Priority booking": "Reserva prioritaria",
  "Members lounge access": "Acceso al salón de miembros",
  "Unlimited haircuts": "Cortes ilimitados",
  "All grooming rituals included": "Todos los rituales incluidos",
  "20% off apothecary": "20% off en productos",
  "Same-day booking": "Reserva el mismo día",
  "Private suite & events": "Suite privada y eventos",
  "2 cuts / month": "2 cortes / mes",
  "Beard trim": "Recorte de barba",
  "4 cuts / month": "4 cortes / mes",
  "Atelier lounge access": "Acceso al salón atelier",
  "Unlimited cuts": "Cortes ilimitados",
  "All rituals included": "Todos los rituales incluidos",
  "Private events": "Eventos privados",
  // testimonial roles & quotes
  "Member since 2022": "Miembro desde 2022",
  "Member since 2023": "Miembro desde 2023",
  "Premium member": "Miembro Premium",
  "VIP member": "Miembro VIP",
  "The most considered grooming experience in the city. Every visit feels like a private ritual.":
    "La experiencia de grooming más cuidada de la ciudad. Cada visita se siente como un ritual privado.",
  "Booking is effortless and the craft is uncompromising. I've never trusted my hair to anyone else.":
    "Reservar es muy fácil y el oficio es impecable. Nunca había confiado mi cabello a nadie más.",
  "The members lounge alone is worth it. The cuts and shaves are unmatched in Miami.":
    "Solo el salón de miembros ya vale la pena. Los cortes y afeitados no tienen rival en Miami.",
  "Calm, considered, never rushed. Best atelier in Brooklyn.":
    "Calmado, cuidado, nunca apresurado. El mejor atelier de Brooklyn.",
  "The line-ups are surgical. The space is a sanctuary.":
    "Las líneas son quirúrgicas. El espacio es un santuario.",
  "Membership pays for itself in the first two visits.":
    "La membresía se paga sola en las primeras dos visitas.",
};

const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: (k: TKey) => string; tx: (s: string | null | undefined) => string }>({
  lang: "en", setLang: () => {}, t: (k) => k, tx: (s) => s ?? "",
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const qp = url.searchParams.get("lang");
    const saved = localStorage.getItem("lang") as Lang | null;
    let next: Lang | null = null;
    if (qp === "en" || qp === "es") next = qp;
    else if (saved === "en" || saved === "es") next = saved;
    else if (navigator.language?.toLowerCase().startsWith("es")) next = "es";
    if (next) setLangState(next);
  }, []);
  // Keep <html lang> and ?lang= in sync for SEO / hreflang.
  useEffect(() => {
    if (typeof document !== "undefined") document.documentElement.lang = lang;
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (url.searchParams.get("lang") !== lang) {
        url.searchParams.set("lang", lang);
        window.history.replaceState({}, "", url.toString());
      }
    }
  }, [lang]);
  const setLang = (l: Lang) => {
    setLangState(l);
    try { localStorage.setItem("lang", l); } catch {}
  };
  const t = (k: TKey) => (dict[lang] as Record<string, string>)[k] ?? (dict.en as Record<string, string>)[k] ?? k;
  const tx = (s: string | null | undefined) => {
    if (!s) return "";
    if (lang === "es") return dynEs[s] ?? s;
    return s;
  };
  return <Ctx.Provider value={{ lang, setLang, t, tx }}>{children}</Ctx.Provider>;
}

export function useI18n() { return useContext(Ctx); }