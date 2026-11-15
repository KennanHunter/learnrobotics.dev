import type { Component } from "solid-js";
import type { LanguageCode } from "./languages";

export const LANGUAGE_DESCRIPTIONS: Record<LanguageCode, Component> = {
  en: () => <p class="text-sm">All content supported.</p>,
};

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
