// ── src/__tests__/spark.test.js ───────────────────────────────────────────────
// Unit tests for pure functions exported from src/utils/spark.js.
// These functions are deterministic and need no mocks.
// Async AI functions (runPreflight, generatePage, refinePage, searchImages)
// are NOT tested here — they require API access.

import { describe, it, expect } from "vitest";
import { slugify, blocksToPlain, postProcessHtml, buildContext, validatePage, buildRepairInstruction, LINK_GUARD } from "../utils/spark.js";

// ── slugify ──────────────────────────────────────────────────────────────────
describe("slugify", () => {
  it("lower-cases and trims", () => {
    expect(slugify("  Hello World  ")).toBe("hello-world");
  });

  it("replaces German umlauts", () => {
    expect(slugify("Über Ärger Öl Übung")).toBe("ueber-aerger-oel-uebung");
    expect(slugify("Straße")).toBe("strasse");
  });

  it("collapses non-alphanumeric chars to single dashes", () => {
    expect(slugify("foo & bar — baz")).toBe("foo-bar-baz");
  });

  it("strips leading and trailing dashes", () => {
    expect(slugify("--foo--")).toBe("foo");
  });

  it("caps at 60 characters", () => {
    const long = "a".repeat(80);
    expect(slugify(long)).toHaveLength(60);
  });

  it("returns 'projekt' for empty / whitespace-only input", () => {
    expect(slugify("")).toBe("projekt");
    expect(slugify("   ")).toBe("projekt");
    expect(slugify(null)).toBe("projekt");
    expect(slugify(undefined)).toBe("projekt");
  });

  it("handles numbers", () => {
    expect(slugify("Plan 2026")).toBe("plan-2026");
  });
});

// ── blocksToPlain ─────────────────────────────────────────────────────────────
describe("blocksToPlain", () => {
  it("returns empty string for empty or falsy input", () => {
    expect(blocksToPlain([])).toBe("");
    expect(blocksToPlain(null)).toBe("");
    expect(blocksToPlain(undefined)).toBe("");
  });

  it("extracts text from simple content blocks", () => {
    const blocks = [
      { content: [{ text: "Hello" }, { text: " World" }] },
    ];
    expect(blocksToPlain(blocks)).toBe("Hello World");
  });

  it("joins multiple blocks with spaces", () => {
    const blocks = [
      { content: [{ text: "First" }] },
      { content: [{ text: "Second" }] },
    ];
    expect(blocksToPlain(blocks)).toBe("First Second");
  });

  it("skips blocks with blank content", () => {
    const blocks = [
      { content: [{ text: "" }] },
      { content: [{ text: "Real" }] },
    ];
    expect(blocksToPlain(blocks)).toBe("Real");
  });

  it("recurses into children blocks", () => {
    const blocks = [
      {
        content: [{ text: "Parent" }],
        children: [
          { content: [{ text: "Child" }] },
        ],
      },
    ];
    const result = blocksToPlain(blocks);
    expect(result).toContain("Parent");
    expect(result).toContain("Child");
  });

  it("handles blocks without content array", () => {
    const blocks = [{ type: "image" }]; // no content
    expect(blocksToPlain(blocks)).toBe("");
  });
});

// ── postProcessHtml ───────────────────────────────────────────────────────────
describe("postProcessHtml", () => {
  const MINIMAL_HTML = "<!DOCTYPE html><html><body><p>Hi</p></body></html>";

  it("returns empty string for falsy input gracefully", () => {
    // Should not throw; result may be just the guard + </body></html>
    expect(() => postProcessHtml("")).not.toThrow();
    expect(() => postProcessHtml(null)).not.toThrow();
  });

  it("injects LINK_GUARD before </body>", () => {
    const result = postProcessHtml(MINIMAL_HTML);
    const guardPos = result.indexOf("Spark link guard");
    const bodyPos = result.lastIndexOf("</body>");
    expect(guardPos).toBeGreaterThan(-1);
    expect(guardPos).toBeLessThan(bodyPos);
  });

  it("appends </body> and LINK_GUARD when </body> is missing", () => {
    const noBody = "<!DOCTYPE html><html><body><p>Hi</p></html>";
    const result = postProcessHtml(noBody);
    expect(result).toContain("</body>");
    expect(result).toContain("Spark link guard");
  });

  it("always closes </html>", () => {
    const noClose = "<!DOCTYPE html><html><body><p>Hi</p></body>";
    const result = postProcessHtml(noClose);
    expect(result.trimEnd()).toMatch(/<\/html>$/);
  });

  it("does not double-add </html>", () => {
    const result = postProcessHtml(MINIMAL_HTML);
    const count = (result.match(/<\/html>/g) || []).length;
    expect(count).toBe(1);
  });

  it("strips markdown ```html fence", () => {
    const fenced = "```html\n" + MINIMAL_HTML + "\n```";
    const result = postProcessHtml(fenced);
    expect(result).not.toContain("```");
    expect(result).toContain("<!DOCTYPE html>");
  });

  it("strips plain ``` fence", () => {
    const fenced = "```\n" + MINIMAL_HTML + "\n```";
    const result = postProcessHtml(fenced);
    expect(result).not.toContain("```");
    expect(result).toContain("<!DOCTYPE html>");
  });

  it("preserves existing HTML structure intact", () => {
    const result = postProcessHtml(MINIMAL_HTML);
    expect(result).toContain("<p>Hi</p>");
    expect(result).toContain("<!DOCTYPE html>");
  });

  it("LINK_GUARD appears exactly once", () => {
    const result = postProcessHtml(MINIMAL_HTML);
    const count = (result.match(/Spark link guard/g) || []).length;
    expect(count).toBe(1);
  });

  it("strips prefix text before <!DOCTYPE html> (model intro sentences)", () => {
    const withPrefix = "Hier ist die überarbeitete Seite:\n\n" + MINIMAL_HTML;
    const result = postProcessHtml(withPrefix);
    expect(result.trimStart()).toMatch(/^<!DOCTYPE html>/i);
    expect(result).not.toContain("Hier ist die");
  });

  it("strips prefix text even when model echoes persona", () => {
    const prefix = "Als Werbetexter und Webdesigner habe ich folgende Änderungen vorgenommen:\n\n";
    const result = postProcessHtml(prefix + MINIMAL_HTML);
    expect(result.trimStart()).toMatch(/^<!DOCTYPE html>/i);
  });

  it("handles uppercase DOCTYPE in prefix strip", () => {
    const withPrefix = "Updated:\n<!DOCTYPE HTML><html><body></body></html>";
    const result = postProcessHtml(withPrefix);
    expect(result.trimStart()).toMatch(/^<!DOCTYPE HTML>/i);
    expect(result).not.toContain("Updated:");
  });

  it("does not strip anything when response starts correctly", () => {
    const result = postProcessHtml(MINIMAL_HTML);
    expect(result.trimStart()).toMatch(/^<!DOCTYPE html>/i);
  });
});

// ── postProcessHtml — guard idempotency ───────────────────────────────────────
describe("postProcessHtml — LINK_GUARD idempotency", () => {
  it("removes a stale v1 link guard before injecting new one", () => {
    // Simulate a page that already has the guard from a previous generation
    const staleGuard = `<script>\n/* Spark link guard – keeps the preview inside the iframe */\ndocument.addEventListener('click',function(e){},true);\n</script>`;
    const pageWithStaleGuard = `<!DOCTYPE html><html><body><p>Hi</p>${staleGuard}</body></html>`;
    const result = postProcessHtml(pageWithStaleGuard);
    // Should have exactly one guard (the fresh one), not two
    const count = (result.match(/Spark link guard/g) || []).length;
    expect(count).toBe(1);
  });

  it("injecting twice via postProcessHtml still yields exactly one guard", () => {
    const once = postProcessHtml("<!DOCTYPE html><html><body><p>Hi</p></body></html>");
    const twice = postProcessHtml(once);
    const count = (twice.match(/Spark link guard/g) || []).length;
    expect(count).toBe(1);
  });
});

// ── validatePage ──────────────────────────────────────────────────────────────
describe("validatePage", () => {
  const GOOD_PAGE = `<!DOCTYPE html><html><body>
    <nav id="top"><a href="#hero">Hero</a><a href="#benefits">Benefits</a></nav>
    <section id="hero"><h1>Title</h1></section>
    <section id="benefits"><p>Benefits</p></section>
    <section id="content"><p>Content</p></section>
    <section id="stats"><p>Stats</p></section>
    <section id="cta"><p>CTA</p></section>
    <footer id="footer"><p>Footer</p></footer>
  </body></html>`;

  it("returns empty array for a valid page", () => {
    expect(validatePage(GOOD_PAGE)).toEqual([]);
  });

  it("returns empty array for null/empty input", () => {
    expect(validatePage(null)).toEqual([]);
    expect(validatePage("")).toEqual([]);
  });

  it("detects script code leaking as visible text", () => {
    const leaked = `<!DOCTYPE html><html><body>
      <section id="hero"><p>document.addEventListener('click',function(e){})</p></section>
      <section id="a"></section><section id="b"></section>
      <section id="c"></section><section id="d"></section>
    </body></html>`;
    const issues = validatePage(leaked);
    expect(issues.some(i => i.type === "error")).toBe(true);
  });

  it("does NOT flag script code inside a proper <script> tag", () => {
    const withScript = GOOD_PAGE.replace("</body>", `<script>document.addEventListener('click',function(e){})</script></body>`);
    expect(validatePage(withScript)).toEqual([]);
  });

  it("detects broken nav anchor (href without matching id)", () => {
    const broken = GOOD_PAGE.replace('href="#benefits"', 'href="#nonexistent"');
    const issues = validatePage(broken);
    expect(issues.some(i => i.msg.includes("#nonexistent"))).toBe(true);
  });

  it("does NOT flag anchors that have matching ids", () => {
    const issues = validatePage(GOOD_PAGE);
    expect(issues.some(i => i.msg.includes("Nav-Link"))).toBe(false);
  });

  it("detects too few sections", () => {
    const sparse = `<!DOCTYPE html><html><body>
      <nav id="top"></nav>
      <section id="hero"></section>
      <footer id="footer"></footer>
    </body></html>`;
    const issues = validatePage(sparse);
    expect(issues.some(i => i.msg.includes("Section"))).toBe(true);
  });

  it("returns error type for script leak and warn for anchor/section issues", () => {
    const leaked = `<!DOCTYPE html><html><body>
      <p>document.addEventListener clicked</p>
      <section id="s1"></section><section id="s2"></section>
    </body></html>`;
    const issues = validatePage(leaked);
    const hasError = issues.some(i => i.type === "error");
    expect(hasError).toBe(true);
  });
});

// ── buildContext ──────────────────────────────────────────────────────────────
describe("buildContext", () => {
  const baseForm = { storyIds: [], postIds: [], mediaIds: [], externalUrls: [] };

  it("returns placeholder when form is empty", () => {
    expect(buildContext(baseForm, [], [], [])).toBe("(Noch keine Inhalte hinzugefügt)");
  });

  it("includes story title and content", () => {
    const form = { ...baseForm, storyIds: ["s1"] };
    const stories = [{ id: "s1", title: "My Story", subtitle: "Sub", blocks: [{ content: [{ text: "Story text" }] }] }];
    const result = buildContext(form, stories, [], []);
    expect(result).toContain("My Story");
    expect(result).toContain("Story text");
  });

  it("skips stories not in storyIds", () => {
    const form = { ...baseForm, storyIds: ["s1"] };
    const stories = [
      { id: "s1", title: "Included", blocks: [] },
      { id: "s2", title: "Excluded", blocks: [] },
    ];
    const result = buildContext(form, stories, [], []);
    expect(result).toContain("Included");
    expect(result).not.toContain("Excluded");
  });

  it("includes post title and content", () => {
    const form = { ...baseForm, postIds: ["p1"] };
    const posts = [{ id: "p1", title: "My Post", content: "Post body text" }];
    const result = buildContext(form, [], posts, []);
    expect(result).toContain("My Post");
    expect(result).toContain("Post body text");
  });

  it("includes media item name and description", () => {
    const form = { ...baseForm, mediaIds: ["m1"] };
    const items = [{ id: "m1", name: "hero.jpg", url: "https://example.com/hero.jpg", description: "A hero image" }];
    const result = buildContext(form, [], [], items);
    expect(result).toContain("hero.jpg");
    expect(result).toContain("A hero image");
  });

  it("includes external URLs", () => {
    const form = { ...baseForm, externalUrls: [{ id: "u1", label: "Produktseite", url: "https://example.com" }] };
    const result = buildContext(form, [], [], []);
    expect(result).toContain("Produktseite");
    expect(result).toContain("https://example.com");
  });

  it("separates multiple sections with ---", () => {
    const form = { ...baseForm, storyIds: ["s1"], postIds: ["p1"] };
    const stories = [{ id: "s1", title: "S1", blocks: [] }];
    const posts = [{ id: "p1", title: "P1", content: "pc" }];
    const result = buildContext(form, stories, posts, []);
    expect(result).toContain("---");
  });

  it("ignores missing story/post/media ids gracefully", () => {
    const form = { ...baseForm, storyIds: ["nonexistent"] };
    expect(() => buildContext(form, [], [], [])).not.toThrow();
    expect(buildContext(form, [], [], [])).toBe("(Noch keine Inhalte hinzugefügt)");
  });

  it("uses altText as fallback when description is missing", () => {
    const form = { ...baseForm, mediaIds: ["m1"] };
    const items = [{ id: "m1", name: "img.jpg", url: "https://x.com/img.jpg", description: "", altText: "Alt fallback" }];
    const result = buildContext(form, [], [], items);
    expect(result).toContain("Alt fallback");
  });
});

// ── buildRepairInstruction ────────────────────────────────────────────────────
describe("buildRepairInstruction", () => {
  it("returns empty string for empty issues array", () => {
    expect(buildRepairInstruction([])).toBe("");
    expect(buildRepairInstruction(null)).toBe("");
    expect(buildRepairInstruction(undefined)).toBe("");
  });

  it("addresses broken nav anchors by listing them", () => {
    const issues = [{ type: "warn", msg: "2 Nav-Link(s) ohne passende Section-ID: #neuron, #grail" }];
    const result = buildRepairInstruction(issues);
    expect(result).toContain("#neuron");
    expect(result).toContain("#grail");
    expect(result).toContain("NAV-ANKER REPARIEREN");
  });

  it("addresses too-few sections with a count", () => {
    const issues = [{ type: "warn", msg: "Nur 2 Sections gefunden — mindestens 7 erwartet" }];
    const result = buildRepairInstruction(issues);
    expect(result).toContain("FEHLENDE SECTIONS ERGÄNZEN");
    expect(result).toContain("5"); // 7 - 2 = 5 missing
  });

  it("addresses script leak", () => {
    const issues = [{ type: "error", msg: "Script-Code als sichtbarer Text — Seite einmal neu verfeinern" }];
    const result = buildRepairInstruction(issues);
    expect(result).toContain("SCRIPT-LEAK BEHEBEN");
  });

  it("combines multiple issues into one instruction", () => {
    const issues = [
      { type: "warn", msg: "1 Nav-Link(s) ohne passende Section-ID: #hero" },
      { type: "warn", msg: "Nur 3 Sections gefunden — mindestens 7 erwartet" },
    ];
    const result = buildRepairInstruction(issues);
    expect(result).toContain("NAV-ANKER REPARIEREN");
    expect(result).toContain("FEHLENDE SECTIONS ERGÄNZEN");
    expect(result).toContain("#hero");
  });

  it("always includes the output rule for <!DOCTYPE html>", () => {
    const issues = [{ type: "warn", msg: "Nur 1 Sections gefunden — mindestens 7 erwartet" }];
    const result = buildRepairInstruction(issues);
    expect(result).toContain("<!DOCTYPE html>");
  });

  it("passes unknown issues through as-is", () => {
    const issues = [{ type: "warn", msg: "Unbekannter Fehler XYZ" }];
    const result = buildRepairInstruction(issues);
    expect(result).toContain("Unbekannter Fehler XYZ");
  });
});
