import type { Component } from "solid-js";

export type LanguageEntry = {
  label: string;
  flag: string;
  description: Component;
};

const EnglishDescription: Component = () => (
  <div class="space-y-2 text-sm">
    <p class="font-medium">Support level: Full</p>
    <p>All lessons, UI, and documentation are available in English.</p>
  </div>
);

const PirateDescription: Component = () => (
  <div class="space-y-2 text-sm">
    <p class="font-medium">Support level: Experimental</p>
    <p>
      Arrr, this here be a test, a mighty voyage across the briny deep, or
      somethin' like it, to make certain the translatin' riggin' holds fast for
      every last lesson aboard this vessel.
    </p>
  </div>
);

export const LANGUAGES = {
  en: {
    label: "English",
    flag: "🇺🇸",
    description: EnglishDescription,
  },
  pirate: {
    label: "Pirate",
    flag: "🏴‍☠️",
    description: PirateDescription,
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
