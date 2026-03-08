import React from "react";
import LogoutButton from "@/components/auth/logout-button";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", fontFamily: "sans-serif" }}>
            <header
                style={{
                    padding: "1rem 2rem",
                    borderBottom: "1px solid var(--color-border-default)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                }}
            >
                <h1 style={{ margin: 0, fontSize: "1.25rem" }}>Platform Admin</h1>
                <nav>
                    <LogoutButton />
                </nav>
            </header>
            <main style={{ padding: "2rem", flex: 1 }}>{children}</main>
        </div>
    );
}
