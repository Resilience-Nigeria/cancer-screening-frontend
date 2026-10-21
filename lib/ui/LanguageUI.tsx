"use client";
// app/components/LanguageUI.tsx
import React from "react";
import { Globe } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { LANGUAGES, type LangCode } from "@/lib/i18n/translations";

/**
 * Full-screen prompt shown when the page loads.
 * The heading is shown in all four languages on purpose, so someone who
 * can't read English can still understand what to do.
 */
export function LanguageGate() {
  const { confirmed, language, confirmLanguage } = useLanguage();
  if (confirmed) return null;

  return (
    // <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gradient-to-br from-green-50 to-white">
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-green-50 to-white">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-lg border border-gray-100 p-6 md:p-8">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="p-3 bg-green-100 rounded-full mb-3">
            <Globe className="w-6 h-6 text-green-700" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Choose your language</h1>
          <p className="text-sm text-gray-500 mt-1">Zaɓi harshenku · Yan èdè rẹ · Họrọ asụsụ gị</p>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => confirmLanguage(l.code)}
              className={`w-full py-4 px-5 rounded-2xl border-2 text-left text-lg font-semibold transition-all hover:border-green-600 hover:bg-green-50 ${
                language === l.code ? "border-green-600 bg-green-50 text-green-800" : "border-gray-200 text-gray-900"
              }`}
            >
              {l.native}
            </button>
          ))}
        </div>

        <p className="mt-5 text-center text-xs text-gray-400">
          You can change the language at any time.
        </p>
      </div>
    </div>
  );
}

/** Small always-visible switcher (top-right). */
export function LanguageSwitcher() {
  const { language, setLanguage, confirmed, t } = useLanguage();
  if (!confirmed) return null;

  return (
    <div className="fixed top-3 right-3 z-40">
      <label className="flex items-center gap-2 bg-white/90 backdrop-blur border border-gray-200 shadow-sm rounded-full pl-3 pr-2 py-1.5">
        <Globe className="w-4 h-4 text-green-700" aria-hidden />
        <span className="sr-only">{t("lang.switcher")}</span>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as LangCode)}
          aria-label={t("lang.switcher")}
          className="bg-transparent text-sm font-medium text-gray-800 focus:outline-none cursor-pointer"
        >
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.native}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}