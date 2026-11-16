import type * as monacoEditor from "monaco-editor";
import type { Monaco } from "@monaco-editor/loader";

export type ThemeEntry = {
  id: string;
  label: string;
  base: "vs" | "vs-dark" | "hc-black" | "hc-light";
  data?: monacoEditor.editor.IStandaloneThemeData;
  autoFor?: "light" | "dark";
};

export const THEMES = {
  vs: {
    id: "vs",
    label: "Visual Studio Light",
    base: "vs",
    autoFor: "light",
  },
  "vs-dark": {
    id: "vs-dark",
    label: "Visual Studio Dark",
    base: "vs-dark",
    autoFor: "dark",
  },
  "hc-light": {
    id: "hc-light",
    label: "High Contrast Light",
    base: "hc-light",
  },
  "hc-black": {
    id: "hc-black",
    label: "High Contrast Dark",
    base: "hc-black",
  },
  "one-dark": {
    id: "one-dark",
    label: "One Dark",
    base: "vs-dark",
    data: {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "5c6370", fontStyle: "italic" },
        { token: "keyword", foreground: "c678dd" },
        { token: "string", foreground: "98c379" },
        { token: "number", foreground: "d19a66" },
        { token: "type", foreground: "e5c07b" },
        { token: "type.identifier", foreground: "e5c07b" },
        { token: "identifier", foreground: "e06c75" },
        { token: "delimiter", foreground: "abb2bf" },
      ],
      colors: {
        "editor.background": "#282c34",
        "editor.foreground": "#abb2bf",
        "editorLineNumber.foreground": "#4b5263",
        "editorLineNumber.activeForeground": "#abb2bf",
        "editorCursor.foreground": "#528bff",
        "editor.selectionBackground": "#3e4451",
        "editor.lineHighlightBackground": "#2c313c",
      },
    },
  },
  "night-owl": {
    id: "night-owl",
    label: "Night Owl",
    base: "vs-dark",
    data: {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "637777", fontStyle: "italic" },
        { token: "keyword", foreground: "c792ea" },
        { token: "string", foreground: "ecc48d" },
        { token: "number", foreground: "f78c6c" },
        { token: "type", foreground: "ffcb8b" },
        { token: "type.identifier", foreground: "ffcb8b" },
        { token: "identifier", foreground: "82aaff" },
        { token: "delimiter", foreground: "d6deeb" },
      ],
      colors: {
        "editor.background": "#011627",
        "editor.foreground": "#d6deeb",
        "editorLineNumber.foreground": "#4b6479",
        "editorLineNumber.activeForeground": "#c5e4fd",
        "editorCursor.foreground": "#80a4c2",
        "editor.selectionBackground": "#1d3b53",
        "editor.lineHighlightBackground": "#0b2942",
      },
    },
  },
  "solarized-light": {
    id: "solarized-light",
    label: "Solarized Light",
    base: "vs",
    data: {
      base: "vs",
      inherit: true,
      rules: [
        { token: "comment", foreground: "93a1a1", fontStyle: "italic" },
        { token: "keyword", foreground: "859900" },
        { token: "string", foreground: "2aa198" },
        { token: "number", foreground: "d33682" },
        { token: "type", foreground: "b58900" },
        { token: "type.identifier", foreground: "b58900" },
        { token: "identifier", foreground: "268bd2" },
        { token: "delimiter", foreground: "657b83" },
      ],
      colors: {
        "editor.background": "#fdf6e3",
        "editor.foreground": "#657b83",
        "editorLineNumber.foreground": "#93a1a1",
        "editorLineNumber.activeForeground": "#586e75",
        "editorCursor.foreground": "#586e75",
        "editor.selectionBackground": "#eee8d5",
        "editor.lineHighlightBackground": "#eee8d5",
      },
    },
  },
} as const satisfies Record<string, ThemeEntry>;

export type ThemeId = keyof typeof THEMES;

export const THEME_IDS = Object.keys(THEMES) as ThemeId[];

export function registerThemes(monaco: Monaco) {
  for (const t of Object.values(THEMES)) {
    if (t.data) monaco.editor.defineTheme(t.id, t.data);
  }
}

export function autoThemeFor(app: "light" | "dark"): ThemeId {
  const match = Object.values(THEMES).find((t) => t.autoFor === app);
  return (match?.id ?? (app === "dark" ? "vs-dark" : "vs")) as ThemeId;
}
