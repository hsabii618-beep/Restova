"use client";

import { useState } from "react";
import { History as HistoryIcon, Search, Package, Calendar } from "lucide-react";

export type HistoryOrder = any; // Reusing structure from Orders

type Props = {
    initialOrders: HistoryOrder[];
};

export default function HistoryManager({ initialOrders }: Props) {
    const [searchQuery, setSearchQuery] = useState("");

    const filteredOrders = initialOrders.filter(order =>
        order.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (order.id && order.id.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (order.display_number && order.display_number.toString().includes(searchQuery))
    );

    return (
        <div className="flex flex-col gap-6 max-w-5xl">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Order History</h2>
                <p className="text-neutral-500">View and search past completed or cancelled orders.</p>
            </div>

            <div className="relative max-w-md">
                <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                    type="text"
                    placeholder="Search by customer or order #..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    maxLength={50}
                    className="w-full pl-10 pr-4 py-2 bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-neutral-400"
                />
            </div>

            <div className="p-0 border border-neutral-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-black overflow-hidden">
                <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
                    <h3 className="font-semibold text-sm">Past Records</h3>
                </div>

                {filteredOrders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-sm text-neutral-500 italic">
                        <HistoryIcon className="w-8 h-8 mb-2 opacity-30" />
                        No historical orders found.
                    </div>
                ) : (
                    <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
                        {filteredOrders.map(order => {
                            const orderTotal = order.order_items.reduce((acc: number, item: any) => acc + (Number(item.unit_price) * item.qty), 0);
                            const isCancelled = order.status === "cancelled";

                            return (
                                <div key={order.id} className="p-6 flex flex-col md:flex-row gap-4 justify-between hover:bg-neutral-50 dark:hover:bg-neutral-900/30 transition-colors">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2 font-bold text-lg">
                                            #{order.display_number || order.id.slice(0, 4).toUpperCase()}
                                            <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded tracking-wide ${isCancelled ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}`}>
                                                {order.status}
                                            </span>
                                        </div>
                                        <div className="text-sm font-medium text-neutral-800 dark:text-neutral-200">{order.customer_name}</div>
                                        <div className="text-xs text-neutral-500 mt-1 flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {new Date(order.created_at).toLocaleString()}
                                        </div>
                                        <div className="text-xs text-neutral-500 mt-2 space-y-1">
                                            {order.order_items.map((oi: any, i: number) => (
                                                <div key={oi.id || i}>
                                                    {oi.qty}x {oi.menu_items?.name || "Unknown Item"}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between md:flex-col md:items-end md:justify-center border-t md:border-t-0 border-neutral-100 dark:border-neutral-900 pt-4 md:pt-0">
                                        <div className="text-xl font-bold">${orderTotal.toFixed(2)}</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
