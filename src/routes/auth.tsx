import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getMyAccess } from "@/lib/access.functions";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setLoading(false); setError(error.message); return; }
    const access = await getMyAccess().catch(() => null);
    setLoading(false);
    if (access?.isSuperAdmin) { navigate({ to: "/admin" }); return; }
    if (access && access.businessSlugs.length > 0) {
      navigate({ to: "/b/$slug/admin", params: { slug: access.businessSlugs[0] } });
      return;
    }
    navigate({ to: "/forbidden" });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="w-full max-w-md">
        <Link to="/" className="eyebrow">← Back home</Link>
        <h1 className="mt-6 font-display text-4xl">Sign in</h1>
        <p className="mt-2 text-sm text-muted-foreground">Platform & business administration.</p>
        <form onSubmit={onSubmit} className="mt-10 space-y-5">
          <div>
            <label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full rounded-md border bg-background px-4 py-3 text-sm outline-none focus:border-[color:var(--bronze)]" />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Password</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full rounded-md border bg-background px-4 py-3 text-sm outline-none focus:border-[color:var(--bronze)]" />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={loading} className="btn-luxury w-full justify-center">
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}