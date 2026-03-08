"use client";

import { useEffect, useState } from "react";
import { Globe } from "lucide-react";

export type Language = "en" | "ar";

export default function LanguageToggle() {
  const [lang, setLang] = useState<Language>("en");

  useEffect(() => {
    const saved = localStorage.getItem("restova-lang") as Language;
    if (saved) {
      setLang(saved);
      update(saved);
    }
  }, []);

  const update = (l: Language) => {
    document.documentElement.lang = l;
    document.documentElement.dir = l === "ar" ? "rtl" : "ltr";
    localStorage.setItem("restova-lang", l);
  };

  const toggle = () => {
    const next = lang === "en" ? "ar" : "en";
    setLang(next);
    update(next);
  };

  return (
    <button
      onClick={toggle}
      className="fixed top-4 right-4 z-[100] flex items-center gap-2 px-3 py-1.5 bg-white/80 dark:bg-black/80 backdrop-blur-md border border-neutral-200 dark:border-neutral-800 rounded-full text-sm font-medium shadow-sm transition-all hover:scale-105 active:scale-95"
    >
      <Globe className="w-4 h-4" />
      <span>{lang === "en" ? "العربية" : "English"}</span>
    </button>
  );
}
