# BarberSaaS — Multi-Tenant Barber Shop CRM Platform

## Project Overview

A full-featured multi-tenant SaaS CRM platform for barber shops and hair salons, similar to Shopify/Fresha/Vagaro. Built with TanStack Start (SSR), Supabase (DB + Auth), and TailwindCSS.

## Architecture

**3 Layers:**
1. **Super Admin** (`/` → login → `/admin`) — Global platform management
2. **Tenant Public Sites** (`/b/<slug>`) — Luxury public-facing barber shop websites
3. **Tenant Admin Dashboards** (`/b/<slug>/admin`) — Per-business owner control panel

## Tech Stack

- **Frontend:** React 19, TanStack Start (SSR), TanStack Router, TailwindCSS v4
- **Backend:** TanStack Server Functions (SSR), Supabase Edge
- **Database:** PostgreSQL via Supabase with Row Level Security
- **Auth:** Supabase Auth
- **Styling:** TailwindCSS v4, Shadcn/UI components
- **Runtime:** Bun + Vite

## Key Routes

| Route | Description |
|-------|-------------|
| `/` | Platform login (redirects based on role) |
| `/auth` | Auth page |
| `/admin` | Super Admin dashboard |
| `/b/$slug` | Public tenant landing page |
| `/b/$slug/admin` | Business owner/admin dashboard |
| `/forbidden` | Access denied |

## Roles

- `super_admin` — Full platform access
- `business_admin` — Manages one or more specific businesses
- `staff` — Limited business access

## Running

```bash
npm run dev  # starts on port 5000
```

## Environment Variables

- `SUPABASE_URL` — Supabase project URL
- `SUPABASE_PUBLISHABLE_KEY` — Supabase anon key (also as VITE_*)
- `SESSION_SECRET` — Session secret

## User Preferences

- Spanish/English bilingual UI (EN/ES toggle on tenant sites)
- Premium luxury aesthetic: warm whites, champagne, charcoal accents, gold (#d4a85a)
- All business-related tables must include `business_id` for tenant isolation
- Never expose Stripe or auth secrets in client code
