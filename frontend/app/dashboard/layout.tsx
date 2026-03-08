import React from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/dashboard");
  }

  // Base structure for all dashboard sub-paths
  // This layout is shared by /dashboard/onboarding, /dashboard/select-restaurant, and /dashboard/[slug]
  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 dark:bg-neutral-950 font-sans text-neutral-900 dark:text-neutral-50">
      {children}
    </div>
  );
}