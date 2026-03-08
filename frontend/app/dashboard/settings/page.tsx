import { requireDashboardRole } from "../role-guard";
import SettingsManager from "./settings-manager";

export default async function SettingsPage() {
    // Reuse the proven membership join pattern from role-guard
    const { restaurant } = await requireDashboardRole(["owner"]);

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
