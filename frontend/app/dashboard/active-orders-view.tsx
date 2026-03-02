"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createBrowserClient } from "@supabase/ssr";

type Order = {
  id: string;
  customer_name: string | null;
  status: string;
  created_at: string;
};

type Props = {
  restaurantId: string;
};

export default function ActiveOrdersView({ restaurantId }: Props) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = useMemo(() => {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }, []);

  const fetchOrders = useCallback(async () => {
    const { data } = await supabase
      .from("orders")
      .select("id, customer_name, status, created_at")
      .eq("restaurant_id", restaurantId)
      .in("status", ["pending", "in_progress"])
      .order("created_at", { ascending: false })
      .limit(20);

    if (data) {
      setOrders(data);
    }
    setLoading(false);
  }, [supabase, restaurantId]);

  useEffect(() => {
    fetchOrders();

    const channel = supabase
      .channel(`active-orders-${restaurantId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchOrders, supabase, restaurantId]);

  if (loading) {
    return <div>Loading orders...</div>;
  }

  return (
    <div style={{ display: "grid", gap: "0.75rem" }}>
      <h3 style={{ margin: 0 }}>Active Orders</h3>
      {orders.length === 0 ? (
        <div>No active orders</div>
      ) : (
        <ul style={{ paddingLeft: "1.25rem" }}>
          {orders.map((order) => (
            <li key={order.id}>
              <b>#{order.id.slice(0, 8)}</b>: {order.customer_name || "Guest"} - {order.status} (
              {new Date(order.created_at).toLocaleTimeString()})
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
