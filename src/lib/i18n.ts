// ─── Lightweight i18n System ─────────────────────────────────
// Simple, framework-less internationalization for ReelMagic.
// No heavy dependencies — just JSON locale files and a thin API.

import { logger } from "./logger";

const log = logger.child({ module: "i18n" });

// ─── Locale Types ────────────────────────────────────────────

export type LocaleCode =
  | "en"
  | "es"
  | "fr"
  | "de"
  | "ja"
  | "zh"
  | "pt"
  | "ko";

export interface LocaleInfo {
  code: LocaleCode;
  name: string;         // native name
  englishName: string;
}

export const LOCALES: Record<LocaleCode, LocaleInfo> = {
  en: { code: "en", name: "English", englishName: "English" },
  es: { code: "es", name: "Español", englishName: "Spanish" },
  fr: { code: "fr", name: "Français", englishName: "French" },
  de: { code: "de", name: "Deutsch", englishName: "German" },
  ja: { code: "ja", name: "日本語", englishName: "Japanese" },
  zh: { code: "zh", name: "中文", englishName: "Chinese" },
  pt: { code: "pt", name: "Português", englishName: "Portuguese" },
  ko: { code: "ko", name: "한국어", englishName: "Korean" },
};

export const DEFAULT_LOCALE: LocaleCode = "en";
export const SUPPORTED_LOCALES: LocaleCode[] = Object.keys(LOCALES) as LocaleCode[];

// ─── Dictionary Cache ────────────────────────────────────────

const dictionaryCache = new Map<LocaleCode, Record<string, unknown>>();

// ─── Load Dictionary ─────────────────────────────────────────

/**
 * Load a locale dictionary (JSON file). Cached after first load.
 * Server-side only — uses dynamic imports for tree-shaking on client.
 */
export async function getDictionary(locale: LocaleCode): Promise<Record<string, unknown>> {
  const cached = dictionaryCache.get(locale);
  if (cached) return cached;

  try {
    // Dynamic import of locale JSON
    const dict = (await import(`../i18n/locales/${locale}.json`)).default;
    dictionaryCache.set(locale, dict);
    return dict;
  } catch {
    log.warn({ locale }, "Locale not found, falling back to English");
    const fallback = await getDictionary(DEFAULT_LOCALE);
    return fallback;
  }
}

// ─── Translation Function ────────────────────────────────────

/**
 * Get a translation key from a nested dictionary using dot notation.
 * e.g., t(dict, "nav.dashboard") → "Dashboard"
 */
export function t(
  dict: Record<string, unknown>,
  key: string,
  params?: Record<string, string | number>
): string {
  const value = key.split(".").reduce(
    (obj, k) => (obj && typeof obj === "object" ? (obj as Record<string, unknown>)[k] : undefined),
    dict as unknown
  );

  if (typeof value !== "string") {
    // Return key as fallback (helps spot missing translations)
    return key;
  }

  // Interpolate params like {{name}}
  if (params) {
    return value.replace(/\{\{(\w+)\}\}/g, (_, paramKey) =>
      String(params[paramKey] ?? `{{${paramKey}}}`)
    );
  }

  return value;
}

// ─── Locale Detection ────────────────────────────────────────

/**
 * Detect locale from request in this order:
 * 1. URL query parameter `?lang=`
 * 2. Cookie `locale`
 * 3. Accept-Language header
 * 4. Default: "en"
 */
export function detectLocale(req?: {
  headers?: { get(name: string): string | null };
  cookies?: { get(name: string): { value: string } | undefined };
  searchParams?: URLSearchParams;
}): LocaleCode {
  // Query param takes priority
  const searchParams = req?.searchParams;
  if (searchParams) {
    const queryLang = searchParams.get("lang");
    if (queryLang && isSupportedLocale(queryLang)) return queryLang;
  }

  // Then cookie
  const cookieLocale = req?.cookies?.get("locale")?.value;
  if (cookieLocale && isSupportedLocale(cookieLocale)) return cookieLocale;

  // Then Accept-Language header
  const acceptLang = req?.headers?.get("accept-language") || "";
  if (acceptLang) {
    const parsed = parseAcceptLanguage(acceptLang);
    if (parsed) return parsed;
  }

  return DEFAULT_LOCALE;
}

function parseAcceptLanguage(header: string): LocaleCode | null {
  const languages = header
    .split(",")
    .map((lang) => lang.trim().split(";")[0].trim().toLowerCase());

  for (const lang of languages) {
    // Match exact locale code
    if (isSupportedLocale(lang)) return lang;

    // Match language prefix (e.g., "en-US" → "en")
    const prefix = lang.split("-")[0];
    if (isSupportedLocale(prefix)) return prefix;
  }

  return null;
}

function isSupportedLocale(code: string): code is LocaleCode {
  return SUPPORTED_LOCALES.includes(code as LocaleCode);
}

// ─── Public API Helpers ──────────────────────────────────────

/** Returns all available locales with metadata */
export function getLocales(): LocaleInfo[] {
  return Object.values(LOCALES);
}
