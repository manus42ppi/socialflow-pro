// ── src/__tests__/spark.test.js ───────────────────────────────────────────────
// Unit tests for pure functions exported from src/utils/spark.js.
// These functions are deterministic and need no mocks.
// Async AI functions (runPreflight, generatePage, refinePage, searchImages)
// are NOT tested here — they require API access.

import { describe, it, expect } from "vitest";
import { slugify, blocksToPlain, postProcessHtml, buildContext, LINK_GUARD } from "../utils/spark.js";

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
