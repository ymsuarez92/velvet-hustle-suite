import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type MyAccess = {
  userId: string;
  email: string | null;
  isSuperAdmin: boolean;
  businessSlugs: string[];
};

export const getMyAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MyAccess> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: roles, error } = await supabaseAdmin
      .from("user_roles")
      .select("role, business_id")
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);

    const isSuperAdmin = (roles ?? []).some((r: any) => r.role === "super_admin");
    const businessIds = Array.from(
      new Set(
        (roles ?? [])
          .filter((r: any) => (r.role === "business_admin" || r.role === "staff") && r.business_id)
          .map((r: any) => r.business_id as string),
      ),
    );

    let businessSlugs: string[] = [];
    if (businessIds.length > 0) {
      const { data: bs, error: bErr } = await supabaseAdmin
        .from("businesses")
        .select("slug")
        .in("id", businessIds);
      if (bErr) throw new Error(bErr.message);
      businessSlugs = (bs ?? []).map((b: any) => b.slug as string);
    }

    return {
      userId: context.userId,
      email: (context.claims as any)?.email ?? null,
      isSuperAdmin,
      businessSlugs,
    };
  });