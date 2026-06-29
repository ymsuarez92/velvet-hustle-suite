
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('super_admin', 'business_admin', 'staff');
CREATE TYPE public.business_status AS ENUM ('draft', 'published', 'suspended');
CREATE TYPE public.appointment_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed', 'no_show');
CREATE TYPE public.subscription_status AS ENUM ('active', 'cancelled', 'paused', 'expired');

-- ============ HELPER: updated_at trigger ============
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  business_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role, business_id)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_business_member(_user_id UUID, _business_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND business_id = _business_id
      AND role IN ('business_admin', 'staff')
  );
$$;

CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));

-- ============ BUSINESSES ============
CREATE TABLE public.businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  tagline TEXT,
  status business_status NOT NULL DEFAULT 'draft',
  city TEXT,
  address TEXT,
  phone TEXT,
  whatsapp TEXT,
  email TEXT,
  instagram TEXT,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#B0844A',
  accent_color TEXT DEFAULT '#EFE6D6',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.businesses TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.businesses TO authenticated;
GRANT ALL ON public.businesses TO service_role;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_businesses_updated BEFORE UPDATE ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "Public can view published businesses" ON public.businesses FOR SELECT
  USING (status = 'published' OR public.is_business_member(auth.uid(), id) OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admin manage businesses" ON public.businesses FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin')) WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Business admins update own business" ON public.businesses FOR UPDATE TO authenticated
  USING (public.is_business_member(auth.uid(), id));

-- ============ WEBSITE CONTENT ============
CREATE TABLE public.website_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL UNIQUE REFERENCES public.businesses(id) ON DELETE CASCADE,
  hero_eyebrow TEXT,
  hero_title TEXT,
  hero_subtitle TEXT,
  hero_image_url TEXT,
  about_title TEXT,
  about_body TEXT,
  stats JSONB DEFAULT '[]'::jsonb,
  pillars JSONB DEFAULT '[]'::jsonb,
  gallery JSONB DEFAULT '[]'::jsonb,
  testimonials JSONB DEFAULT '[]'::jsonb,
  hours JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.website_content TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.website_content TO authenticated;
GRANT ALL ON public.website_content TO service_role;
ALTER TABLE public.website_content ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_website_content_updated BEFORE UPDATE ON public.website_content
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "Public view content of published" ON public.website_content FOR SELECT
  USING (EXISTS(SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.status = 'published')
    OR public.is_business_member(auth.uid(), business_id)
    OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Members manage content" ON public.website_content FOR ALL TO authenticated
  USING (public.is_business_member(auth.uid(), business_id) OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.is_business_member(auth.uid(), business_id) OR public.has_role(auth.uid(), 'super_admin'));

-- ============ SERVICES ============
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  duration_min INTEGER NOT NULL DEFAULT 30,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.services TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.services TO authenticated;
GRANT ALL ON public.services TO service_role;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_services_updated BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_services_business ON public.services(business_id);

CREATE POLICY "Public view services of published" ON public.services FOR SELECT
  USING (is_active AND EXISTS(SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.status = 'published')
    OR public.is_business_member(auth.uid(), business_id)
    OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Members manage services" ON public.services FOR ALL TO authenticated
  USING (public.is_business_member(auth.uid(), business_id) OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.is_business_member(auth.uid(), business_id) OR public.has_role(auth.uid(), 'super_admin'));

-- ============ MEMBERSHIPS ============
CREATE TABLE public.memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  included_cuts INTEGER DEFAULT 0,
  benefits JSONB DEFAULT '[]'::jsonb,
  badge TEXT,
  highlighted BOOLEAN NOT NULL DEFAULT false,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.memberships TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.memberships TO authenticated;
GRANT ALL ON public.memberships TO service_role;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_memberships_updated BEFORE UPDATE ON public.memberships
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_memberships_business ON public.memberships(business_id);

CREATE POLICY "Public view memberships of published" ON public.memberships FOR SELECT
  USING (is_active AND EXISTS(SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.status = 'published')
    OR public.is_business_member(auth.uid(), business_id)
    OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Members manage memberships" ON public.memberships FOR ALL TO authenticated
  USING (public.is_business_member(auth.uid(), business_id) OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.is_business_member(auth.uid(), business_id) OR public.has_role(auth.uid(), 'super_admin'));

-- ============ CUSTOMERS ============
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  notes TEXT,
  total_visits INTEGER NOT NULL DEFAULT 0,
  total_spend NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_customers_updated BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_customers_business ON public.customers(business_id);

CREATE POLICY "Members manage customers" ON public.customers FOR ALL TO authenticated
  USING (public.is_business_member(auth.uid(), business_id) OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.is_business_member(auth.uid(), business_id) OR public.has_role(auth.uid(), 'super_admin'));

-- ============ SUBSCRIPTIONS ============
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  membership_id UUID NOT NULL REFERENCES public.memberships(id) ON DELETE RESTRICT,
  status subscription_status NOT NULL DEFAULT 'active',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ,
  cuts_used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_subscriptions_updated BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_subs_business ON public.subscriptions(business_id);

CREATE POLICY "Members manage subs" ON public.subscriptions FOR ALL TO authenticated
  USING (public.is_business_member(auth.uid(), business_id) OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.is_business_member(auth.uid(), business_id) OR public.has_role(auth.uid(), 'super_admin'));

-- ============ STAFF ============
CREATE TABLE public.staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  role TEXT,
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.staff TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff TO authenticated;
GRANT ALL ON public.staff TO service_role;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_staff_business ON public.staff(business_id);

CREATE POLICY "Public view staff of published" ON public.staff FOR SELECT
  USING (is_active AND EXISTS(SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.status = 'published')
    OR public.is_business_member(auth.uid(), business_id)
    OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Members manage staff" ON public.staff FOR ALL TO authenticated
  USING (public.is_business_member(auth.uid(), business_id) OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.is_business_member(auth.uid(), business_id) OR public.has_role(auth.uid(), 'super_admin'));

-- ============ BUSINESS HOURS ============
CREATE TABLE public.business_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  weekday SMALLINT NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  is_open BOOLEAN NOT NULL DEFAULT true,
  open_time TIME,
  close_time TIME,
  break_start TIME,
  break_end TIME,
  UNIQUE (business_id, weekday)
);
GRANT SELECT ON public.business_hours TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_hours TO authenticated;
GRANT ALL ON public.business_hours TO service_role;
ALTER TABLE public.business_hours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public view hours of published" ON public.business_hours FOR SELECT
  USING (EXISTS(SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.status = 'published')
    OR public.is_business_member(auth.uid(), business_id)
    OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Members manage hours" ON public.business_hours FOR ALL TO authenticated
  USING (public.is_business_member(auth.uid(), business_id) OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.is_business_member(auth.uid(), business_id) OR public.has_role(auth.uid(), 'super_admin'));

-- ============ BLOCKED DATES ============
CREATE TABLE public.blocked_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  blocked_date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.blocked_dates TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blocked_dates TO authenticated;
GRANT ALL ON public.blocked_dates TO service_role;
ALTER TABLE public.blocked_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public view blocked of published" ON public.blocked_dates FOR SELECT
  USING (EXISTS(SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.status = 'published')
    OR public.is_business_member(auth.uid(), business_id)
    OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Members manage blocked" ON public.blocked_dates FOR ALL TO authenticated
  USING (public.is_business_member(auth.uid(), business_id) OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.is_business_member(auth.uid(), business_id) OR public.has_role(auth.uid(), 'super_admin'));

-- ============ APPOINTMENTS ============
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  staff_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_email TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status appointment_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;
GRANT INSERT ON public.appointments TO anon;
GRANT ALL ON public.appointments TO service_role;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_appointments_updated BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_appointments_business_time ON public.appointments(business_id, starts_at);

CREATE POLICY "Members manage appointments" ON public.appointments FOR ALL TO authenticated
  USING (public.is_business_member(auth.uid(), business_id) OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.is_business_member(auth.uid(), business_id) OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Public can request appointment at published" ON public.appointments FOR INSERT
  WITH CHECK (EXISTS(SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.status = 'published'));

-- ============ MEDIA ============
CREATE TABLE public.media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  storage_path TEXT,
  kind TEXT,
  alt TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.media TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media TO authenticated;
GRANT ALL ON public.media TO service_role;
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_media_business ON public.media(business_id);

CREATE POLICY "Public view media" ON public.media FOR SELECT USING (true);
CREATE POLICY "Members manage media" ON public.media FOR ALL TO authenticated
  USING (public.is_business_member(auth.uid(), business_id) OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.is_business_member(auth.uid(), business_id) OR public.has_role(auth.uid(), 'super_admin'));
