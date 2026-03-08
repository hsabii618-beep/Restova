"use client";

import { useEffect, useState } from "react";
import { translations, TranslationKey } from "./i18n";

export function useTranslation() {
  const [lang, setLang] = useState<"en" | "ar">("en");

  useEffect(() => {
    const check = () => {
      const current = document.documentElement.lang as "en" | "ar";
      if (current !== lang) setLang(current || "en");
    };
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
    return () => observer.disconnect();
  }, [lang]);

  const t = (key: TranslationKey) => translations[lang][key];

  return { t, lang };
}
