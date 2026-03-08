import { requireDashboardRole } from "../role-guard";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import HistoryManager from "./history-manager";

export default async function HistoryPage() {
    const { restaurantId } = await requireDashboardRole(["owner", "manager", "cashier"]);
    const supabase = await createSupabaseServerClient();

    // Fetch historical orders (completed or cancelled)
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
        .in("status", ["completed", "cancelled"])
        .order("created_at", { ascending: false });

    return <HistoryManager initialOrders={orders || []} />;
}
