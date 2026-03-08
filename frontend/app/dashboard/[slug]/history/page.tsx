import { requireDashboardRole } from "@/app/dashboard/role-guard";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import HistoryManager from "./history-manager";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function HistoryPage({ params }: Props) {
    const { slug } = await params;
    const { restaurantId } = await requireDashboardRole(["owner", "manager", "cashier"], slug);
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
