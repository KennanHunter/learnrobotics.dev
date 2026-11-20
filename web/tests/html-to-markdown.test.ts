// Unit tests for the HTMLRewriter-based HTML → Markdown converter.
// Runs under the `cloudflareTest` vitest project so the native
// `HTMLRewriter` global is available (it's a workerd built-in).

import { describe, it, expect } from "vitest";
import { htmlToMarkdown } from "~/lib/html-to-markdown";

async function md(html: string): Promise<string> {
  return (await htmlToMarkdown(html)).trim();
}

describe("htmlToMarkdown — headings", () => {
  it("converts each heading level", async () => {
    expect(await md("<h1>A</h1>")).toBe("# A");
    expect(await md("<h2>A</h2>")).toBe("## A");
    expect(await md("<h3>A</h3>")).toBe("### A");
    expect(await md("<h4>A</h4>")).toBe("#### A");
    expect(await md("<h5>A</h5>")).toBe("##### A");
    expect(await md("<h6>A</h6>")).toBe("###### A");
  });

  it("separates consecutive headings with a blank line", async () => {
    expect(await md("<h1>A</h1><h2>B</h2>")).toBe("# A\n\n## B");
  });
});

describe("htmlToMarkdown — paragraphs and inline formatting", () => {
  it("renders a plain paragraph", async () => {
    expect(await md("<p>Hello world</p>")).toBe("Hello world");
  });

  it("wraps emphasis with underscores", async () => {
    expect(await md("<p>Hello <em>world</em></p>")).toBe("Hello _world_");
  });

  it("treats <i> as emphasis", async () => {
    expect(await md("<p>Hello <i>world</i></p>")).toBe("Hello _world_");
  });

  it("wraps strong with double asterisks", async () => {
    expect(await md("<p>Hello <strong>world</strong></p>")).toBe(
      "Hello **world**",
    );
  });

  it("treats <b> as strong", async () => {
    expect(await md("<p>Hello <b>world</b></p>")).toBe("Hello **world**");
  });

  it("supports nested emphasis inside strong", async () => {
    expect(
      await md("<p><strong>loud and <em>italicized</em></strong></p>"),
    ).toBe("**loud and _italicized_**");
  });
});

describe("htmlToMarkdown — links", () => {
  it("renders an inline link", async () => {
    expect(await md('<p>See <a href="/docs">the docs</a>.</p>')).toBe(
      "See [the docs](/docs).",
    );
  });

  it("handles a link with an empty href", async () => {
    expect(await md("<p><a>bare</a></p>")).toBe("[bare]()");
  });

  it("preserves absolute URLs", async () => {
    expect(await md('<p><a href="https://example.com/x">example</a></p>')).toBe(
      "[example](https://example.com/x)",
    );
  });
});

describe("htmlToMarkdown — code", () => {
  it("renders inline code with backticks", async () => {
    expect(await md("<p>Call <code>foo()</code></p>")).toBe("Call `foo()`");
  });

  it("renders a fenced block from language-* class", async () => {
    const html = '<pre><code class="language-java">class Foo {}</code></pre>';
    expect(await md(html)).toBe("```java\nclass Foo {}\n```");
  });

  it("strips Prism token spans from a highlighted block", async () => {
    const html =
      '<pre><code class="language-java">' +
      '<span class="token keyword">class</span>' +
      '<span class="token"> </span>' +
      "Foo {}" +
      "</code></pre>";
    expect(await md(html)).toBe("```java\nclass Foo {}\n```");
  });

  it("falls back to inline code when no language class is present", async () => {
    expect(await md("<pre><code>plain</code></pre>")).toBe("`plain`");
  });
});

describe("htmlToMarkdown — lists", () => {
  it("renders an unordered list", async () => {
    expect(await md("<ul><li>A</li><li>B</li></ul>")).toBe("- A\n- B");
  });

  it("renders an ordered list with 1-based numbering", async () => {
    expect(await md("<ol><li>A</li><li>B</li><li>C</li></ol>")).toBe(
      "1. A\n2. B\n3. C",
    );
  });

  it("indents nested lists", async () => {
    const html =
      "<ul>" +
      "<li>Outer A" +
      "<ul><li>Inner 1</li><li>Inner 2</li></ul>" +
      "</li>" +
      "<li>Outer B</li>" +
      "</ul>";
    expect(await md(html)).toBe(
      "- Outer A\n  - Inner 1\n  - Inner 2\n- Outer B",
    );
  });

  it("mixes ordered inside unordered", async () => {
    const html =
      "<ul>" +
      "<li>Setup" +
      "<ol><li>Install</li><li>Configure</li></ol>" +
      "</li>" +
      "</ul>";
    expect(await md(html)).toBe("- Setup\n  1. Install\n  2. Configure");
  });
});

describe("htmlToMarkdown — blocks", () => {
  it("renders a blockquote", async () => {
    expect(await md("<blockquote>Quoted</blockquote>")).toBe("> Quoted");
  });

  it("renders a horizontal rule", async () => {
    expect(await md("<p>before</p><hr><p>after</p>")).toBe(
      "before\n\n---\n\nafter",
    );
  });

  it("renders an image with alt text", async () => {
    expect(await md('<p><img src="/a.png" alt="A diagram"></p>')).toBe(
      "![A diagram](/a.png)",
    );
  });

  it("renders an image with no alt", async () => {
    expect(await md('<p><img src="/a.png"></p>')).toBe("![](/a.png)");
  });

  it("emits a hard-break for <br>", async () => {
    // Backslash form is a valid CommonMark hard break; chosen because it
    // survives our trailing-whitespace normalization.
    expect(await md("<p>one<br>two</p>")).toBe("one\\\ntwo");
  });
});

describe("htmlToMarkdown — end-to-end", () => {
  it("round-trips a realistic lesson fragment", async () => {
    const html =
      "<h2>Variables</h2>" +
      "<p>A <strong>variable</strong> stores a value. For example:</p>" +
      '<pre><code class="language-java">int score = 10;</code></pre>' +
      '<p>Read more in <a href="/units/variables">the next lesson</a>.</p>';
    expect(await md(html)).toBe(
      [
        "## Variables",
        "",
        "A **variable** stores a value. For example:",
        "",
        "```java",
        "int score = 10;",
        "```",
        "",
        "Read more in [the next lesson](/units/variables).",
      ].join("\n"),
    );
  });

  it("collapses runs of blank lines to a single blank line", async () => {
    expect(await md("<h1>A</h1><p>B</p><p>C</p>")).toBe("# A\n\nB\n\nC");
  });

  it("always ends with exactly one trailing newline", async () => {
    const full = await htmlToMarkdown("<p>hello</p>");
    expect(full.endsWith("\n")).toBe(true);
    expect(full.endsWith("\n\n")).toBe(false);
  });
});
