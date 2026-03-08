"use client";

import { useState } from "react";
import { Clock, CheckCircle, Check, ShoppingCart } from "lucide-react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type OrderItem = {
    id: string;
    qty: number;
    unit_price: number;
    notes: string | null;
    menu_items: { name: string } | null;
};

export type Order = {
    id: string;
    display_number: number;
    customer_name: string;
    type: "dine_in" | "takeaway" | "delivery";
    status: "new" | "preparing" | "ready" | "completed" | "cancelled" | string;
    created_at: string;
    order_items: OrderItem[];
};

type Props = {
    restaurantId: string;
    slug: string;
    userRole: string; // 'owner', 'manager', 'cashier'
    initialOrders: Order[];
};

export default function OrdersManager({ restaurantId, slug, initialOrders }: Omit<Props, 'userRole'>) {
    const router = useRouter();
    const [orders, setOrders] = useState<Order[]>(initialOrders);
    const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});

    const activeOrders = orders.filter(o => !["completed", "cancelled"].includes(o.status));

    const draftOrders = activeOrders.filter(o => o.status === "new");
    const confirmedOrders = activeOrders.filter(o => o.status === "paid");

    const draftCount = draftOrders.length;
    const confirmedCount = confirmedOrders.length;

    async function updateStatus(orderId: string, newStatus: string) {
        setLoadingMap(prev => ({ ...prev, [orderId]: true }));
        try {
            const supabase = createSupabaseBrowserClient();
            const { error } = await supabase
                .from("orders")
                .update({ status: newStatus })
                .eq("id", orderId)
                .eq("restaurant_id", restaurantId);

            if (!error) {
                // Update local state smoothly
                setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
                router.refresh();
            }
        } catch {
            console.error("Failed to update status");
        }
        setLoadingMap(prev => ({ ...prev, [orderId]: false }));
    }

    // Handlers mapped from typical flow: new(draft) -> paid(confirmed) -> preparing -> ready -> completed
    const StatusActions = ({ order }: { order: Order }) => {
        const isLoading = loadingMap[order.id];

        if (order.status === "new") {
            return (
                <button
                    disabled={isLoading}
                    onClick={() => router.push(`/dashboard/${slug}/new-order?edit=${order.id}`)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors bg-purple-100 text-purple-800 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:hover:bg-purple-900/50"
                >
                    <ShoppingCart className="w-3 h-3" /> Edit in POS
                </button>
            );
        }

        if (order.status === "paid") {
            return (
                <button
                    disabled={isLoading}
                    onClick={() => updateStatus(order.id, "completed")}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50"
                >
                    <Check className="w-3 h-3" /> {isLoading ? "..." : "Mark Competed"}
                </button>
            );
        }

        return null;
    };

    return (
        <div className="flex flex-col gap-6 max-w-5xl">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Orders</h2>
                <p className="text-neutral-500">Manage and track all restaurant orders.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-6 border border-neutral-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-black">
                    <h3 className="text-sm font-medium text-neutral-500 mb-1 flex items-center gap-2"><Clock className="w-4 h-4" /> New Orders</h3>
                    <div className="text-2xl font-bold text-neutral-800 dark:text-neutral-200">{draftCount}</div>
                </div>
                <div className="p-6 border border-neutral-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-black border-l-green-500 md:border-l-4">
                    <h3 className="text-sm font-medium text-neutral-500 mb-1 flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Confirmed / Paid</h3>
                    <div className="text-2xl font-bold text-neutral-800 dark:text-neutral-200">{confirmedCount}</div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                {/* NEW ORDERS */}
                <div className="p-0 border border-neutral-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-black overflow-hidden relative">
                    <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
                        <h3 className="font-semibold text-sm uppercase tracking-wider text-neutral-500">New Orders (Drafts)</h3>
                    </div>
                    {draftOrders.length === 0 ? (
                        <div className="py-12 text-center text-sm text-neutral-400 italic">No new drafts.</div>
                    ) : (
                        <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
                            {draftOrders.map(order => <OrderCard key={order.id} order={order} />)}
                        </div>
                    )}
                </div>

                {/* CONFIRMED ORDERS */}
                <div className="p-0 border border-neutral-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-black overflow-hidden relative">
                    <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
                        <h3 className="font-semibold text-sm uppercase tracking-wider text-green-600">Confirmed Orders</h3>
                    </div>
                    {confirmedOrders.length === 0 ? (
                        <div className="py-12 text-center text-sm text-neutral-400 italic">No orders in kitchen.</div>
                    ) : (
                        <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
                            {confirmedOrders.map(order => <OrderCard key={order.id} order={order} />)}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    function OrderCard({ order }: { order: Order }) {
        const orderTotal = order.order_items.reduce((acc, item) => acc + (Number(item.unit_price) * item.qty), 0);
        return (
            <div className="p-6 flex flex-col hover:bg-neutral-50 dark:hover:bg-neutral-900/30 transition-colors">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 font-bold text-lg leading-none">
                            #{order.display_number || order.id.slice(0, 4).toUpperCase()}
                            <span className="text-[10px] uppercase bg-neutral-100 dark:bg-neutral-800 text-neutral-500 px-1.5 py-0.5 rounded tracking-wide">{order.type.replace('_', ' ')}</span>
                        </div>
                        <div className="text-sm font-medium text-neutral-800 dark:text-neutral-200 mt-1">{order.customer_name}</div>
                    </div>
                    <div className="text-lg font-bold">${orderTotal.toFixed(2)}</div>
                </div>

                <div className="text-xs text-neutral-500 space-y-1 mb-4">
                    {order.order_items.map((oi, i) => (
                        <div key={oi.id || i}>
                            {oi.qty}x {oi.menu_items?.name || "Unknown Item"}
                        </div>
                    ))}
                </div>

                <div className="flex justify-end pt-4 border-t border-neutral-50 dark:border-neutral-900">
                    <StatusActions order={order} />
                </div>
            </div>
        );
    }
}
