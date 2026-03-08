import { requireDashboardRole } from "@/app/dashboard/role-guard";
import MenuManager from "./menu-manager";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function MenuPage({ params }: Props) {
    const { slug } = await params;
    const { restaurantId } = await requireDashboardRole(["owner", "manager"], slug);

    return (
        <MenuManager restaurantId={restaurantId} />
    );
}
