-- Add Stripe fields to memberships
ALTER TABLE public.memberships
  ADD COLUMN IF NOT EXISTS stripe_price_id text;

-- Add Stripe fields to subscriptions
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text;

-- Payments / invoice history table
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  stripe_payment_intent_id text,
  stripe_invoice_id text,
  amount numeric(10,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'usd',
  status text NOT NULL DEFAULT 'pending',  -- pending, succeeded, failed, refunded
  description text,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business members read payments"
  ON public.payments FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin')
    OR public.is_business_member(auth.uid(), business_id)
  );

CREATE INDEX IF NOT EXISTS idx_payments_business ON public.payments (business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_customer ON public.payments (customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_pi ON public.payments (stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe ON public.subscriptions (stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_cust ON public.subscriptions (stripe_customer_id);
