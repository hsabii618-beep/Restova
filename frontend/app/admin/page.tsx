import React from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { isPlatformAdminEmail } from "@/lib/server/platform-admin";
import { createSupabaseAdminClient } from "@/lib/server/supabase-admin";
import PendingApprovalList from "./PendingApprovalList";

export default async function AdminPage() {
    const supabase = await createSupabaseServerClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login?next=/admin");
    }

    if (!isPlatformAdminEmail(user.email)) {
        redirect("/dashboard");
    }

    // Use service role to bypass RLS for platform admin view
    const adminSupabase = createSupabaseAdminClient();

    const { data: pendingRestaurants } = await adminSupabase
        .from("restaurants")
        .select("id, name, slug, owner_id, created_at")
        .is("deleted_at", null)
        .eq("is_active", false)
        .order("created_at", { ascending: false });

    return (
        <div style={{ display: "grid", gap: "1.5rem" }}>
            <header style={{ paddingBottom: "1rem", borderBottom: "1px solid var(--color-border-default)" }}>
                <h2 style={{ margin: 0 }}>System Overview</h2>
                <div style={{ fontSize: "0.9rem", color: "var(--color-text-muted)" }}>
                    <b>Admin:</b> {user.email}
                </div>
            </header>

            <div>
                <h3>Pending Approvals</h3>
                <PendingApprovalList restaurants={pendingRestaurants || []} />
            </div>

            <div style={{ marginTop: "2rem", paddingTop: "1rem", borderTop: "1px solid var(--color-border-default)" }}>
                <p style={{ color: "var(--color-text-muted)", fontSize: "0.9rem" }}>
                    Welcome to the platform administrator portal. Use POST /api/admin/restaurants/[id]/activate to approve.
                </p>
            </div>
        </div>
    );
}
