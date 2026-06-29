
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS subscription_plan text NOT NULL DEFAULT 'starter',
  ADD COLUMN IF NOT EXISTS suspended_at timestamptz;

-- AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid,
  actor_email text,
  business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity text,
  entity_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admin reads audit"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_business ON public.audit_logs (business_id, created_at DESC);

-- SERVICE TEMPLATES (platform-wide)
CREATE TABLE IF NOT EXISTS public.service_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  category text,
  duration_min int NOT NULL DEFAULT 30,
  suggested_price numeric(10,2) NOT NULL DEFAULT 0,
  image_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.service_templates TO authenticated;
GRANT ALL ON public.service_templates TO service_role;
ALTER TABLE public.service_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read service templates"
  ON public.service_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super admin manage service templates"
  ON public.service_templates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE TRIGGER trg_service_templates_updated
  BEFORE UPDATE ON public.service_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- MEMBERSHIP TEMPLATES
CREATE TABLE IF NOT EXISTS public.membership_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier text NOT NULL,
  name text NOT NULL,
  description text,
  badge text,
  monthly_price numeric(10,2) NOT NULL DEFAULT 0,
  included_cuts int,
  benefits text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.membership_templates TO authenticated;
GRANT ALL ON public.membership_templates TO service_role;
ALTER TABLE public.membership_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read membership templates"
  ON public.membership_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super admin manage membership templates"
  ON public.membership_templates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE TRIGGER trg_membership_templates_updated
  BEFORE UPDATE ON public.membership_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
