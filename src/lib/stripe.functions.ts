/**
 * Stripe integration — checkout sessions & webhook handling.
 *
 * Requires env secrets:
 *   STRIPE_SECRET_KEY     — sk_live_... or sk_test_...
 *   STRIPE_WEBHOOK_SECRET — whsec_...
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function stripeClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured. Add it to your Replit secrets.");
  // Dynamic import to avoid bundling issues when key is missing
  const Stripe = require("stripe");
  return new Stripe(key, { apiVersion: "2024-12-18.acacia" });
}

/* ------------------------------------------------------------------ */
/* Public: create a Stripe Checkout Session for a membership           */
/* ------------------------------------------------------------------ */
export const createMembershipCheckout = createServerFn({ method: "POST" })
  .inputValidator((d: {
    slug: string;
    membershipId: string;
    customerEmail?: string;
    successUrl: string;
    cancelUrl: string;
  }) => d)
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { storage: undefined, persistSession: false } },
    );

    // Load business
    const { data: biz, error: bErr } = await sb
      .from("businesses")
      .select("id, name, slug, status")
      .eq("slug", data.slug)
      .maybeSingle();
    if (bErr || !biz) throw new Error("Business not found");
    if (biz.status !== "published") throw new Error("Business is not available");

    // Load membership + stripe_price_id
    const { data: mem, error: mErr } = await sb
      .from("memberships")
      .select("id, name, price, stripe_price_id, is_active")
      .eq("id", data.membershipId)
      .eq("business_id", biz.id)
      .maybeSingle();
    if (mErr || !mem) throw new Error("Membership not found");
    if (!mem.is_active) throw new Error("Membership is not available");

    const stripe = stripeClient();

    // If a Stripe Price ID is already stored, use it; otherwise create an ad-hoc price
    let priceId: string = mem.stripe_price_id ?? "";

    if (!priceId) {
      // Create a one-off price on the fly (recurring monthly)
      const price = await stripe.prices.create({
        currency: "usd",
        unit_amount: Math.round(Number(mem.price) * 100),
        recurring: { interval: "month" },
        product_data: {
          name: `${biz.name} — ${mem.name}`,
          metadata: { business_id: biz.id, membership_id: mem.id },
        },
      });
      priceId = price.id;
      // Persist the price id so subsequent checkouts reuse it
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin
        .from("memberships")
        .update({ stripe_price_id: priceId })
        .eq("id", mem.id);
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: data.customerEmail || undefined,
      metadata: {
        business_id: biz.id,
        membership_id: mem.id,
        slug: data.slug,
      },
      subscription_data: {
        metadata: {
          business_id: biz.id,
          membership_id: mem.id,
        },
      },
      success_url: data.successUrl + "?session_id={CHECKOUT_SESSION_ID}&status=success",
      cancel_url: data.cancelUrl + "?status=cancelled",
    });

    return { url: session.url! };
  });

/* ------------------------------------------------------------------ */
/* Admin: list tenant payments                                          */
/* ------------------------------------------------------------------ */
export const listPayments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { businessId: string }) => d)
  .handler(async ({ context, data }) => {
    const [{ data: isSuper }, { data: isMember }] = await Promise.all([
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "super_admin" }),
      context.supabase.rpc("is_business_member", { _user_id: context.userId, _business_id: data.businessId }),
    ]);
    if (!isSuper && !isMember) throw new Error("Forbidden");

    const { data: rows, error } = await context.supabase
      .from("payments")
      .select("id, amount, currency, status, description, paid_at, created_at, customers(full_name)")
      .eq("business_id", data.businessId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);

    return (rows ?? []).map((r: any) => ({
      id: r.id,
      amount: Number(r.amount),
      currency: r.currency,
      status: r.status,
      description: r.description,
      paidAt: r.paid_at,
      createdAt: r.created_at,
      customerName: r.customers?.full_name ?? null,
    }));
  });
