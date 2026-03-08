"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "@/components/ux/use-translation";
import LanguageToggle from "@/components/ux/language-toggle";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export default function UXNavbar() {
  const { t, lang } = useTranslation();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);
  return (
    <nav className="fixed top-0 inset-x-0 z-[90] h-16 bg-white/50 dark:bg-black/50 backdrop-blur-xl border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <Link
          href="/"
          className="flex items-center gap-1 text-sm font-medium text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-50 transition-colors"
        >
          {lang === "ar" ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          {t("backToGallery")}
        </Link>
        <div className="h-4 w-px bg-neutral-200 dark:bg-neutral-800" />
        <span className="text-sm font-black tracking-tighter uppercase">Restova</span>
      </div>

      <div className="flex items-center gap-6">
        <div className="hidden md:flex items-center gap-6 text-sm font-medium text-neutral-600 dark:text-neutral-400">
          {loading ? null : user ? (
            <>
              <span>{user.user_metadata?.full_name || user.user_metadata?.name || user.email}</span>
              <Link
                href="/dashboard"
                className="px-4 py-2 bg-neutral-900 dark:bg-neutral-50 text-neutral-50 dark:text-neutral-900 rounded-full hover:scale-105 transition-transform"
              >
                Dashboard
              </Link>
            </>
          ) : (
            <>
              <Link href="/login" className="hover:text-neutral-900 dark:hover:text-neutral-50 transition-colors">Login</Link>
              <Link
                href="/signup"
                className="px-4 py-2 bg-neutral-900 dark:bg-neutral-50 text-neutral-50 dark:text-neutral-900 rounded-full hover:scale-105 transition-transform"
              >
                {t("getStarted")}
              </Link>
            </>
          )}
        </div>
        <LanguageToggle />
      </div>
    </nav>
  );
}
