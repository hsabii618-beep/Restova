import React from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ActiveOrdersView from "./active-orders-view";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?next=/dashboard");
  }

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id, name, slug")
    .eq("owner_id", user.id)
    .is("deleted_at", null)
    .eq("is_active", true)
    .maybeSingle();

  if (!restaurant) {
    redirect("/dashboard/onboarding");
  }

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <header style={{ paddingBottom: "1rem", borderBottom: "1px solid #eaeaea" }}>
        <h2 style={{ margin: 0 }}>Cashier Dashboard</h2>
        <div style={{ fontSize: "0.9rem", color: "#666" }}>
          <b>User:</b> {user.email} | <b>Restaurant:</b> {restaurant.name} (@{restaurant.slug})
        </div>
      </header>

      <ActiveOrdersView restaurantId={restaurant.id} />
    </div>
  );
}
