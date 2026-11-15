export type LanguageInfo = {
  label: string;
  flag: string;
};

export const LANGUAGES = {
  en: { label: "English", flag: "🇺🇸" },
} satisfies Record<string, LanguageInfo>;

export type LanguageCode = keyof typeof LANGUAGES;

export const LANGUAGE_CODES = Object.keys(LANGUAGES) as LanguageCode[];

export function isLanguageCode(v: string): v is LanguageCode {
  return v in LANGUAGES;
}
