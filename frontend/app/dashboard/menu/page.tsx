import { requireDashboardRole } from "../role-guard";
import MenuManager from "./menu-manager";

export default async function MenuPage() {
    const { restaurantId } = await requireDashboardRole(["owner", "manager"]);

    return (
        <MenuManager restaurantId={restaurantId} />
    );
}
