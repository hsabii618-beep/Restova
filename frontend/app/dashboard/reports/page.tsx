import { requireDashboardRole } from "../role-guard";
import { FileText, Download } from "lucide-react";

export default async function ReportsPage() {
    await requireDashboardRole(["manager"]);

    return (
        <div className="flex flex-col gap-6 max-w-5xl">
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Reports</h2>
                    <p className="text-neutral-500">Day-end summaries and operational reports.</p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-neutral-900 dark:bg-neutral-50 text-neutral-50 dark:text-neutral-900 rounded-full text-sm font-medium hover:scale-105 transition-transform opacity-50 cursor-not-allowed">
                    <Download className="w-4 h-4" /> Export CSV
                </button>
            </div>

            <div className="p-6 border border-neutral-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-black min-h-[400px]">
                <h3 className="font-semibold mb-4">Recent Reports</h3>
                <div className="flex flex-col items-center justify-center h-64 text-sm text-neutral-500 italic mt-4 border-t border-dashed border-neutral-200 dark:border-neutral-800">
                    <FileText className="w-8 h-8 mb-2 opacity-50" />
                    No generated reports available.
                </div>
            </div>
        </div>
    );
}
