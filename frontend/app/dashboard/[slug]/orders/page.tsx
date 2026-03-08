import { requireDashboardRole } from "@/app/dashboard/role-guard";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import OrdersManager, { Order } from "./orders-manager";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function OrdersPage({ params }: Props) {
    const { slug } = await params;
    const { restaurantId, role } = await requireDashboardRole(["owner", "manager", "cashier"], slug);

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

    return <OrdersManager restaurantId={restaurantId} slug={slug} userRole={role} initialOrders={(orders as unknown as Order[]) || []} />;
}
