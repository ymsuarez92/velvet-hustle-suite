import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listAllTenants, createTenant, setTenantStatus } from "@/lib/admin.functions";
import { assignBusinessOwner } from "@/lib/business-admin.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin")({
  component: SuperAdmin,
});

function SuperAdmin() {
  const router = useRouter();
  const qc = useQueryClient();
  const list = useServerFn(listAllTenants);
  const create = useServerFn(createTenant);
  const setStatus = useServerFn(setTenantStatus);
  const assign = useServerFn(assignBusinessOwner);

  const { data: tenants = [], isLoading } = useQuery({
    queryKey: ["admin", "tenants"],
    queryFn: () => list(),
  });

  const createMut = useMutation({
    mutationFn: (input: { slug: string; name: string; city?: string; tagline?: string }) =>
      create({ data: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "tenants"] }),
  });

  const statusMut = useMutation({
    mutationFn: (input: { id: string; status: "draft" | "published" | "suspended" }) =>
      setStatus({ data: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "tenants"] }),
  });

  const assignMut = useMutation({
    mutationFn: (input: { businessId: string; email: string }) => assign({ data: input }),
  });

  const [form, setForm] = useState({ slug: "", name: "", city: "", tagline: "" });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container-luxury flex items-center justify-between py-5">
          <div>
            <p className="eyebrow">Platform</p>
            <h1 className="font-display text-2xl">Super Admin</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">Platform home</Link>
            <button onClick={signOut} className="rounded-full border px-4 py-2 text-xs uppercase tracking-[0.18em]">Sign out</button>
          </div>
        </div>
      </header>

      <main className="container-luxury py-12 space-y-12">
        <section className="rounded-2xl border bg-card p-8">
          <h2 className="font-display text-xl">Create a new house</h2>
          <p className="mt-1 text-sm text-muted-foreground">Spin up a tenant. Starts as draft; publish when ready.</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!form.slug || !form.name) return;
              createMut.mutate(
                { slug: form.slug, name: form.name, city: form.city || undefined, tagline: form.tagline || undefined },
                { onSuccess: () => setForm({ slug: "", name: "", city: "", tagline: "" }) },
              );
            }}
            className="mt-6 grid gap-4 md:grid-cols-2"
          >
            <Field label="Slug (URL)" value={form.slug} onChange={(v) => setForm({ ...form, slug: v })} placeholder="elite-barber" />
            <Field label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Maison Élite" />
            <Field label="City" value={form.city} onChange={(v) => setForm({ ...form, city: v })} placeholder="Madrid" />
            <Field label="Tagline" value={form.tagline} onChange={(v) => setForm({ ...form, tagline: v })} placeholder="Premium grooming since 2019" />
            <div className="md:col-span-2 flex items-center justify-between">
              {createMut.error && <p className="text-sm text-red-600">{(createMut.error as Error).message}</p>}
              <button type="submit" disabled={createMut.isPending} className="btn-luxury">
                {createMut.isPending ? "Creating…" : "Create tenant"}
              </button>
            </div>
          </form>
        </section>

        <section>
          <div className="flex items-end justify-between">
            <div>
              <p className="eyebrow">All tenants</p>
              <h2 className="font-display text-3xl">{tenants.length} houses</h2>
            </div>
          </div>

          <div className="mt-6 overflow-hidden rounded-2xl border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-[0.18em] text-muted-foreground">
                <tr>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Slug</th>
                  <th className="px-6 py-4">City</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">Loading…</td></tr>
                )}
                {!isLoading && tenants.length === 0 && (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">No tenants yet.</td></tr>
                )}
                {tenants.map((t) => (
                  <tr key={t.id} className="border-t">
                    <td className="px-6 py-4 font-medium">{t.name}</td>
                    <td className="px-6 py-4 text-muted-foreground">/b/{t.slug}</td>
                    <td className="px-6 py-4">{t.city ?? "—"}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs ${
                        t.status === "published" ? "bg-emerald-100 text-emerald-800"
                        : t.status === "suspended" ? "bg-red-100 text-red-800"
                        : "bg-amber-100 text-amber-800"}`}>{t.status}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex gap-2">
                        <Link to="/b/$slug" params={{ slug: t.slug }} className="rounded-full border px-3 py-1 text-xs">View</Link>
                        <Link to="/b/$slug/admin" params={{ slug: t.slug }} className="rounded-full border px-3 py-1 text-xs">Admin</Link>
                        <button onClick={() => {
                          const email = prompt(`Assign business admin for "${t.name}" — user's email (they must sign up first):`);
                          if (email) assignMut.mutate({ businessId: t.id, email });
                        }} className="rounded-full border px-3 py-1 text-xs">Owner</button>
                        {t.status !== "published" ? (
                          <button onClick={() => statusMut.mutate({ id: t.id, status: "published" })}
                            className="rounded-full bg-[color:var(--bronze)] px-3 py-1 text-xs text-white">Publish</button>
                        ) : (
                          <button onClick={() => statusMut.mutate({ id: t.id, status: "draft" })}
                            className="rounded-full border px-3 py-1 text-xs">Unpublish</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="mt-2 w-full rounded-md border bg-background px-4 py-3 text-sm outline-none focus:border-[color:var(--bronze)]" />
    </label>
  );
}