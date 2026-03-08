import { requireDashboardRole } from "@/app/dashboard/role-guard";
import { BarChart3, TrendingUp, DollarSign } from "lucide-react";

export default async function AnalyticsPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    await requireDashboardRole(["owner"], slug);

    return (
        <div className="flex flex-col gap-6 max-w-5xl">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Analytics</h2>
                <p className="text-neutral-500">Insights and performance metrics for your restaurant.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: "Gross Revenue", value: "$0.00", icon: DollarSign },
                    { label: "Orders", value: "0", icon: BarChart3 },
                    { label: "Avg. Order Value", value: "$0.00", icon: TrendingUp },
                    { label: "Completion Time", value: "0m", icon: BarChart3 },
                ].map((stat, i) => {
                    const Icon = stat.icon;
                    return (
                        <div key={i} className="p-6 border border-neutral-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-black relative overflow-hidden">
                            <Icon className="w-16 h-16 absolute -bottom-4 -right-4 text-neutral-100 dark:text-neutral-900 opacity-50" />
                            <h3 className="text-sm font-medium text-neutral-500 mb-1">{stat.label}</h3>
                            <div className="text-2xl font-bold text-neutral-800 dark:text-neutral-200">{stat.value}</div>
                        </div>
                    )
                })}
            </div>

            <div className="p-6 border border-neutral-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-black min-h-[350px]">
                <h3 className="font-semibold mb-4">Revenue Trends</h3>
                <div className="flex flex-col items-center justify-center h-48 text-sm text-neutral-500 italic mt-4 border-t border-dashed border-neutral-200 dark:border-neutral-800">
                    Not enough data yet to display trends.
                </div>
            </div>
        </div>
    );
}
