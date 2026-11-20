export type FormatLanguage = "java" | "markdown";

export async function formatSource(
  source: string,
  language: FormatLanguage,
  tabSize: number,
): Promise<string> {
  const { format } = await import("prettier/standalone");
  if (language === "java") {
    const plugin = await import("prettier-plugin-java");
    return format(source, {
      parser: "java",
      // prettier-plugin-java ships CJS; the default export is the plugin.
      plugins: [(plugin as { default?: unknown }).default ?? plugin],
      tabWidth: tabSize,
      useTabs: false,
    });
  }
  const md = await import("prettier/plugins/markdown");
  return format(source, {
    parser: "markdown",
    plugins: [md],
    tabWidth: tabSize,
    useTabs: false,
  });
}
