import heroImg from "@/assets/hero-barbershop.jpg";
import svcHaircut from "@/assets/service-haircut.jpg";
import svcBeard from "@/assets/service-beard.jpg";
import svcShave from "@/assets/service-shave.jpg";
import svcMassage from "@/assets/service-massage.jpg";
import gal1 from "@/assets/gallery-1.jpg";
import gal2 from "@/assets/gallery-2.jpg";
import gal3 from "@/assets/gallery-3.jpg";

export type Service = {
  id: string;
  name: string;
  description: string;
  price: number;
  durationMin: number;
  image: string;
};

export type Membership = {
  id: string;
  name: string;
  price: number;
  badge?: string;
  highlight?: boolean;
  benefits: string[];
};

export type Testimonial = {
  name: string;
  role: string;
  quote: string;
  rating: number;
};

export type Tenant = {
  slug: string;
  name: string;
  tagline: string;
  city: string;
  address: string;
  phone: string;
  whatsapp: string;
  instagram: string;
  email: string;
  hours: { day: string; hours: string }[];
  hero: { eyebrow: string; title: string; subtitle: string; image: string };
  stats: { value: string; label: string }[];
  pillars: { icon: string; title: string }[];
  services: Service[];
  memberships: Membership[];
  gallery: string[];
  testimonials: Testimonial[];
};

export const TENANTS: Record<string, Tenant> = {
  "elite-barber": {
    slug: "elite-barber",
    name: "Maison Élite",
    tagline: "More than a haircut, it's a ritual.",
    city: "Miami",
    address: "123 Brickell Ave, Miami, FL",
    phone: "(305) 123-4567",
    whatsapp: "13051234567",
    instagram: "@maisonelite",
    email: "hello@maisonelite.com",
    hours: [
      { day: "Mon — Fri", hours: "09:00 — 20:00" },
      { day: "Saturday", hours: "10:00 — 18:00" },
      { day: "Sunday", hours: "Closed" },
    ],
    hero: {
      eyebrow: "Members-only grooming house",
      title: "Premium Grooming\nExperience",
      subtitle:
        "A private grooming club where master barbers, considered rituals, and a serene atelier come together for the modern gentleman.",
      image: heroImg,
    },
    stats: [
      { value: "12y", label: "Of craft" },
      { value: "1.4k", label: "Active members" },
      { value: "26", label: "Master barbers" },
      { value: "4.96", label: "Member rating" },
    ],
    pillars: [
      { icon: "scissors", title: "Master Barbers" },
      { icon: "sparkles", title: "Heritage Products" },
      { icon: "crown", title: "Members Lounge" },
      { icon: "star", title: "Lifetime Care" },
    ],
    services: [
      { id: "haircut", name: "Signature Haircut", description: "A 45-minute consultation, scissor cut and finish tailored to your hair architecture.", price: 65, durationMin: 45, image: svcHaircut },
      { id: "beard", name: "Beard Sculpting", description: "Precision line-up, hot-towel softening and conditioning oil for a defined finish.", price: 35, durationMin: 30, image: svcBeard },
      { id: "shave", name: "Hot Towel Shave", description: "A traditional straight-razor ritual with apothecary balms and steamed towels.", price: 55, durationMin: 40, image: svcShave },
      { id: "massage", name: "Scalp Hydromassage", description: "Twenty minutes of pressure-point scalp therapy with botanical infusions.", price: 45, durationMin: 25, image: svcMassage },
    ],
    memberships: [
      {
        id: "gold",
        name: "Gold",
        price: 49,
        benefits: ["2 signature haircuts / month", "Beard trim included", "10% off apothecary", "Priority booking window"],
      },
      {
        id: "premium",
        name: "Premium",
        price: 79,
        badge: "Most chosen",
        highlight: true,
        benefits: ["4 signature haircuts / month", "Unlimited beard trims", "15% off apothecary", "Priority booking", "Members lounge access"],
      },
      {
        id: "vip",
        name: "VIP",
        price: 129,
        benefits: ["Unlimited haircuts", "All grooming rituals included", "20% off apothecary", "Same-day booking", "Private suite & events"],
      },
    ],
    gallery: [gal1, gal2, gal3, svcHaircut, svcShave, svcMassage],
    testimonials: [
      { name: "James R.", role: "Member since 2022", rating: 5, quote: "The most considered grooming experience in the city. Every visit feels like a private ritual." },
      { name: "Michael T.", role: "Premium member", rating: 5, quote: "Booking is effortless and the craft is uncompromising. I've never trusted my hair to anyone else." },
      { name: "David L.", role: "VIP member", rating: 5, quote: "The members lounge alone is worth it. The cuts and shaves are unmatched in Miami." },
    ],
  },
  "urban-fade": {
    slug: "urban-fade",
    name: "Urban Fade Atelier",
    tagline: "Sharp lines. Slow rituals.",
    city: "Brooklyn",
    address: "88 N 6th St, Brooklyn, NY",
    phone: "(718) 555-0199",
    whatsapp: "17185550199",
    instagram: "@urbanfade",
    email: "hello@urbanfade.co",
    hours: [
      { day: "Tue — Fri", hours: "10:00 — 21:00" },
      { day: "Sat — Sun", hours: "10:00 — 19:00" },
      { day: "Monday", hours: "Closed" },
    ],
    hero: {
      eyebrow: "Brooklyn atelier",
      title: "Sharp Lines\nSlow Rituals",
      subtitle:
        "A modern barbering atelier built around craft, conversation and the unhurried pleasure of being well-kept.",
      image: heroImg,
    },
    stats: [
      { value: "8y", label: "Of craft" },
      { value: "820", label: "Active members" },
      { value: "14", label: "Master barbers" },
      { value: "4.92", label: "Member rating" },
    ],
    pillars: [
      { icon: "scissors", title: "Master Fades" },
      { icon: "sparkles", title: "Botanical Oils" },
      { icon: "crown", title: "Atelier Lounge" },
      { icon: "star", title: "Lifetime Care" },
    ],
    services: [
      { id: "haircut", name: "Atelier Cut", description: "Signature consultation, scissor & clipper craft for a sharp, modern silhouette.", price: 55, durationMin: 45, image: svcHaircut },
      { id: "beard", name: "Beard Architecture", description: "Razor line-up, hot-towel softening and finishing oil.", price: 30, durationMin: 30, image: svcBeard },
      { id: "shave", name: "Straight Razor Ritual", description: "Traditional shave with apothecary balms and steamed towels.", price: 50, durationMin: 40, image: svcShave },
      { id: "massage", name: "Scalp Therapy", description: "Pressure-point scalp ritual with botanical infusions.", price: 40, durationMin: 25, image: svcMassage },
    ],
    memberships: [
      { id: "gold", name: "Gold", price: 45, benefits: ["2 cuts / month", "Beard trim", "10% off apothecary", "Priority booking"] },
      { id: "premium", name: "Premium", price: 75, badge: "Most chosen", highlight: true, benefits: ["4 cuts / month", "Unlimited beard trims", "15% off apothecary", "Atelier lounge access"] },
      { id: "vip", name: "VIP", price: 120, benefits: ["Unlimited cuts", "All rituals included", "20% off apothecary", "Private events"] },
    ],
    gallery: [gal1, gal2, gal3, svcHaircut, svcShave, svcMassage],
    testimonials: [
      { name: "Nico V.", role: "Member since 2023", rating: 5, quote: "Calm, considered, never rushed. Best atelier in Brooklyn." },
      { name: "Andre B.", role: "Premium member", rating: 5, quote: "The line-ups are surgical. The space is a sanctuary." },
      { name: "Marcus K.", role: "VIP member", rating: 5, quote: "Membership pays for itself in the first two visits." },
    ],
  },
};

export const getTenant = (slug: string): Tenant | undefined => TENANTS[slug];
export const allTenants = (): Tenant[] => Object.values(TENANTS);