import React from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/dashboard");
  }

  // Use restaurant_users as the absolute source of truth for the role matrix
  // This accurately captures owners and future staff models natively
  const { data: memberData, error: memberError } = await supabase
    .from("restaurant_users")
    .select(`
      role,
      created_at,
      restaurants (
        id, name, slug, is_active, deleted_at
      )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (memberError) {
    return (
      <div style={{ padding: "2rem", border: "1px solid var(--color-border-error, red)", color: "var(--color-error, red)" }}>
        <h3>RLS or Database Error</h3>
        <pre>{JSON.stringify(memberError, null, 2)}</pre>
      </div>
    )
  }

  // Suppress TS inference arrays since the foreign key maps one restaurant explicitly
  const restaurant = memberData?.restaurants as any;

  if (!memberData || !restaurant || Array.isArray(restaurant)) {
    redirect("/dashboard/onboarding");
  }

  if (restaurant.deleted_at) {
    return (
      <div style={{ display: "grid", gap: "1rem" }}>
        <header style={{ paddingBottom: "1rem", borderBottom: "1px solid var(--color-border-default)" }}>
          <h2 style={{ margin: 0 }}>Restova Dashboard</h2>
          <div style={{ fontSize: "0.9rem", color: "var(--color-text-muted)" }}>
            <b>User:</b> {user.user_metadata?.full_name || user.user_metadata?.name || user.email} | <b>Restaurant:</b> {restaurant.name}
          </div>
        </header>

        <div style={{ padding: "2rem", border: "1px solid var(--color-border-error, red)", borderRadius: '8px', background: 'var(--color-bg-page)', maxWidth: 600 }}>
          <h3 style={{ marginTop: 0, color: 'var(--color-error, red)' }}>Application Rejected</h3>
          <p>
            Your previous application for <b>{restaurant.name}</b> was not approved.
          </p>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            You may review your details and submit a new application.
          </p>
          <a href="/dashboard/onboarding" style={{ display: 'inline-block', marginTop: '1rem', padding: '0.75rem 1rem', background: 'var(--color-brand-primary, #000)', color: 'white', borderRadius: 8, textDecoration: 'none', fontWeight: 'bold' }}>
            Submit New Application
          </a>
        </div>
      </div>
    );
  }

  if (!restaurant.is_active) {
    return (
      <div style={{ display: "grid", gap: "1rem" }}>
        <header style={{ paddingBottom: "1rem", borderBottom: "1px solid var(--color-border-default)" }}>
          <h2 style={{ margin: 0 }}>Restova Dashboard</h2>
          <div style={{ fontSize: "0.9rem", color: "var(--color-text-muted)" }}>
            <b>User:</b> {user.user_metadata?.full_name || user.user_metadata?.name || user.email} | <b>Restaurant:</b> {restaurant.name} (@{restaurant.slug})
          </div>
        </header>

        <div style={{ padding: "2rem", border: "1px solid var(--color-border-default)", borderRadius: '8px', background: 'var(--color-bg-page)', maxWidth: 600 }}>
          <h3 style={{ marginTop: 0, color: 'var(--color-brand-primary)' }}>Account Pending Approval</h3>
          <p>
            Your restaurant account is currently pending review by our platform administrators.
            Once approved, all core functionalities will be unlocked.
          </p>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            If you believe this is an error or need expedited approval, please contact support.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Overview</h2>
        <p className="text-neutral-500">Welcome back to {restaurant.name}.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-6 border border-neutral-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-black">
          <h3 className="text-sm font-medium text-neutral-500 mb-1">Restaurant Status</h3>
          <div className="text-lg font-bold flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span>
            Online & Accepting Orders
          </div>
        </div>
        <div className="p-6 border border-neutral-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-black">
          <h3 className="text-sm font-medium text-neutral-500 mb-1">Today's Revenue</h3>
          <div className="text-2xl font-bold text-neutral-400">---</div>
        </div>
        <div className="p-6 border border-neutral-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-black">
          <h3 className="text-sm font-medium text-neutral-500 mb-1">Active Orders</h3>
          <div className="text-2xl font-bold text-neutral-400">---</div>
        </div>
      </div>

      <div className="p-6 border border-neutral-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-black min-h-[300px]">
        <h3 className="font-semibold mb-4">Recent Activity</h3>
        <div className="flex items-center justify-center h-40 text-sm text-neutral-500 italic">
          No recent activity to display.
        </div>
      </div>
    </div>
  );
}
