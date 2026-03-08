"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Restaurant {
    id: string;
    name: string;
    slug: string;
    owner_id: string;
    created_at: string;
}

export default function PendingApprovalList({ restaurants }: { restaurants: Restaurant[] }) {

    const router = useRouter();
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const [actionType, setActionType] = useState<'activate' | 'suspend' | null>(null);
    const [errorId, setErrorId] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    async function handleAction(id: string, action: 'activate' | 'suspend') {
        setLoadingId(id);
        setActionType(action);
        setErrorId(null);
        setErrorMsg(null);

        try {
            const url = action === 'activate'
                ? `/api/admin/restaurants/${id}/activate`
                : `/api/admin/restaurants/${id}`;

            const method = action === 'activate' ? 'POST' : 'DELETE';

            const res = await fetch(url, { method });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || `Failed to ${action} restaurant`);
            }

            router.refresh();
            // Keep loading state until refresh completes by unmounting,
            // but in case it doesn't unmount immediately, we clear it after a short delay
            setTimeout(() => setLoadingId(null), 500);
        } catch (err: unknown) {
            setErrorId(id);
            setErrorMsg(err instanceof Error ? err.message : "An unknown error occurred");

            setLoadingId(null);
            setActionType(null);
        }
    }

    if (!restaurants || restaurants.length === 0) {
        return <p style={{ color: "var(--color-text-muted)" }}>No restaurants currently pending approval.</p>;
    }

    return (
        <div style={{ display: "grid", gap: "1rem" }}>
            {restaurants.map((restaurant) => (
                <div key={restaurant.id} style={{ padding: "1rem", border: "1px solid var(--color-border-default)", borderRadius: 8, background: "var(--color-bg-page)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
                    <div>
                        <div style={{ fontWeight: "bold" }}>{restaurant.name}</div>
                        <div style={{ fontSize: "0.9rem", color: "var(--color-text-muted)" }}>@{restaurant.slug}</div>
                        <div style={{ fontSize: "0.8rem", marginTop: "0.5rem" }}>
                            ID: {restaurant.id} <br />
                            Owner ID: {restaurant.owner_id} <br />
                            Created: {new Date(restaurant.created_at).toLocaleString()}
                        </div>
                        {errorId === restaurant.id && (
                            <div style={{ color: "var(--color-error, red)", fontSize: "0.85rem", marginTop: "0.5rem" }}>
                                Error: {errorMsg}
                            </div>
                        )}
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button
                            disabled={loadingId === restaurant.id}
                            onClick={() => handleAction(restaurant.id, 'activate')}
                            style={{
                                padding: "0.5rem 1rem",
                                borderRadius: 6,
                                border: "1px solid var(--color-border-default)",
                                background: "var(--color-brand-primary, #000)",
                                color: "white",
                                cursor: loadingId === restaurant.id ? "not-allowed" : "pointer",
                                opacity: loadingId === restaurant.id ? 0.7 : 1
                            }}
                        >
                            {loadingId === restaurant.id && actionType === 'activate' ? "Approving..." : "Approve"}
                        </button>
                        <button
                            disabled={loadingId === restaurant.id}
                            onClick={() => handleAction(restaurant.id, 'suspend')}
                            style={{
                                padding: "0.5rem 1rem",
                                borderRadius: 6,
                                border: "1px solid var(--color-border-error, red)",
                                background: "transparent",
                                color: "var(--color-error, red)",
                                cursor: loadingId === restaurant.id ? "not-allowed" : "pointer",
                                opacity: loadingId === restaurant.id ? 0.7 : 1
                            }}
                        >
                            {loadingId === restaurant.id && actionType === 'suspend' ? "Rejecting..." : "Reject"}
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}
