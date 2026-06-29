## Multi-Tenant Barber SaaS — Build Plan

This is a large, multi-phase build. I'll structure it in phases so we ship working value incrementally and you can validate each phase before the next.

### Phase 0 — Backend foundation (Lovable Cloud)
- Enable Lovable Cloud (Postgres + Auth + Storage).
- Schema (all tenant tables include `business_id`, RLS enforced):
  - `businesses` (slug, name, status, branding, theme colors, logo)
  - `user_roles` (super_admin / business_admin / staff) — separate table, `has_role()` security-definer function
  - `business_members` (user_id ↔ business_id link)
  - `website_content` (hero, about, sections — JSONB per business)
  - `services`, `memberships`, `subscriptions`
  - `customers`, `appointments`
  - `business_hours`, `blocked_dates`, `staff`
  - `media` (Storage references)
- Storage buckets: `branding`, `services`, `gallery` (public read, authenticated write).
- RLS: tenant isolation via `business_id = (select business_id from business_members where user_id = auth.uid())` + `has_role()` for super admin.

### Phase 1 — Dynamic public landing (`/b/:slug`)
- Replace hardcoded `TENANTS` with DB-driven content via server function.
- Sections render from `website_content` + `services` + `memberships` + `media` + `testimonials`.
- Public read policies (`TO anon` SELECT on published businesses only).
- Keep current luxury cream/champagne design system.

### Phase 2 — Auth + role-based routing
- `/auth` page (email/password + Google).
- `_authenticated` layout (managed gate).
- Route guards by role: super admin → `/admin`, business admin → `/b/:slug/admin`.

### Phase 3 — Business admin panel (`/b/:slug/admin`)
- Dashboard (KPIs from real data).
- CMS editor: hero, gallery, branding, colors, logo (upload via Storage).
- Services CRUD (image upload + URL).
- Memberships CRUD + subscriber list.
- Customers CRM (profiles, history, notes, membership status).
- Appointments: calendar view, manual create/edit/cancel, staff assignment.
- Business hours + blocked dates + breaks.

### Phase 4 — Booking + availability engine
- Server function `getAvailableSlots(businessId, serviceId, date, staffId?)` computing slots from hours − appointments − blocks − breaks.
- Customer booking flow on landing page: service → staff → date → time → confirm.
- WhatsApp deep link as fallback CTA with pre-filled message.

### Phase 5 — Super admin panel (`/admin`)
- Create/suspend businesses, assign owners.
- Global KPIs: total businesses, MRR, active memberships, appointments, growth.
- Membership templates assignable to businesses.
- Platform user management.

### Tech notes
- Stack stays TanStack Start + Tailwind v4 + Supabase (Lovable Cloud).
- All reads via `createServerFn`; writes via server fns with `requireSupabaseAuth` + role checks.
- Demo seed migration creates 2 sample businesses so landings keep working immediately.

### What I need from you before starting
1. **Confirm Phase 0 + 1 first** (backend + dynamic landings) as the next deliverable, then Phase 2 → 5 in order. OK?
2. **Auth methods**: email/password + Google (default), or email-only?
3. **First business owner**: should I seed your email as super_admin in the migration so you can log in and create tenants immediately? If yes, give me the email.

Once you confirm, I'll execute Phase 0 + 1 end-to-end in one go.