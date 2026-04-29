// ─── Script Translation for Multi-Language Voiceover ─────────
// Translates video ad scripts to target languages while preserving
// timing markers, CTA patterns, and formatting.

import { logger } from "./logger";

const log = logger.child({ module: "translate" });

// ─── Language Detection (Heuristic) ──────────────────────────

/** Common stop words per language for basic detection */
const LANGUAGE_SIGNALS: Record<string, string[]> = {
  es: ["el", "la", "los", "las", "de", "del", "en", "es", "un", "una", "por", "con", "para", "que", "como", "muy", "más", "todo", "este", "esta"],
  fr: ["le", "la", "les", "des", "du", "de", "en", "est", "un", "une", "que", "pour", "dans", "sur", "avec", "par", "il", "ce", "tout", "vous"],
  de: ["der", "die", "das", "den", "dem", "des", "ein", "eine", "und", "oder", "aber", "nicht", "für", "mit", "von", "zu", "ist", "sind", "auf", "bei"],
  ja: ["は", "が", "を", "に", "の", "で", "と", "も", "から", "まで", "です", "ます", "した", "できる", "なる", "いく", "くる", "これ", "それ", "あれ"],
  zh: ["的", "是", "在", "了", "和", "有", "就", "不", "这", "我", "你", "他", "她", "它", "们", "都", "很", "也", "会", "能"],
  pt: ["o", "a", "os", "as", "do", "da", "em", "um", "uma", "para", "com", "por", "não", "é", "ser", "está", "mais", "como", "seu", "seu"],
  ko: ["은", "는", "이", "가", "을", "를", "에", "의", "와", "과", "으로", "부터", "까지", "이다", "있다", "없다", "하다", "되다", "않다", "것"],
};

/**
 * Detect the language of a script using word-frequency heuristics.
 * Returns a locale code or "en" if uncertain.
 */
export function detectLanguage(script: string): string {
  const words = script.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length < 3) return "en";

  let bestLang = "en";
  let bestScore = 0;

  for (const [lang, signals] of Object.entries(LANGUAGE_SIGNALS)) {
    const hits = signals.filter((s) => words.includes(s)).length;
    const score = hits / Math.max(words.length, 1);

    if (score > bestScore && score > 0.05) {
      bestScore = score;
      bestLang = lang;
    }
  }

  return bestLang;
}

// ─── Common Ad Script Patterns ───────────────────────────────

/** CTA patterns that need special handling in translation */
const CTA_PATTERNS: Record<string, { original: string; translations: Record<string, string> }> = {
  "buy_now": {
    original: "Buy now",
    translations: {
      es: "Compra ahora",
      fr: "Achetez maintenant",
      de: "Jetzt kaufen",
      ja: "今すぐ購入",
      zh: "立即购买",
      pt: "Compre agora",
      ko: "지금 구매하기",
    },
  },
  "shop_today": {
    original: "Shop today",
    translations: {
      es: "Compra hoy",
      fr: "Magasinez aujourd'hui",
      de: "Heute einkaufen",
      ja: "本日はショップへ",
      zh: "今日选购",
      pt: "Compre hoje",
      ko: "오늘 쇼핑하기",
    },
  },
  "limited_time": {
    original: "Limited time offer",
    translations: {
      es: "Oferta por tiempo limitado",
      fr: "Offre à durée limitée",
      de: "Angebot mit begrenzter Dauer",
      ja: "期間限定オファー",
      zh: "限时优惠",
      pt: "Oferta por tempo limitado",
      ko: "한정 기간 혜택",
    },
  },
  "learn_more": {
    original: "Learn more",
    translations: {
      es: "Más información",
      fr: "En savoir plus",
      de: "Mehr erfahren",
      ja: "詳細を見る",
      zh: "了解更多",
      pt: "Saiba mais",
      ko: "자세히 보기",
    },
  },
  "sign_up": {
    original: "Sign up",
    translations: {
      es: "Regístrate",
      fr: "Inscrivez-vous",
      de: "Registrieren Sie sich",
      ja: "サインアップ",
      zh: "注册",
      pt: "Inscreva-se",
      ko: "회원가입",
    },
  },
  "get_started": {
    original: "Get started",
    translations: {
      es: "Empieza ahora",
      fr: "Commencez",
      de: "Jetzt starten",
      ja: "今すぐ始める",
      zh: "立即开始",
      pt: "Comece agora",
      ko: "지금 시작하기",
    },
  },
  "free": {
    original: "Free",
    translations: {
      es: "Gratis",
      fr: "Gratuit",
      de: "Kostenlos",
      ja: "無料",
      zh: "免费",
      pt: "Grátis",
      ko: "무료",
    },
  },
  "discount_pct": {
    original: "{{pct}}% off",
    translations: {
      es: "{{pct}}% de descuento",
      fr: "{{pct}}% de réduction",
      de: "{{pct}}% Rabatt",
      ja: "{{pct}}%オフ",
      zh: "{{pct}}%折扣",
      pt: "{{pct}}% de desconto",
      ko: "{{pct}}% 할인",
    },
  },
};

// ─── ElevenLabs Voice Suggestions by Language ────────────────

export interface VoiceSuggestion {
  voiceId: string;
  name: string;
  language: string;
}

/**
 * Suggest an ElevenLabs voice ID for a given language.
 * Returns a default English voice for unsupported languages.
 */
export function suggestVoiceForLanguage(lang: string): VoiceSuggestion {
  const suggestions: Record<string, VoiceSuggestion> = {
    es: { voiceId: "pNInz6obpgDQGcFmaJgB", name: "Antoni", language: "es" },
    fr: { voiceId: "pqHfZKP75CkOrDBZhZR3", name: "Remy", language: "fr" },
    de: { voiceId: "iPfFc2SU8LOnAQq4wWYk", name: "Viktor", language: "de" },
    ja: { voiceId: "YoEiGZ1BX3M5VcKdU9Xt", name: "Eiji", language: "ja" },
    zh: { voiceId: "oFWWr5uNO9E0vJ2F5H7P", name: "Will", language: "zh" }, // bilingual
    pt: { voiceId: "pNInz6obpgDQGcFmaJgB", name: "Antoni", language: "pt" }, // Spanish works well for PT
    ko: { voiceId: "nPczCjzI2devNBz1zQrb", name: "Bella", language: "ko" },
  };

  return suggestions[lang] || { voiceId: "", name: "Default", language: "en" };
}

// ─── Translation Function ────────────────────────────────────

interface TranslateOptions {
  preserveFormatting?: boolean; // keep newlines, caps patterns
  context?: "ad-script" | "general"; // hint for better translation
}

/**
 * Translate a video script to the target language.
 *
 * MVP implementation uses pattern-mapping for common ad phrases
 * and falls through to a simple word-level approach for unknown text.
 * In production, this would call an LLM API (OpenAI, etc.).
 */
export function translateScript(
  script: string,
  targetLang: string,
  options: TranslateOptions = {}
): string {
  if (!script || !targetLang || targetLang === "en") return script;

  let result = script;

  // Step 1: Replace known CTA/ad patterns
  for (const pattern of Object.values(CTA_PATTERNS)) {
    const translated = pattern.translations[targetLang];
    if (translated) {
      // Case-insensitive replacement
      const regex = new RegExp(pattern.original, "gi");
      result = result.replace(regex, translated);
    }
  }

  // Step 2: If no changes were made (no known patterns), log that
  // we'd use an LLM here in production
  if (result === script) {
    log.debug({ targetLang, length: script.length },
      "No known translation patterns found — would use LLM API in production");

    // For now, return original with a note
    // In production: call OpenAI / Gemini / local LLM here
    result = `[${targetLang.toUpperCase()}] ${result}`;
  }

  return result;
}
