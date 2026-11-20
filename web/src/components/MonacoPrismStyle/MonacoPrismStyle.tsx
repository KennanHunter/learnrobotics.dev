import { useTheme } from "@learnrobotics/db";
import {
  autoThemeFor,
  prismCssForTheme,
  type ThemeId,
} from "~/lib/monaco-themes";

// Restyles Prism-highlighted MDX code blocks to match the user's selected
// Monaco theme. Emits a <style> tag; rules in web/src/styles.css /
// packages/editor/src/Mdx/prism-theme.css remain the fallback for built-in
// themes with no theme data (vs, vs-dark, hc-*).
export function MonacoPrismStyle() {
  const { effectiveTheme, monacoTheme } = useTheme();
  const activeId = (): ThemeId =>
    (monacoTheme() as ThemeId | null) ?? autoThemeFor(effectiveTheme());
  return <style innerHTML={prismCssForTheme(activeId())} />;
}
