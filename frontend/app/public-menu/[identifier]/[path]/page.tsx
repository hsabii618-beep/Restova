import { getPublicMenu } from "@/lib/server/restaurants";
import { notFound } from "next/navigation";
import { ShoppingBag, Star, Info, ChevronRight, Clock } from "lucide-react";

interface MenuItem {
    id: string;
    name: string;
    description: string | null;
    price: number;
    image_path: string | null;
    is_available: boolean;
}

interface Category {
    id: string;
    name: string;
    position: number;
    menu_items: MenuItem[];
}

export default async function RestaurantMenuPage({ params }: { params: Promise<{ identifier: string, path: string }> }) {
    const { identifier, path } = await params;
    const { data: menuData, error } = await getPublicMenu(identifier, path);

    if (error || !menuData) {
        notFound();
    }

    const { restaurant, categories } = menuData;

    return (
        <div className="min-h-screen bg-white dark:bg-neutral-950 font-sans selection:bg-orange-100 dark:selection:bg-orange-900/30">
            {/* HERRO / HEADER */}
            <header className="relative bg-neutral-900 text-white overflow-hidden py-16 px-6">
                {/* Background Decor */}
                <div className="absolute inset-0 opacity-20 pointer-events-none overflow-hidden">
                    <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[80%] rounded-full bg-orange-500 blur-[100px]" />
                    <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[80%] rounded-full bg-purple-500 blur-[100px]" />
                </div>

                <div className="relative max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-center text-center md:text-left gap-8">
                    <div className="flex-1">
                        <div className="inline-flex items-center gap-2 text-orange-400 text-sm font-bold uppercase tracking-wider mb-4">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            {restaurant.is_open ? 'Open Now' : 'Currently Closed'}
                        </div>
                        <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-4">{restaurant.name}</h1>
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 text-neutral-400 text-sm">
                            <div className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> Prep time: 15-20m</div>
                            <div className="flex items-center gap-1.5"><Star className="w-4 h-4 text-orange-400 fill-orange-400" /> 4.9 (120+ ratings)</div>
                            <div className="flex items-center gap-1.5"><Info className="w-4 h-4" /> More info</div>
                        </div>
                    </div>

                    <button className="px-8 py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-bold transition-all shadow-xl shadow-orange-500/20 active:scale-95 flex items-center gap-2">
                        <ShoppingBag className="w-5 h-5" />
                        Start Ordering
                    </button>
                </div>
            </header>

            {/* NAV / CATEGORIES SCROLL */}
            <nav className="sticky top-0 z-10 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-xl border-b border-neutral-200 dark:border-neutral-800 scrollbar-hide overflow-x-auto">
                <div className="max-w-4xl mx-auto px-6 flex items-center gap-8 py-4">
                    {categories.map((cat: Category) => (
                        <a
                            key={cat.id}
                            href={`#cat-${cat.id}`}
                            className="text-sm font-bold whitespace-nowrap text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
                        >
                            {cat.name}
                        </a>
                    ))}
                </div>
            </nav>

            <main className="max-w-4xl mx-auto px-6 py-12">
                <div className="space-y-16">
                    {categories.map((cat: Category) => (
                        <section key={cat.id} id={`cat-${cat.id}`} className="scroll-mt-24">
                            <h2 className="text-2xl font-black mb-8 border-l-4 border-orange-500 pl-4 uppercase tracking-tight">{cat.name}</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {cat.menu_items.map((item: MenuItem) => (
                                    <div key={item.id} className="group p-5 bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-2xl hover:border-orange-500/30 hover:shadow-xl hover:shadow-orange-500/5 transition-all flex justify-between gap-4 cursor-pointer">
                                        <div className="flex-1">
                                            <h3 className="font-bold text-lg mb-1 group-hover:text-orange-500 transition-colors uppercase tracking-tight">{item.name}</h3>
                                            <p className="text-sm text-neutral-500 dark:text-neutral-400 line-clamp-2 mb-4 leading-relaxed font-medium">{item.description || "No description available."}</p>
                                            <div className="flex items-center gap-4">
                                                <span className="text-xl font-black text-neutral-900 dark:text-white">${Number(item.price).toFixed(2)}</span>
                                                <button className="h-8 w-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center group-hover:bg-orange-500 group-hover:text-white transition-all">
                                                    <ChevronRight className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                        {item.image_path && (
                                            <div className="w-24 h-24 rounded-xl bg-neutral-100 dark:bg-neutral-800 overflow-hidden shrink-0">
                                                {/* Placeholder for now since we don't have real Supabase storage URL helper here yet */}
                                                <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url(${item.image_path})` }} />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </section>
                    ))}
                </div>
            </main>

            <footer className="py-20 border-t border-neutral-100 dark:border-neutral-800 text-center">
                <p className="text-sm text-neutral-400 font-medium tracking-tight">Powered by <span className="font-black text-neutral-900 dark:text-white uppercase italic">Restova OS</span></p>
            </footer>
        </div>
    );
}
