/**
 * Stripe webhook endpoint — /api/stripe-webhook
 *
 * Handles:
 *   checkout.session.completed  → activate subscription
 *   invoice.payment_succeeded   → record payment, renew subscription
 *   invoice.payment_failed      → mark subscription past_due
 *   customer.subscription.deleted → cancel subscription
 */
import { createAPIFileRoute } from "@tanstack/react-start/api";

export const APIRoute = createAPIFileRoute("/api/stripe-webhook")({
  POST: async ({ request }) => {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!stripeKey || !webhookSecret) {
      return new Response("Stripe is not configured", { status: 503 });
    }

    const Stripe = require("stripe");
    const stripe = new Stripe(stripeKey, { apiVersion: "2024-12-18.acacia" });

    const body = await request.text();
    const sig = request.headers.get("stripe-signature") ?? "";

    let event: any;
    try {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } catch (err: any) {
      console.error("[stripe-webhook] signature verification failed:", err.message);
      return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as any;
          if (session.mode !== "subscription") break;

          const { business_id, membership_id } = session.metadata ?? {};
          if (!business_id || !membership_id) break;

          const stripeSubId: string = session.subscription;
          const stripeCustomerId: string = session.customer;

          // Retrieve subscription from Stripe to get period end
          const stripeSub = await stripe.subscriptions.retrieve(stripeSubId);
          const currentPeriodEnd = new Date(stripeSub.current_period_end * 1000).toISOString();

          // Create or update subscription record
          const { data: existing } = await supabaseAdmin
            .from("subscriptions")
            .select("id")
            .eq("stripe_subscription_id", stripeSubId)
            .maybeSingle();

          if (existing) {
            await supabaseAdmin
              .from("subscriptions")
              .update({ status: "active", ends_at: currentPeriodEnd })
              .eq("id", existing.id);
          } else {
            await supabaseAdmin.from("subscriptions").insert({
              business_id,
              membership_id,
              status: "active",
              started_at: new Date().toISOString(),
              ends_at: currentPeriodEnd,
              stripe_subscription_id: stripeSubId,
              stripe_customer_id: stripeCustomerId,
            });
          }
          break;
        }

        case "invoice.payment_succeeded": {
          const invoice = event.data.object as any;
          const stripeSubId = invoice.subscription;
          if (!stripeSubId) break;

          const { data: sub } = await supabaseAdmin
            .from("subscriptions")
            .select("id, business_id, customer_id, membership_id")
            .eq("stripe_subscription_id", stripeSubId)
            .maybeSingle();
          if (!sub) break;

          const stripeSub = await stripe.subscriptions.retrieve(stripeSubId);
          const periodEnd = new Date(stripeSub.current_period_end * 1000).toISOString();

          await Promise.all([
            supabaseAdmin.from("subscriptions").update({
              status: "active",
              ends_at: periodEnd,
            }).eq("id", sub.id),

            supabaseAdmin.from("payments").insert({
              business_id: sub.business_id,
              customer_id: sub.customer_id ?? null,
              subscription_id: sub.id,
              stripe_payment_intent_id: invoice.payment_intent ?? null,
              stripe_invoice_id: invoice.id,
              amount: invoice.amount_paid / 100,
              currency: invoice.currency,
              status: "succeeded",
              description: invoice.description ?? "Subscription renewal",
              paid_at: new Date(invoice.status_transitions.paid_at * 1000).toISOString(),
            }),
          ]);
          break;
        }

        case "invoice.payment_failed": {
          const invoice = event.data.object as any;
          const stripeSubId = invoice.subscription;
          if (!stripeSubId) break;

          await supabaseAdmin
            .from("subscriptions")
            .update({ status: "past_due" })
            .eq("stripe_subscription_id", stripeSubId);
          break;
        }

        case "customer.subscription.deleted": {
          const stripeSub = event.data.object as any;
          await supabaseAdmin
            .from("subscriptions")
            .update({ status: "cancelled", ends_at: new Date().toISOString() })
            .eq("stripe_subscription_id", stripeSub.id);
          break;
        }

        default:
          // Unhandled event — ok
          break;
      }
    } catch (err: any) {
      console.error("[stripe-webhook] handler error:", err.message);
      return new Response("Internal error", { status: 500 });
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  },
});
