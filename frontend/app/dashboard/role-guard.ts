import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function requireDashboardRole(allowedRoles: string[]) {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login?next=/dashboard");
    }

    const { data: memberData } = await supabase
        .from("restaurant_users")
        .select(`
            role, 
            restaurant_id,
            restaurants (*)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    const role = memberData?.role;

    if (!role || !allowedRoles.includes(role)) {
        redirect("/dashboard");
    }

    return {
        user,
        role,
        restaurantId: memberData.restaurant_id,
        restaurant: Array.isArray(memberData.restaurants) ? memberData.restaurants[0] : memberData.restaurants
    };
}
