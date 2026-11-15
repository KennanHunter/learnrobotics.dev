import type { Component } from "solid-js";

export type LanguageEntry = {
  label: string;
  flag: string;
  description: Component;
};

const EnglishDescription: Component = () => (
  <p class="text-sm">All content supported.</p>
);

export const LANGUAGES = {
  en: {
    label: "English",
    flag: "🇺🇸",
    description: EnglishDescription,
  },
} satisfies Record<string, LanguageEntry>;

export type LanguageCode = keyof typeof LANGUAGES;

export const LANGUAGE_CODES = Object.keys(LANGUAGES) as LanguageCode[];

export function isLanguageCode(v: string): v is LanguageCode {
  return v in LANGUAGES;
}

export const UnsupportedLanguagesNotice: Component = () => (
  <p class="text-sm leading-relaxed">
    English is our only supported language right now. If you're interested in
    translating, visit{" "}
    <a
      class="text-blue underline underline-offset-4"
      href="https://github.com/KennanHunter/learnrobotics.dev"
      target="_blank"
      rel="noreferrer"
    >
      github.com/KennanHunter/learnrobotics.dev
    </a>
    .
  </p>
);
