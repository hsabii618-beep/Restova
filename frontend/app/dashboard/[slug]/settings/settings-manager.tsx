"use client";

import { useState, useEffect, useRef } from "react";
import { Store, Globe, QrCode, Download, Save, Loader2, CheckCircle2, AlertCircle, Copy, Check } from "lucide-react";
import QRCode from "qrcode";

type Restaurant = {
    id: string;
    name: string;
    slug: string;
    custom_domain: string | null;
    menu_path: string;
    domain_verified: boolean;
    is_menu_public: boolean;
    is_slug_locked: boolean;
};

type Props = {
    restaurant: Restaurant;
};

export default function SettingsManager({ restaurant: initialRestaurant }: Props) {
    const [restaurant, setRestaurant] = useState(initialRestaurant);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [qrDataUrl, setQrDataUrl] = useState<string>("");
    const [isCopied, setIsCopied] = useState(false);

    // Slug Management States
    const [slugInput, setSlugInput] = useState(initialRestaurant.slug);
    const [slugStatus, setSlugStatus] = useState<{ available: boolean, message: string, checking: boolean }>({
        available: true,
        message: "",
        checking: false
    });
    const [showSlugConfirm, setShowSlugConfirm] = useState(false);
    const [suggestedSlugs, setSuggestedSlugs] = useState<string[]>([]);

    // Base URL determination
    const [baseUrl, setBaseUrl] = useState("");
    useEffect(() => {
        setBaseUrl(window.location.origin);

        // Suggest slugs on load if not locked
        if (!initialRestaurant.is_slug_locked) {
            const base = initialRestaurant.name.toLowerCase().trim()
                .replace(/\s+/g, '-')
                .replace(/[^a-z0-9-]/g, '')
                .replace(/-+/g, '-')
                .replace(/^-+|-+$/g, '');

            if (base) {
                setSuggestedSlugs([
                    base,
                    `${base}-restaurant`,
                    `${base}-food`,
                    base.split('-')[0] // first word
                ].filter((v, i, a) => v && v.length >= 3 && a.indexOf(v) === i).slice(0, 3));
            }
        }
    }, [initialRestaurant]);

    // Live Slug Check with Debounce
    useEffect(() => {
        if (restaurant.is_slug_locked) return;
        if (slugInput === initialRestaurant.slug) {
            setSlugStatus({ available: true, message: "", checking: false });
            return;
        }

        const timer = setTimeout(async () => {
            if (slugInput.length < 3) {
                setSlugStatus({ available: false, message: "Slug must be at least 3 characters.", checking: false });
                return;
            }

            setSlugStatus(prev => ({ ...prev, checking: true }));
            try {
                const res = await fetch(`/api/restaurants/check-slug?slug=${slugInput}&restaurantId=${restaurant.id}`);
                const data = await res.json();
                setSlugStatus({
                    available: data.available,
                    message: data.message,
                    checking: false
                });
            } catch (err) {
                setSlugStatus({ available: false, message: "Error checking availability.", checking: false });
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [slugInput, initialRestaurant.slug, restaurant.id, restaurant.is_slug_locked]);

    const publicUrl = restaurant.custom_domain
        ? `https://${restaurant.custom_domain}/${restaurant.menu_path}`
        : `${baseUrl}/${restaurant.slug}/${restaurant.menu_path}`;

    // Generate QR Code on changes
    useEffect(() => {
        if (publicUrl) {
            QRCode.toDataURL(publicUrl, {
                width: 400,
                margin: 2,
                color: {
                    dark: "#000000",
                    light: "#ffffff"
                }
            })
                .then(url => setQrDataUrl(url))
                .catch(err => console.error(err));
        }
    }, [publicUrl]);

    async function handleSave() {
        setIsSaving(true);
        setMessage(null);
        try {
            const res = await fetch(`/api/restaurants/${restaurant.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: restaurant.name,
                    custom_domain: restaurant.custom_domain || null,
                    menu_path: restaurant.menu_path || 'menu',
                    is_menu_public: restaurant.is_menu_public,
                    // Slug is only included if we are confirming through the modal
                    slug: showSlugConfirm ? slugInput : undefined
                })
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || "Failed to save settings");
            }

            const updated = await res.json();
            setRestaurant(updated);
            setSlugInput(updated.slug);
            setShowSlugConfirm(false);

            setMessage({ type: 'success', text: "Settings saved successfully." });
        } catch (err) {
            setMessage({ type: 'error', text: "Failed to save settings. Please try again." });
        } finally {
            setIsSaving(false);
        }
    }

    const downloadQR = () => {
        const link = document.createElement("a");
        link.href = qrDataUrl;
        link.download = `${restaurant.slug}-menu-qr.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(publicUrl);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        } catch (err) {
            console.error("Failed to copy link:", err);
        }
    };

    return (
        <div className="flex flex-col gap-8 max-w-4xl">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Sidebar Tabs (UI only for now) */}
                <div className="md:col-span-1 flex flex-col gap-2">
                    <div className="p-3 bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm font-medium flex items-center gap-2">
                        <Store className="w-4 h-4" /> General
                    </div>
                    <div className="p-3 text-neutral-500 text-sm font-medium hover:bg-neutral-100 dark:hover:bg-neutral-900 rounded-lg cursor-pointer transition-colors flex items-center gap-2">
                        <Globe className="w-4 h-4" /> Domains
                    </div>
                </div>

                {/* Main Content */}
                <div className="md:col-span-3 flex flex-col gap-6">
                    {/* Basic Info */}
                    <div className="p-6 border border-neutral-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-black">
                        <h3 className="font-semibold mb-4 border-b border-neutral-200 dark:border-neutral-800 pb-2">Restaurant Profile</h3>
                        <div className="space-y-4 max-w-md">
                            <div>
                                <label className="block text-sm font-medium mb-1 text-neutral-700 dark:text-neutral-300">Restaurant Name</label>
                                <input
                                    type="text"
                                    value={restaurant.name}
                                    maxLength={100}
                                    onChange={e => setRestaurant({ ...restaurant, name: e.target.value })}
                                    className="w-full h-10 px-3 bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded-md focus:ring-1 focus:ring-neutral-400 outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
                                    Platform URL Slug
                                    {restaurant.is_slug_locked && (
                                        <span className="px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-[10px] font-bold text-neutral-500 uppercase tracking-tight flex items-center gap-1">
                                            <Save className="w-2 h-2" /> Locked
                                        </span>
                                    )}
                                </label>
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center group">
                                        <div className="h-10 px-3 flex items-center bg-neutral-50 dark:bg-neutral-900 border border-r-0 border-neutral-200 dark:border-neutral-800 rounded-l-md text-neutral-400 text-sm whitespace-nowrap">
                                            {baseUrl.replace(/^https?:\/\//, '')}/
                                        </div>
                                        <input
                                            type="text"
                                            disabled={restaurant.is_slug_locked}
                                            value={slugInput}
                                            maxLength={30}
                                            onChange={e => {
                                                const val = e.target.value.toLowerCase()
                                                    .replace(/\s+/g, '-')
                                                    .replace(/[^a-z0-9-]/g, '')
                                                    .replace(/-+/g, '-')
                                                    .replace(/^-+|-+$/g, '');
                                                setSlugInput(val);
                                            }}
                                            className={`flex-1 h-10 px-3 bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded-r-md outline-none transition-all text-sm ${restaurant.is_slug_locked ? 'opacity-60 cursor-not-allowed' : 'focus:ring-1 focus:ring-neutral-400'}`}
                                        />
                                    </div>
                                    {!restaurant.is_slug_locked && (
                                        <div className="space-y-2">
                                            {/* Live Validation Signal */}
                                            {slugInput !== initialRestaurant.slug && (
                                                <div className="flex items-center gap-1.5 mt-1">
                                                    {slugStatus.checking ? (
                                                        <>
                                                            <Loader2 className="w-3 h-3 animate-spin text-neutral-400" />
                                                            <span className="text-[10px] text-neutral-500 font-medium italic">Checking availability...</span>
                                                        </>
                                                    ) : slugStatus.message && (
                                                        <>
                                                            {slugStatus.available ? <CheckCircle2 className="w-3 h-3 text-green-500" /> : <AlertCircle className="w-3 h-3 text-red-500" />}
                                                            <span className={`text-[10px] font-bold uppercase tracking-tight ${slugStatus.available ? 'text-green-600' : 'text-red-500'}`}>
                                                                {slugStatus.message}
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            )}

                                            <p className="text-[11px] text-orange-600 dark:text-orange-400 font-medium">
                                                You can set this slug only once. After saving it cannot be changed.
                                            </p>
                                            {suggestedSlugs.length > 0 && slugInput === initialRestaurant.slug && (
                                                <div className="flex flex-wrap gap-2 items-center">
                                                    <span className="text-[10px] text-neutral-400 font-bold uppercase">Suggestions:</span>
                                                    {suggestedSlugs.map(s => (
                                                        <button
                                                            key={s}
                                                            onClick={() => setSlugInput(s)}
                                                            className="px-2 py-1 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded text-[10px] font-semibold transition-colors"
                                                        >
                                                            {s}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {restaurant.is_slug_locked && (
                                        <p className="text-[10px] text-neutral-500 italic">This URL has been permanently set.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Public Menu & URL Sharing */}
                    <div className="p-6 border border-neutral-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-black">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="font-semibold">Public Menu & URL</h3>
                                <p className="text-xs text-neutral-500">Configure how customers access your menu online.</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            {/* Custom Menu Path */}
                            <div className="max-w-xl">
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Menu URL Path</label>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] uppercase font-bold text-neutral-400">Public Visibility</span>
                                        <button
                                            onClick={() => setRestaurant({ ...restaurant, is_menu_public: !restaurant.is_menu_public })}
                                            className={`w-10 h-5 rounded-full transition-colors relative ${restaurant.is_menu_public ? 'bg-green-500' : 'bg-neutral-300 dark:bg-neutral-700'}`}
                                        >
                                            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${restaurant.is_menu_public ? 'left-6' : 'left-1'}`} />
                                        </button>
                                    </div>
                                </div>
                                <div className="flex items-center group">
                                    <div className="h-10 px-3 flex items-center bg-neutral-50 dark:bg-neutral-900 border border-r-0 border-neutral-200 dark:border-neutral-800 rounded-l-md text-neutral-400 text-sm whitespace-nowrap overflow-hidden max-w-[200px]">
                                        {restaurant.custom_domain ? `https://${restaurant.custom_domain}/` : `${baseUrl}/${restaurant.slug}/`}
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="menu"
                                        value={restaurant.menu_path}
                                        maxLength={40}
                                        onChange={e => setRestaurant({ ...restaurant, menu_path: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                                        className="flex-1 h-10 px-3 bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded-none focus:ring-1 focus:ring-neutral-400 outline-none transition-all text-sm"
                                    />
                                    <button
                                        onClick={handleCopyLink}
                                        className="h-10 px-4 flex items-center justify-center bg-neutral-50 dark:bg-neutral-900 border border-l-0 border-neutral-200 dark:border-neutral-800 rounded-r-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
                                        title="Copy Menu Link"
                                    >
                                        {isCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                    </button>
                                </div>
                                <p className="text-[10px] text-neutral-400 mt-2 italic flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" /> Default path is &quot;menu&quot;
                                </p>
                            </div>

                            {/* Custom Domain */}
                            <div className="max-w-xl p-4 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg">
                                <label className="block text-sm font-medium mb-1 text-neutral-700 dark:text-neutral-300">Custom Domain</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="e.g. menu.yourrestaurant.com"
                                        value={restaurant.custom_domain || ""}
                                        maxLength={253}
                                        onChange={e => setRestaurant({ ...restaurant, custom_domain: e.target.value.toLowerCase().trim() })}
                                        className="flex-1 h-10 px-3 bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded-md focus:ring-1 focus:ring-neutral-400 outline-none transition-all text-sm"
                                    />
                                </div>
                                <div className="mt-4 p-3 bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded text-[11px] text-neutral-600 dark:text-neutral-400 space-y-2">
                                    <p className="font-semibold text-neutral-800 dark:text-neutral-200 underline">DNS Instructions:</p>
                                    <p>1. Create a CNAME record pointing your domain to <code className="bg-neutral-100 dark:bg-neutral-800 px-1 rounded text-purple-500 font-mono">cname.restova.io</code></p>
                                    <p>2. Or an A record pointing to <code className="bg-neutral-100 dark:bg-neutral-800 px-1 rounded text-purple-500 font-mono">76.76.21.21</code> (Vercel IP)</p>
                                </div>
                            </div>

                            {/* QR Code Section */}
                            <div className="pt-6 border-t border-neutral-100 dark:border-neutral-900 flex flex-col md:flex-row gap-8 items-center">
                                <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm">
                                    {qrDataUrl ? (
                                        <img src={qrDataUrl} alt="Menu QR Code" className="w-32 h-32" />
                                    ) : (
                                        <div className="w-32 h-32 bg-neutral-100 animate-pulse rounded-lg" />
                                    )}
                                </div>
                                <div className="flex-1 text-center md:text-left">
                                    <h4 className="font-semibold text-sm mb-1">Restaurant QR Code</h4>
                                    <p className="text-xs text-neutral-500 mb-4 max-w-sm">Place this QR code on your tables, windows, or marketing materials to give customers instant access to your digital menu.</p>
                                    <button
                                        onClick={downloadQR}
                                        className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors mx-auto md:mx-0"
                                    >
                                        <Download className="w-4 h-4" /> Download PNG
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Save Actions */}
                        <div className="mt-8 pt-6 border-t border-neutral-100 dark:border-neutral-900 flex items-center justify-between">
                            {message && (
                                <div className={`flex items-center gap-2 text-xs font-medium ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                                    {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                                    {message.text}
                                </div>
                            )}
                            <button
                                disabled={isSaving}
                                onClick={() => {
                                    if (!restaurant.is_slug_locked && slugInput !== restaurant.slug) {
                                        if (!slugStatus.available) {
                                            setMessage({ type: 'error', text: slugStatus.message || "Invalid URL slug." });
                                            return;
                                        }
                                        setShowSlugConfirm(true);
                                    } else {
                                        handleSave();
                                    }
                                }}
                                className="ml-auto px-6 py-2.5 bg-neutral-950 dark:bg-neutral-50 text-white dark:text-black rounded-lg text-sm font-bold flex items-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all shadow-lg"
                            >
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Save All Changes
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Confirmation Modal */}
            {showSlugConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-neutral-900 w-full max-w-md rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden scale-in-center">
                        <div className="p-6 border-b border-neutral-100 dark:border-neutral-800">
                            <h3 className="text-xl font-black tracking-tight">Confirm your restaurant URL</h3>
                            <p className="text-sm text-neutral-500 mt-1">This action is permanent.</p>
                        </div>
                        <div className="p-8 space-y-6">
                            <div>
                                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-2">Your public restaurant URL will be:</p>
                                <div className="p-4 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl font-mono text-sm break-all font-bold text-orange-500">
                                    {baseUrl.replace(/^https?:\/\//, '')}/{slugInput}
                                </div>
                            </div>

                            <div className="p-4 bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30 rounded-xl">
                                <p className="text-xs text-orange-800 dark:text-orange-400 leading-relaxed">
                                    <strong>Important:</strong> This slug can only be set once and cannot be changed later. All printed QR codes and shared links will depend on this URL.
                                </p>
                            </div>
                        </div>
                        <div className="p-6 bg-neutral-50 dark:bg-neutral-950 flex gap-3 justify-end">
                            <button
                                onClick={() => setShowSlugConfirm(false)}
                                className="px-6 py-2.5 rounded-xl text-sm font-bold text-neutral-500 hover:text-neutral-800 dark:hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="px-8 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-black transition-all shadow-lg shadow-orange-500/20 flex items-center gap-2"
                            >
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm & Lock URL"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
