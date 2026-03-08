"use client";

import { useState, useMemo } from "react";
import { PlusCircle, Search, ShoppingCart, Minus, Plus, X, Check, CreditCard, Banknote, Printer } from "lucide-react";
import { useRouter } from "next/navigation";

export type Category = { id: string; name: string; position: number; is_active: boolean };
export type MenuItem = { id: string; category_id: string; name: string; price: number; is_available: boolean; image_path: string | null };

type InitialOrder = {
    id: string;
    customer_name: string;
    type: "dine_in" | "takeaway" | "delivery";
    status: string;
    order_items: {
        id: string;
        qty: number;
        unit_price: number;
        notes: string | null;
        menu_items: { id: string; name: string; price: number; category_id: string; image_path: string | null; is_available: boolean; }
    }[];
};

type CartItem = {
    id: string;
    menuItem: MenuItem;
    qty: number;
    notes?: string;
};

type Props = {
    restaurantId: string;
    slug: string;
    categories: Category[];
    menuItems: MenuItem[];
    initialOrder?: InitialOrder;
};

export default function PosManager({ restaurantId, slug, categories, menuItems, initialOrder }: Props) {
    const router = useRouter();

    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

    // Initialize state from existing order if present
    const [cart, setCart] = useState<CartItem[]>(() => {
        if (!initialOrder) return [];
        return initialOrder.order_items.map(item => ({
            id: crypto.randomUUID(), // Local ID for map
            menuItem: { ...item.menu_items, price: item.unit_price }, // Hydrate price
            qty: item.qty,
            notes: item.notes || ""
        }));
    });

    // Order metadata
    const [customerName, setCustomerName] = useState(initialOrder?.customer_name || "");
    const [orderType, setOrderType] = useState<"dine_in" | "takeaway" | "delivery">(initialOrder?.type || "dine_in");

    // Payment State
    const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | null>(null);
    const [cashModalOpen, setCashModalOpen] = useState(false);
    const [receivedAmount, setReceivedAmount] = useState<string>("");
    const [isPaymentDetailsConfirmed, setIsPaymentDetailsConfirmed] = useState(false);

    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [successMsg, setSuccessMsg] = useState("");

    // Lock interactions if the order is no longer merely a draft
    const isLocked = initialOrder ? initialOrder.status !== "new" : false;

    // Filter items based on active category and search
    const filteredItems = useMemo(() => {
        return menuItems.filter(item => {
            const matchesCategory = selectedCategoryId ? item.category_id === selectedCategoryId : true;
            const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesCategory && matchesSearch;
        });
    }, [menuItems, selectedCategoryId, searchQuery]);

    const cartTotal = cart.reduce((acc, item) => acc + (item.menuItem.price * item.qty), 0);
    const changeAmount = useMemo(() => {
        const received = parseFloat(receivedAmount || "0");
        return received > cartTotal ? received - cartTotal : 0;
    }, [receivedAmount, cartTotal]);

    const isAmountSufficient = paymentMethod === "cash" ? parseFloat(receivedAmount || "0") >= cartTotal : true;

    function addToCart(item: MenuItem) {
        if (isLocked) return;
        setCart(prev => {
            const existing = prev.find(c => c.menuItem.id === item.id);
            if (existing) {
                return prev.map(c => c.menuItem.id === item.id ? { ...c, qty: c.qty + 1 } : c);
            }
            return [...prev, { id: crypto.randomUUID(), menuItem: item, qty: 1 }];
        });
    }

    function updateQty(cartId: string, delta: number) {
        if (isLocked) return;
        setCart(prev => {
            return prev.map(c => {
                if (c.id === cartId) {
                    const newQty = Math.max(1, c.qty + delta);
                    return { ...c, qty: newQty };
                }
                return c;
            });
        });
    }

    function removeCartItem(cartId: string) {
        if (isLocked) return;
        setCart(prev => prev.filter(c => c.id !== cartId));
    }

    async function handleSaveDraft() {
        await submitPayload("new");
    }

    async function handleStartConfirm() {
        await submitPayload("paid");
    }

    async function handleModalConfirm() {
        if (!isAmountSufficient) return;
        setIsPaymentDetailsConfirmed(true);
        setCashModalOpen(false);
    }

    function resetPaymentDetails() {
        setPaymentMethod(null);
        setReceivedAmount("");
        setIsPaymentDetailsConfirmed(false);
    }

    // A unified submit function for both draft and confirmation flows
    async function submitPayload(targetStatus: "new" | "paid" | "cancelled") {
        if (cart.length === 0) return;

        setErrorMsg("");
        setSuccessMsg("");
        setLoading(true);

        const itemsPayload = cart.map(c => ({
            item_id: c.menuItem.id,
            qty: c.qty,
            unit_price: c.menuItem.price,
            notes: c.notes
        }));

        // In a strictly RESTful workflow, if we have an initialOrder, we should PUT, not POST.
        // Let's use PUT if initialOrder exists, else POST.
        const endpoint = initialOrder ? `/api/restaurants/${restaurantId}/orders/${initialOrder.id}` : `/api/restaurants/${restaurantId}/orders`;
        const method = initialOrder ? "PUT" : "POST";

        try {
            const res = await fetch(endpoint, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    customerName: customerName.trim() || undefined,
                    type: orderType,
                    status: targetStatus,
                    items: itemsPayload,
                    payment: targetStatus === "paid" ? {
                        method: paymentMethod,
                        receivedAmount: paymentMethod === "cash" ? parseFloat(receivedAmount) : cartTotal
                    } : undefined
                })
            });

            const data = await res.json();

            if (!res.ok) {
                setErrorMsg(data.error || "Failed to process order.");
                setLoading(false);
                return;
            }

            setSuccessMsg(`Order ${targetStatus === "paid" ? "confirmed" : "saved"} successfully!`);

            // Redirect cleanly back to dashboard orders lists. (Or refresh if editing)
            setTimeout(() => {
                router.push(`/dashboard/${slug}/orders`);
                router.refresh();
            }, 1000);

        } catch {
            setErrorMsg("Network error occurred.");
            setLoading(false);
        }
    }

    function handleCancel() {
        if (initialOrder) {
            // Already in DB, submit a cancel status
            if (window.confirm("Are you sure you want to cancel this order? It will remain in history.")) {
                submitPayload("cancelled");
            }
        } else {
            // Not in DB yet, just reset state safely.
            if (window.confirm("Clear current ticket entirely?")) {
                setCart([]);
                setCustomerName("");
                setPaymentMethod(null);
                setReceivedAmount("");
                setIsPaymentDetailsConfirmed(false);
            }
        }
    }

    function hookThermalPrint() {
        // Real-world: This interacts with a raw thermal printer bridge via WebUSB / websocket proxy.
        alert("Thermal Print Hook Triggered! Connecting to ESC/POS printer...");
    }

    return (
        <div className="flex flex-col gap-6 max-w-7xl h-full pb-10 relative">
            <div className="flex justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">{initialOrder ? `Order #${initialOrder.id.slice(0, 4).toUpperCase()}` : "New Order"}</h2>
                    <p className="text-neutral-500">Ring up {initialOrder ? "an existing" : "a new"} customer order.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-[600px] items-start">

                {/* Menu Selection Side */}
                <div className={`lg:col-span-2 p-6 border border-neutral-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-black flex flex-col gap-6 sticky top-6 transition-opacity ${isLocked ? 'opacity-50 pointer-events-none' : ''}`}>

                    {/* Filters */}
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                            <input
                                type="text"
                                placeholder="Search menu items..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                maxLength={50}
                                className="w-full pl-10 pr-4 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-neutral-400"
                            />
                        </div>
                        <div className="flex overflow-x-auto gap-2 pb-2 md:pb-0 scrollbar-hide">
                            <button
                                onClick={() => setSelectedCategoryId(null)}
                                className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors ${selectedCategoryId === null ? 'bg-neutral-900 dark:bg-neutral-50 text-neutral-50 dark:text-neutral-900' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'}`}
                            >
                                All Items
                            </button>
                            {categories.map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => setSelectedCategoryId(cat.id)}
                                    className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors ${selectedCategoryId === cat.id ? 'bg-neutral-900 dark:bg-neutral-50 text-neutral-50 dark:text-neutral-900' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'}`}
                                >
                                    {cat.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Menu Items Grid */}
                    {filteredItems.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl py-24 text-neutral-500 italic text-sm">
                            No menu items found.
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto pr-2 max-h-[60vh] custom-scrollbar">
                            {filteredItems.map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => addToCart(item)}
                                    className="p-4 flex flex-col text-left border border-neutral-200 dark:border-neutral-800 rounded-xl bg-neutral-50 dark:bg-neutral-900/50 hover:border-neutral-300 dark:hover:border-neutral-700 hover:shadow-md transition-all active:scale-[0.98]"
                                >
                                    <div className="font-semibold text-sm mb-1 line-clamp-2">{item.name}</div>
                                    <div className="text-sm font-medium text-neutral-500 mt-auto">${Number(item.price).toFixed(2)}</div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Cart Side */}
                <div className="lg:col-span-1 border border-neutral-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-black flex flex-col sticky top-6 shadow-sm max-h-[88vh]">

                    <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 rounded-t-xl shrink-0">
                        <h3 className="font-semibold flex items-center justify-between">
                            <span className="flex items-center gap-2"><ShoppingCart className="w-5 h-5" /> Current Ticket</span>
                            {cart.length > 0 && <span className="bg-neutral-900 dark:bg-neutral-50 text-neutral-50 dark:text-neutral-900 px-2 py-0.5 rounded-full text-xs">{cart.length}</span>}
                        </h3>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                        {cart.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-sm text-neutral-500 italic opacity-60 min-h-[200px]">
                                <PlusCircle className="w-8 h-8 mb-3" />
                                <div>Ticket is empty</div>
                                <div className="text-xs mt-1">Select items to begin</div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {cart.map(c => (
                                    <div key={c.id} className="flex gap-3 justify-between group">
                                        <div className="flex flex-col flex-1">
                                            <div className="font-medium text-sm text-neutral-800 dark:text-neutral-200 leading-tight">{c.menuItem.name}</div>
                                            <div className="text-xs text-neutral-500">${Number(c.menuItem.price).toFixed(2)}</div>
                                        </div>
                                        <div className={`flex items-center gap-2 shrink-0 bg-neutral-100 dark:bg-neutral-900 rounded-lg p-1 border border-neutral-200 dark:border-neutral-800 ${isLocked ? 'opacity-50' : ''}`}>
                                            <button disabled={isLocked} onClick={() => updateQty(c.id, -1)} className="p-1 hover:bg-white dark:hover:bg-black rounded-md transition-colors"><Minus className="w-3 h-3 text-neutral-600 dark:text-neutral-400" /></button>
                                            <span className="text-xs font-semibold w-4 text-center">{c.qty}</span>
                                            <button disabled={isLocked} onClick={() => updateQty(c.id, 1)} className="p-1 hover:bg-white dark:hover:bg-black rounded-md transition-colors"><Plus className="w-3 h-3 text-neutral-600 dark:text-neutral-400" /></button>
                                        </div>
                                        <div className="flex flex-col items-end justify-between ml-2">
                                            <span className="font-semibold text-sm">${(c.menuItem.price * c.qty).toFixed(2)}</span>
                                            {!isLocked && (
                                                <button onClick={() => removeCartItem(c.id)} className="text-red-500/0 group-hover:text-red-500 transition-colors mt-auto text-[10px] uppercase font-bold flex items-center gap-0.5"><X className="w-3 h-3" /> Remove</button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="border-t border-neutral-200 dark:border-neutral-800 p-6 bg-neutral-50 dark:bg-neutral-900/30 rounded-b-xl shrink-0">
                        {errorMsg && <div className="mb-4 text-xs font-medium text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded border border-red-200 dark:border-red-800">{errorMsg}</div>}
                        {successMsg && <div className="mb-4 text-xs font-medium text-green-600 bg-green-50 dark:bg-green-900/20 p-3 rounded border border-green-200 dark:border-green-800">{successMsg}</div>}

                        <div className="space-y-4 mb-4">
                            <div>
                                <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1 block">Customer Name</label>
                                <input disabled={isLocked} type="text" value={customerName} maxLength={50} onChange={e => setCustomerName(e.target.value)} placeholder="Walk-in Customer" className="w-full px-3 py-2 bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-neutral-400 disabled:opacity-50" />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1 block">Type</label>
                                <div className="flex gap-2">
                                    {['dine_in', 'takeaway', 'delivery'].map((t) => (
                                        <button
                                            key={t}
                                            disabled={isLocked}
                                            onClick={() => setOrderType(t as "dine_in" | "takeaway" | "delivery")}
                                            className={`flex-1 py-1.5 text-xs font-semibold rounded-md border transition-colors disabled:opacity-50 ${orderType === t ? 'border-neutral-900 bg-neutral-900 text-white dark:bg-neutral-50 dark:text-neutral-900' : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 bg-white dark:bg-black'}`}
                                        >
                                            {t.replace('_', ' ').charAt(0).toUpperCase() + t.replace('_', ' ').slice(1)}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {!isLocked && (
                                <div className="pt-2">
                                    <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1 block">Payment Method <span className="text-red-500">*</span></label>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => {
                                                setPaymentMethod("cash");
                                                setCashModalOpen(true);
                                            }}
                                            className={`flex-1 flex flex-col justify-center items-center gap-1 py-2 text-xs font-semibold rounded-md border transition-colors ${paymentMethod === 'cash' ? 'border-green-600 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 bg-white dark:bg-black hover:bg-neutral-50 dark:hover:bg-neutral-900'}`}
                                        >
                                            <div className="flex items-center gap-2"><Banknote className="w-4 h-4" /> Cash</div>
                                            {isPaymentDetailsConfirmed && paymentMethod === "cash" && <div className="text-[10px] text-green-600 font-bold uppercase tracking-tight">Confirmed</div>}
                                        </button>
                                        <button
                                            onClick={() => {
                                                setPaymentMethod("card");
                                                setIsPaymentDetailsConfirmed(true);
                                            }}
                                            className={`flex-1 flex flex-col justify-center items-center gap-1 py-2 text-xs font-semibold rounded-md border transition-colors ${paymentMethod === 'card' ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 bg-white dark:bg-black hover:bg-neutral-50 dark:hover:bg-neutral-900'}`}
                                        >
                                            <div className="flex items-center gap-2"><CreditCard className="w-4 h-4" /> Card (TPE)</div>
                                            {isPaymentDetailsConfirmed && paymentMethod === "card" && <div className="text-[10px] text-blue-600 font-bold uppercase tracking-tight">Selected</div>}
                                        </button>
                                    </div>
                                    {isPaymentDetailsConfirmed && (
                                        <button onClick={resetPaymentDetails} className="mt-2 text-[10px] font-bold text-neutral-400 uppercase hover:text-neutral-600 dark:hover:text-neutral-300">Change Payment Method</button>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="flex justify-between text-lg font-bold mb-4 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                            <span>Total</span>
                            <span>${cartTotal.toFixed(2)}</span>
                        </div>

                        {isLocked ? (
                            <div className="flex flex-col gap-2">
                                <div className="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 w-full py-2 rounded-xl text-center text-sm font-bold uppercase tracking-widest flex justify-center items-center gap-2 mb-2 border border-green-200 dark:border-green-800">
                                    <Check className="w-4 h-4" /> Order Confirmed
                                </div>
                                <button onClick={() => window.print()} className="w-full flex items-center justify-center gap-2 py-2.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 rounded-xl text-sm font-bold hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors">
                                    <Printer className="w-4 h-4" /> Print PDF Receipt
                                </button>
                                <button onClick={hookThermalPrint} className="w-full flex items-center justify-center gap-2 py-2.5 border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 rounded-xl text-sm font-medium hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
                                    Send to Thermal Printer
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2">
                                <button
                                    disabled={cart.length === 0 || loading || !isPaymentDetailsConfirmed}
                                    onClick={handleStartConfirm}
                                    className="w-full flex items-center justify-center gap-2 py-3 bg-neutral-900 dark:bg-neutral-50 text-neutral-50 dark:text-neutral-900 rounded-xl text-sm font-bold opacity-100 disabled:opacity-30 disabled:cursor-not-allowed hover:scale-[1.02] transition-transform active:scale-[0.98]"
                                >
                                    {loading ? "Processing..." : <><Check className="w-4 h-4" /> Confirm Order</>}
                                </button>

                                <div className="flex gap-2">
                                    <button
                                        disabled={loading || cart.length === 0}
                                        onClick={handleSaveDraft}
                                        className="flex-1 py-2.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-xl text-sm font-medium hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors disabled:opacity-50"
                                    >
                                        Save Draft
                                    </button>
                                    <button
                                        disabled={loading}
                                        onClick={handleCancel}
                                        className="flex-1 py-2.5 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 bg-red-50/50 dark:bg-red-900/10 rounded-xl text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                                    >
                                        Cancel Order
                                    </button>
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </div>

            {/* Cash Payment Modal Overlay */}
            {cashModalOpen && (
                <div className="fixed inset-0 z-50 bg-neutral-900/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-8 rounded-2xl max-w-sm w-full shadow-2xl flex flex-col gap-6">
                        <div className="text-center">
                            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-3">
                                <Banknote className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold">Cash Payment</h3>
                            <p className="text-sm text-neutral-500">Calculate change and finalize order.</p>
                        </div>

                        <div className="space-y-4 bg-neutral-50 dark:bg-neutral-950 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800">
                            <div className="flex justify-between font-medium">
                                <span className="text-neutral-500">Order Total</span>
                                <span className="text-lg">${cartTotal.toFixed(2)}</span>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-neutral-500 uppercase tracking-wide block mb-1">Amount Received</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-neutral-400">$</span>
                                    <input
                                        type="number"
                                        min={0}
                                        step="0.01"
                                        autoFocus
                                        value={receivedAmount}
                                        maxLength={10}
                                        onChange={e => setReceivedAmount(e.target.value.slice(0, 10))}
                                        className="w-full pl-7 pr-3 py-3 text-lg font-bold bg-white dark:bg-black border border-neutral-300 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-between items-center pt-2 border-t border-neutral-200 dark:border-neutral-800 mt-2">
                                <span className="text-sm font-semibold text-neutral-500">Change Due</span>
                                <span className={`text-xl font-black ${isAmountSufficient ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                                    ${changeAmount.toFixed(2)}
                                </span>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button onClick={() => {
                                setCashModalOpen(false);
                                if (!isPaymentDetailsConfirmed) setPaymentMethod(null);
                            }} className="flex-1 py-3 text-sm font-medium border border-neutral-200 dark:border-neutral-800 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">Cancel</button>
                            <button
                                onClick={handleModalConfirm}
                                disabled={!isAmountSufficient || loading}
                                className="flex-1 py-3 text-sm font-bold bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {loading ? "..." : <><Check className="w-4 h-4" /> Confirm Payment</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
