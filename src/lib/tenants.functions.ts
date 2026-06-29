import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

export type PublicTenant = {
  slug: string;
  name: string;
  tagline: string | null;
  city: string | null;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  instagram: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  accentColor: string | null;
  hero: {
    eyebrow: string;
    title: string;
    subtitle: string;
    image: string;
  };
  stats: { value: string; label: string }[];
  pillars: { icon: string; title: string }[];
  gallery: string[];
  testimonials: { name: string; role: string; quote: string; rating: number }[];
  hours: { day: string; hours: string }[];
  services: {
    id: string;
    name: string;
    description: string | null;
    durationMin: number;
    price: number;
    image: string | null;
  }[];
  memberships: {
    id: string;
    name: string;
    price: number;
    benefits: string[];
    badge: string | null;
    highlight: boolean;
  }[];
};

export type TenantSummary = {
  slug: string;
  name: string;
  tagline: string | null;
  city: string | null;
  heroImage: string | null;
};

export const listPublicTenants = createServerFn({ method: "GET" }).handler(
  async (): Promise<TenantSummary[]> => {
    const sb = publicClient();
    const { data: businesses, error } = await sb
      .from("businesses")
      .select("slug, name, tagline, city")
      .eq("status", "published")
      .order("name");
    if (error) throw new Error(error.message);
    if (!businesses) return [];
    const slugs = businesses.map((b) => b.slug);
    const { data: contents } = await sb
      .from("website_content")
      .select("business_id, hero_image_url, businesses!inner(slug)")
      .in("businesses.slug", slugs);
    const heroBySlug = new Map<string, string>();
    for (const row of (contents ?? []) as Array<{
      hero_image_url: string | null;
      businesses: { slug: string };
    }>) {
      if (row.hero_image_url) heroBySlug.set(row.businesses.slug, row.hero_image_url);
    }
    return businesses.map((b) => ({
      slug: b.slug,
      name: b.name,
      tagline: b.tagline,
      city: b.city,
      heroImage: heroBySlug.get(b.slug) ?? null,
    }));
  },
);

export const getPublicTenant = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => d)
  .handler(async ({ data }): Promise<PublicTenant | null> => {
    const sb = publicClient();
    const { data: business, error: bErr } = await sb
      .from("businesses")
      .select("*")
      .eq("slug", data.slug)
      .eq("status", "published")
      .maybeSingle();
    if (bErr) throw new Error(bErr.message);
    if (!business) return null;

    const [contentRes, servicesRes, membershipsRes] = await Promise.all([
      sb.from("website_content").select("*").eq("business_id", business.id).maybeSingle(),
      sb
        .from("services")
        .select("id, name, description, duration_min, price, image_url, sort_order, is_active")
        .eq("business_id", business.id)
        .eq("is_active", true)
        .order("sort_order"),
      sb
        .from("memberships")
        .select("id, name, price, benefits, badge, highlighted, sort_order, is_active")
        .eq("business_id", business.id)
        .eq("is_active", true)
        .order("sort_order"),
    ]);

    const c = contentRes.data;

    return {
      slug: business.slug,
      name: business.name,
      tagline: business.tagline,
      city: business.city,
      address: business.address,
      phone: business.phone,
      whatsapp: business.whatsapp,
      email: business.email,
      instagram: business.instagram,
      logoUrl: business.logo_url,
      primaryColor: business.primary_color,
      accentColor: business.accent_color,
      hero: {
        eyebrow: c?.hero_eyebrow ?? "Premium grooming",
        title: c?.hero_title ?? business.name,
        subtitle: c?.hero_subtitle ?? business.tagline ?? "",
        image:
          c?.hero_image_url ??
          "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=1920&q=80",
      },
      stats: (c?.stats as PublicTenant["stats"]) ?? [],
      pillars: (c?.pillars as PublicTenant["pillars"]) ?? [],
      gallery: (c?.gallery as string[]) ?? [],
      testimonials: (c?.testimonials as PublicTenant["testimonials"]) ?? [],
      hours: (c?.hours as PublicTenant["hours"]) ?? [],
      services: (servicesRes.data ?? []).map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        durationMin: s.duration_min,
        price: Number(s.price),
        image: s.image_url,
      })),
      memberships: (membershipsRes.data ?? []).map((m) => ({
        id: m.id,
        name: m.name,
        price: Number(m.price),
        benefits: (m.benefits as string[]) ?? [],
        badge: m.badge,
        highlight: m.highlighted,
      })),
    };
  });