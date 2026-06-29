import { createFileRoute, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/forbidden")({
  ssr: false,
  head: () => ({ meta: [{ title: "Access denied" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: ForbiddenPage,
});

function ForbiddenPage() {
  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="max-w-md text-center">
        <p className="eyebrow text-red-700">403 · Access denied</p>
        <h1 className="mt-4 font-display text-4xl">You don't have access here</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Your account doesn't have permission to view this area. Sign in with a different account or contact the platform administrator.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link to="/" className="btn-ghost-luxury">Home</Link>
          <button onClick={signOut} className="btn-luxury">Sign out</button>
        </div>
      </div>
    </div>
  );
}