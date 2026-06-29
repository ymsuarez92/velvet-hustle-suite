---
name: Tenant isolation pattern for multi-tenant queries
description: Rules for ensuring all DB queries are scoped to the correct tenant/business in the BarberSaaS platform.
---

All server functions must scope queries to `business_id` — even when filtering by a child entity like `customer_id`.

**Rule:** Never rely solely on a child-entity ID to scope a query. Always add `.eq("business_id", business.id)` as an additional predicate on every table that has a `business_id` column.

**Why:** A customer from business A could theoretically share appointments or subscriptions that appear in another business's data if only filtered by `customer_id`. This breaks multi-tenant isolation.

**How to apply:**
- `appointments` queries: always include `.eq("business_id", business.id)` even when also filtering by `customer_id` or `customer_id IN (...)`.
- `subscriptions` don't have a direct `business_id`; filter via the joined `memberships(business_id)` and exclude rows where `s.memberships.business_id !== business.id`.
- Always check `.error` on every Supabase query (including enrichment sub-queries) and throw immediately; never silently degrade.
- Entry point: `loadBusinessOrThrow(supabase, slug)` + `assertCanEdit(context, business.id)` at the top of every server function handler.
