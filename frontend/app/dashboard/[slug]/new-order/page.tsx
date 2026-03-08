import { requireDashboardRole } from "@/app/dashboard/role-guard";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import PosManager from "./pos-manager";

type PageProps = {
    params: Promise<{ slug: string }>;
    searchParams: Promise<{ edit?: string }>;
};

export default async function NewOrderPage({ params, searchParams }: PageProps) {
    const { slug } = await params;
    const { restaurantId } = await requireDashboardRole(["owner", "manager", "cashier"], slug);
    const { edit: editOrderId } = await searchParams;

    const supabase = await createSupabaseServerClient();

    // Fetch categories and items concurrently based strictly on availability
    const [categoriesRes, menuItemsRes, existingOrderRes] = await Promise.all([
        supabase.from("categories").select("*").eq("restaurant_id", restaurantId).eq("is_active", true).order("position"),
        supabase.from("menu_items").select("*").eq("restaurant_id", restaurantId).eq("is_available", true),
        editOrderId ? supabase.from("orders").select(`
            *,
            order_items(id, qty, unit_price, notes, menu_items(id, name, price, category_id, image_path, is_available))
        `).eq("id", editOrderId).eq("restaurant_id", restaurantId).single() : Promise.resolve({ data: null })
    ]);

    return (
        <PosManager
            restaurantId={restaurantId}
            slug={slug}
            categories={categoriesRes.data || []}
            menuItems={menuItemsRes.data || []}
            initialOrder={existingOrderRes.data || undefined}
        />
    );
}
