import { requireDashboardRole } from "@/app/dashboard/role-guard";
import SettingsManager from "./settings-manager";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function SettingsPage({ params }: Props) {
    const { slug } = await params;
    // Reuse the proven membership join pattern from role-guard
    const { restaurant } = await requireDashboardRole(["owner"], slug);

    if (!restaurant) {
        return <div>Restaurant not found</div>;
    }

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
                <p className="text-neutral-500">Manage restaurant profile, domain, and menu publishing.</p>
            </div>

            <SettingsManager restaurant={restaurant as any} />
        </div>
    );
}
