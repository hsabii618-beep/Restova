import { requireDashboardRole } from "../role-guard";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import OrdersManager, { Order } from "./orders-manager";

export default async function OrdersPage() {
    const { restaurantId, role } = await requireDashboardRole(["owner", "manager", "cashier"]);

    const supabase = await createSupabaseServerClient();

    // Fetch orders alongside their individual items and item meta-names via foreign key
    const { data: orders } = await supabase
        .from("orders")
        .select(`
            *,
            order_items (
                id,
                qty,
                unit_price,
                notes,
                menu_items (
                    name
                )
            )
        `)
        .eq("restaurant_id", restaurantId)
        .order("created_at", { ascending: false });

    return <OrdersManager restaurantId={restaurantId} userRole={role} initialOrders={(orders as unknown as Order[]) || []} />;
}
