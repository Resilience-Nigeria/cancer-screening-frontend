"use client";
import React from "react";
import Image from "next/image";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

export default function PoweredBy() {
  const { t } = useLanguage();
  return (
    <div className="mt-6 flex flex-col items-center gap-2">
      <p className="text-center text-xs text-gray-400">{t("common.poweredBy")}</p>
      <a
        href="https://resilience.ng"
        target="_blank"
        rel="noopener noreferrer"
        className="opacity-70 hover:opacity-100 transition-opacity"
        aria-label="Resilience Nigeria"
      >
        <Image
          src="/assets/img/resilience.png"
          alt="Resilience Nigeria"
          width={220}
          height={52}
          className="object-contain h-16 w-auto"
        />
      </a>
    </div>
  );
}