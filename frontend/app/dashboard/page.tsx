import React from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ActiveOrdersView from "./active-orders-view";

type Restaurant = {
  id: string;
  name: string;
  slug: string;
};

type MembershipRow = {
  role: string | null;
  restaurant_id: string | null;
  restaurants: Restaurant | null;
};

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: membership } = await supabase
    .from("restaurant_users")
    .select("role, restaurant_id, restaurants(id,name,slug)")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle<MembershipRow>();

  if (!membership?.restaurant_id) redirect("/dashboard/onboarding");

  const restaurant = membership.restaurants;

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <h2 style={{ margin: 0 }}>Cashier Dashboard</h2>

      <div style={{ padding: "1rem", border: "1px solid #eaeaea", borderRadius: 8 }}>
        <div>
          <b>User:</b> {user.email ?? ""}
        </div>
        <div>
          <b>Role:</b> {membership.role ?? "member"}
        </div>
        <div>
          <b>Restaurant:</b>{" "}
          {restaurant ? `${restaurant.name} (@${restaurant.slug})` : membership.restaurant_id}
        </div>
      </div>

      <ActiveOrdersView restaurantId={membership.restaurant_id} />
    </div>
  );
}