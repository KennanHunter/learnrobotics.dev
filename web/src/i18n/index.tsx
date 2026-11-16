import type { Component } from "solid-js";
import { locales, type Locale } from "~/paraglide/runtime";
import { m } from "~/paraglide/messages";

export type LanguageCode = Locale;

export type LanguageEntry = {
  label: string;
  flag: string;
  description: Component;
};

const EnglishDescription: Component = () => (
  <div class="space-y-2 text-sm">
    <p class="font-medium">{m.settings_lang_support_full()}</p>
    <p>{m.settings_lang_english_body()}</p>
  </div>
);

const PirateDescription: Component = () => (
  <div class="space-y-2 text-sm">
    <p class="font-medium">{m.settings_lang_support_experimental()}</p>
    <p>{m.settings_lang_pirate_body()}</p>
  </div>
);

const META: Record<Locale, LanguageEntry> = {
  en: { label: "English", flag: "🇺🇸", description: EnglishDescription },
  pirate: { label: "Pirate", flag: "🏴‍☠️", description: PirateDescription },
};

export const LANGUAGES = META;

export const LANGUAGE_CODES = locales as readonly LanguageCode[];

export function isLanguageCode(v: string): v is LanguageCode {
  return (LANGUAGE_CODES as readonly string[]).includes(v);
}

export const UnsupportedLanguagesNotice: Component = () => (
  <p class="text-sm leading-relaxed">
    {m.settings_lang_unsupported_notice_prefix()}
    <a
      class="text-blue underline underline-offset-4"
      href="https://github.com/KennanHunter/learnrobotics.dev"
      target="_blank"
      rel="noreferrer"
    >
      github.com/KennanHunter/learnrobotics.dev
    </a>
    {m.settings_lang_unsupported_notice_suffix()}
  </p>
);
