"use client";

import { useEffect, useState, useMemo } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { Plus, UtensilsCrossed, Edit2, Save, X, Trash2 } from "lucide-react";

type Category = {
    id: string;
    name: string;
    position: number;
    is_active: boolean;
};

type MenuItem = {
    id: string;
    category_id: string;
    name: string;
    description: string;
    price: number;
    is_available: boolean;
};

export default function MenuManager({ restaurantId }: { restaurantId: string }) {
    const supabase = useMemo(() => {
        return createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
    }, []);

    const [categories, setCategories] = useState<Category[]>([]);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(true);

    // Forms State
    const [editingCategory, setEditingCategory] = useState<Partial<Category> | null>(null);
    const [categoryFormOpen, setCategoryFormOpen] = useState(false);
    const [catNameInput, setCatNameInput] = useState("");

    const [editingItem, setEditingItem] = useState<Partial<MenuItem> | null>(null);
    const [itemFormOpen, setItemFormOpen] = useState(false);
    const [itemInput, setItemInput] = useState({ name: "", description: "", price: "", category_id: "" });

    const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);

    useEffect(() => {
        async function load() {
            const [catsRes, itemsRes] = await Promise.all([
                supabase.from("categories").select("*").eq("restaurant_id", restaurantId).order("position"),
                supabase.from("menu_items").select("*").eq("restaurant_id", restaurantId)
            ]);
            if (catsRes.data) setCategories(catsRes.data);
            if (itemsRes.data) setMenuItems(itemsRes.data);

            if (catsRes.data && catsRes.data.length > 0) {
                setActiveCategoryId(catsRes.data[0].id);
            }
            setLoading(false);
        }
        load();
    }, [supabase, restaurantId]);

    // CATEGORY ACTIONS
    async function handleSaveCategory() {
        if (!catNameInput.trim()) return;

        if (editingCategory?.id) {
            const { data, error } = await supabase
                .from("categories")
                .update({ name: catNameInput.trim() })
                .eq("id", editingCategory.id)
                .select()
                .single();
            if (!error && data) {
                setCategories(categories.map(c => c.id === data.id ? data : c));
            }
        } else {
            const { data, error } = await supabase
                .from("categories")
                .insert({
                    restaurant_id: restaurantId,
                    name: catNameInput.trim(),
                    position: categories.length
                })
                .select()
                .single();
            if (!error && data) {
                setCategories([...categories, data]);
                if (!activeCategoryId) setActiveCategoryId(data.id);
            }
        }
        setCategoryFormOpen(false);
        setEditingCategory(null);
        setCatNameInput("");
    }

    // ITEM ACTIONS
    async function handleSaveItem() {
        if (!itemInput.name.trim() || !itemInput.category_id || !itemInput.price) return;

        if (editingItem?.id) {
            const { data, error } = await supabase
                .from("menu_items")
                .update({
                    name: itemInput.name.trim(),
                    description: itemInput.description.trim(),
                    price: parseFloat(itemInput.price),
                    category_id: itemInput.category_id
                })
                .eq("id", editingItem.id)
                .select()
                .single();

            if (!error && data) {
                setMenuItems(menuItems.map(m => m.id === data.id ? data : m));
            }
        } else {
            const { data, error } = await supabase
                .from("menu_items")
                .insert({
                    restaurant_id: restaurantId,
                    category_id: itemInput.category_id,
                    name: itemInput.name.trim(),
                    description: itemInput.description.trim(),
                    price: parseFloat(itemInput.price),
                    is_available: true
                })
                .select()
                .single();

            if (!error && data) {
                setMenuItems([...menuItems, data]);
            }
        }
        setItemFormOpen(false);
        setEditingItem(null);
        setItemInput({ name: "", description: "", price: "", category_id: "" });
    }

    async function toggleAvailability(item: MenuItem) {
        const newStatus = !item.is_available;
        const { error } = await supabase
            .from("menu_items")
            .update({ is_available: newStatus })
            .eq("id", item.id);

        if (!error) {
            setMenuItems(menuItems.map(m => m.id === item.id ? { ...m, is_available: newStatus } : m));
        }
    }

    if (loading) return <div className="text-neutral-500 text-sm">Loading menu...</div>;

    return (
        <div className="flex flex-col gap-6 w-full">
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Menu Management</h2>
                    <p className="text-neutral-500">Organize your categories and menu items.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => { setCategoryFormOpen(true); setEditingCategory(null); setCatNameInput(""); }}
                        className="flex items-center gap-2 px-4 py-2 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 rounded-full text-sm font-medium hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
                    >
                        <Plus className="w-4 h-4" /> Category
                    </button>
                    <button
                        onClick={() => {
                            if (categories.length === 0) return alert("Create a category first");
                            setItemFormOpen(true);
                            setEditingItem(null);
                            setItemInput({ name: "", description: "", price: "", category_id: activeCategoryId || categories[0].id });
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-neutral-900 dark:bg-neutral-50 text-neutral-50 dark:text-neutral-900 rounded-full text-sm font-medium hover:scale-105 transition-transform"
                    >
                        <Plus className="w-4 h-4" /> Item
                    </button>
                </div>
            </div>

            {categoryFormOpen && (
                <div className="p-4 border border-neutral-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-black flex gap-3 items-center">
                    <input
                        autoFocus
                        type="text"
                        placeholder="Category Name"
                        value={catNameInput}
                        maxLength={50}
                        onChange={(e) => setCatNameInput(e.target.value)}
                        className="flex-1 px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm focus:outline-none"
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveCategory()}
                    />
                    <button onClick={handleSaveCategory} className="p-2 bg-neutral-900 dark:bg-neutral-50 text-neutral-50 dark:text-neutral-900 rounded-lg"><Save className="w-4 h-4" /></button>
                    <button onClick={() => setCategoryFormOpen(false)} className="p-2 border border-neutral-200 dark:border-neutral-800 rounded-lg"><X className="w-4 h-4" /></button>
                </div>
            )}

            {itemFormOpen && (
                <div className="p-4 border border-neutral-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-black grid grid-cols-1 gap-4">
                    <div className="font-semibold text-sm">{editingItem ? "Edit Item" : "New Item"}</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <input type="text" placeholder="Item Name *" value={itemInput.name} maxLength={100} onChange={e => setItemInput({ ...itemInput, name: e.target.value })} className="px-3 py-2 border border-neutral-200 dark:border-neutral-800 rounded-lg bg-neutral-50 dark:bg-neutral-900 text-sm" />
                        <input type="number" placeholder="Price *" value={itemInput.price} onChange={e => setItemInput({ ...itemInput, price: e.target.value })} className="px-3 py-2 border border-neutral-200 dark:border-neutral-800 rounded-lg bg-neutral-50 dark:bg-neutral-900 text-sm" />
                        <input type="text" placeholder="Description" value={itemInput.description} maxLength={500} onChange={e => setItemInput({ ...itemInput, description: e.target.value })} className="px-3 py-2 border border-neutral-200 dark:border-neutral-800 rounded-lg bg-neutral-50 dark:bg-neutral-900 text-sm sm:col-span-2" />
                        <select value={itemInput.category_id} onChange={e => setItemInput({ ...itemInput, category_id: e.target.value })} className="px-3 py-2 border border-neutral-200 dark:border-neutral-800 rounded-lg bg-neutral-50 dark:bg-neutral-900 text-sm sm:col-span-2">
                            <option value="" disabled>Select Category *</option>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div className="flex gap-2 justify-end">
                        <button onClick={() => setItemFormOpen(false)} className="px-4 py-2 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm font-medium">Cancel</button>
                        <button onClick={handleSaveItem} className="px-4 py-2 bg-neutral-900 dark:bg-neutral-50 text-neutral-50 dark:text-neutral-900 rounded-lg text-sm font-medium">Save Item</button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-1 flex flex-col gap-2">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-500 mb-2">Categories</h3>
                    {categories.length === 0 ? (
                        <div className="text-sm text-neutral-500 italic">No categories yet.</div>
                    ) : (
                        categories.map(c => (
                            <div
                                key={c.id}
                                onClick={() => setActiveCategoryId(c.id)}
                                className={`p-3 border rounded-lg text-sm font-medium cursor-pointer transition-colors group flex justify-between items-center ${activeCategoryId === c.id ? 'bg-white dark:bg-black border-neutral-200 dark:border-neutral-800 shadow-sm' : 'border-transparent text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-900'}`}
                            >
                                {c.name}
                                <button
                                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingCategory(c);
                                        setCatNameInput(c.name);
                                        setCategoryFormOpen(true);
                                    }}
                                >
                                    <Edit2 className="w-3 h-3" />
                                </button>
                            </div>
                        ))
                    )}
                </div>

                <div className="lg:col-span-3 p-6 border border-neutral-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-black min-h-[400px]">
                    {activeCategoryId ? (
                        <div>
                            <h3 className="font-semibold mb-4 text-lg border-b border-neutral-200 dark:border-neutral-800 pb-2">
                                {categories.find(c => c.id === activeCategoryId)?.name} Items
                            </h3>

                            <div className="grid grid-cols-1 gap-3 mt-4">
                                {menuItems.filter(m => m.category_id === activeCategoryId).length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-32 text-sm text-neutral-500 italic mt-4 border-t border-dashed border-neutral-200 dark:border-neutral-800 w-full">
                                        <UtensilsCrossed className="w-8 h-8 mb-2 opacity-50" />
                                        No items in this category.
                                    </div>
                                ) : (
                                    menuItems.filter(m => m.category_id === activeCategoryId).map(item => (
                                        <div key={item.id} className="flex justify-between p-4 border border-neutral-200 dark:border-neutral-800 rounded-lg group hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors">
                                            <div>
                                                <div className="font-medium flex items-center gap-2">
                                                    {item.name}
                                                    {!item.is_available && <span className="text-[10px] uppercase font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Unavailable</span>}
                                                </div>
                                                {item.description && <div className="text-sm text-neutral-500 mt-1">{item.description}</div>}
                                                <div className="text-sm font-semibold mt-2">${item.price.toFixed(2)}</div>
                                            </div>
                                            <div className="flex flex-col items-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => {
                                                        setEditingItem(item);
                                                        setItemInput({ name: item.name, description: item.description || "", price: item.price.toString(), category_id: item.category_id });
                                                        setItemFormOpen(true);
                                                    }}
                                                    className="text-xs flex items-center gap-1 font-medium text-neutral-500 hover:text-neutral-900"
                                                >
                                                    <Edit2 className="w-3 h-3" /> Edit
                                                </button>
                                                <button
                                                    onClick={() => toggleAvailability(item)}
                                                    className="text-xs flex items-center gap-1 font-medium text-neutral-500 hover:text-neutral-900"
                                                >
                                                    <Trash2 className="w-3 h-3" /> {item.is_available ? "Disable" : "Enable"}
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-sm text-neutral-500 italic">
                            <UtensilsCrossed className="w-8 h-8 mb-2 opacity-50" />
                            Select a category to view items.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
