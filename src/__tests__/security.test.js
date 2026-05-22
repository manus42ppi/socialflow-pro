// ── src/__tests__/security.test.js ───────────────────────────────────────────
// Security regression tests for SocialFlow Pro.
//
// Scope:
//  A. Template XSS — spark-templates.js esc() + renderTemplate()
//  B. URL injection — javascript: protocol in href attributes
//  C. buildEmailScript — JSON.stringify-based URL injection
//  D. Workspace access control — DEMO_WORKSPACE_MEMBERS authorisation matrix
//  E. pdfMode strictness — only exact "direct" triggers download link
//  F. LINK_GUARD runtime defence — postProcessHtml injects href interceptor
//
// Out of scope: Cloudflare Function auth (requires live KV / Clerk JWT).

import { describe, it, expect } from "vitest";
import {
  renderTemplate,
  buildEmailScript,
  TEMPLATES,
} from "../utils/spark-templates.js";
import { postProcessHtml } from "../utils/spark.js";
import { DEMO_WORKSPACE_MEMBERS, DEMO_WORKSPACES } from "../constants/demo.js";

// ─── helpers ────────────────────────────────────────────────────────────────

/** Minimal valid content object accepted by all templates */
function minimalContent(overrides = {}) {
  return {
    nav:      { logo: "TestBrand", links: [] },
    hero:     { headline: "Headline", subtext: "Sub", cta1: "CTA", cta2: "More", image: null },
    features: { label: "L", headline: "H", items: [] },
    themes:   { label: "L", headline: "H", items: [] },
    stats:    [],                                         // array of { num, desc }
    about:    { label: "L", headline: "H", text: "T", image: null },
    quote:    { text: "Q", author: "A", role: "R" },
    cta:      { label: "L", headline: "H", subtext: "S", buttonText: "Go" },
    footer:   { brand: "Brand", links: [], legal: "Legal" },
    colors:   { primary: "#2563EB", dark: "#1E3A8A" },
    ...overrides,
  };
}

/** Get the first available template id */
const FIRST_TEMPLATE = TEMPLATES[0]?.id ?? "editorial";

// ─── A. Template XSS ─────────────────────────────────────────────────────────

describe("A — Template XSS: esc() sanitises user-controlled fields", () => {
  const XSS_TAG    = '<script>alert("xss")</script>';
  const XSS_ATTR   = '"><img src=x onerror=alert(1)>';
  const XSS_ENTITY = "<b>bold</b>&amp;";

  it("escapes <script> injection in hero headline", () => {
    const html = renderTemplate(
      FIRST_TEMPLATE,
      minimalContent({ hero: { headline: XSS_TAG, subtext: "s", cta1: "c", cta2: "c2", img: null } }),
    );
    expect(html).not.toContain("<script>alert");
    expect(html).toContain("&lt;script&gt;");
  });

  it("escapes attribute-breaking payload in hero subtext", () => {
    const html = renderTemplate(
      FIRST_TEMPLATE,
      minimalContent({ hero: { headline: "H", subtext: XSS_ATTR, cta1: "c", cta2: "c2", image: null } }),
    );
    // <img tag must be escaped — no live img element injected
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;img');
    // The injected " becomes &quot; — attribute value is not broken
    expect(html).toContain('&quot;');
  });

  it("escapes HTML entities in nav logo", () => {
    const html = renderTemplate(
      FIRST_TEMPLATE,
      minimalContent({ nav: { logo: XSS_ENTITY, links: [] } }),
    );
    expect(html).not.toContain("<b>bold</b>");
    expect(html).toContain("&lt;b&gt;");
  });

  it("escapes CTA button text", () => {
    const html = renderTemplate(
      FIRST_TEMPLATE,
      minimalContent({ cta: { label: "L", headline: "H", subtext: "S", buttonText: XSS_TAG } }),
    );
    expect(html).not.toContain("<script>alert");
    expect(html).toContain("&lt;script&gt;");
  });

  it("escapes footer brand name", () => {
    const html = renderTemplate(
      FIRST_TEMPLATE,
      minimalContent({ footer: { brand: XSS_TAG, links: [], legal: "Legal" } }),
    );
    expect(html).not.toContain("<script>alert");
  });

  it("escapes card title and text", () => {
    const html = renderTemplate(
      FIRST_TEMPLATE,
      minimalContent({
        cards: {
          label: "L", headline: "H",
          items: [{ title: XSS_TAG, text: XSS_ATTR }],
        },
      }),
    );
    expect(html).not.toContain("<script>alert");
    expect(html).not.toContain("onerror=alert");
  });

  it("escapes quote text and author", () => {
    const html = renderTemplate(
      FIRST_TEMPLATE,
      minimalContent({ quote: { text: XSS_TAG, author: XSS_ATTR, role: "R" } }),
    );
    expect(html).not.toContain("<script>alert");
    // No live img element — must be escaped
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;img');
  });
});

// ─── B. URL injection ─────────────────────────────────────────────────────────

describe("B — URL injection: javascript: protocol handling", () => {
  // esc() does NOT strip javascript: (no <, >, " to escape).
  // Defence is postProcessHtml's LINK_GUARD at runtime — these tests document
  // the current behaviour and ensure LINK_GUARD is always injected.

  it("direct-mode href contains esc()d dossierPdfUrl", () => {
    const url  = "https://example.com/doc.pdf";
    const html = renderTemplate(FIRST_TEMPLATE, minimalContent(), url, "", "direct");
    expect(html).toContain(`href="${url}"`);
  });

  it("dossierPdfUrl with quotes is attribute-escaped", () => {
    const url  = 'https://x.com/d.pdf"onclick=alert(1)';
    const html = renderTemplate(FIRST_TEMPLATE, minimalContent(), url, "", "direct");
    // The injected " is &quot; — onclick is part of the href VALUE, not a standalone attr
    expect(html).not.toMatch(/\sonclick\s*=/);  // no free-standing onclick attribute
    expect(html).toContain("&quot;");
  });

  it("ctaUrl with quotes is attribute-escaped", () => {
    const url  = 'https://x.com/p"onclick=alert(2)';
    const html = renderTemplate(FIRST_TEMPLATE, minimalContent(), "", url);
    expect(html).not.toMatch(/\sonclick\s*=/);  // no free-standing onclick attribute
    expect(html).toContain("&quot;");
  });

  it("javascript: in dossierPdfUrl is rendered but LINK_GUARD is injected", () => {
    const url  = "javascript:alert(1)";
    const raw  = renderTemplate(FIRST_TEMPLATE, minimalContent(), url, "", "direct");
    // After postProcessHtml the LINK_GUARD intercepts the href at runtime
    const html = postProcessHtml(raw);
    expect(html).toContain("startsWith('javascript')");  // LINK_GUARD present
  });

  it("javascript: in ctaUrl is rendered but LINK_GUARD is injected", () => {
    const url  = "javascript:alert(2)";
    const raw  = renderTemplate(FIRST_TEMPLATE, minimalContent(), "", url);
    const html = postProcessHtml(raw);
    expect(html).toContain("startsWith('javascript')");
  });

  it("LINK_GUARD is always injected by postProcessHtml regardless of url", () => {
    const html = postProcessHtml(renderTemplate(FIRST_TEMPLATE, minimalContent()));
    expect(html).toContain("Spark link guard");
    expect(html).toContain("startsWith('javascript')");
  });
});

// ─── C. buildEmailScript ──────────────────────────────────────────────────────

describe("C — buildEmailScript: URL injection via JSON.stringify", () => {
  it("returns empty string for falsy pdfUrl", () => {
    expect(buildEmailScript("")).toBe("");
    expect(buildEmailScript(null)).toBe("");
    expect(buildEmailScript(undefined)).toBe("");
  });

  it("serialises normal URL safely", () => {
    const script = buildEmailScript("https://example.com/doc.pdf");
    expect(script).toContain('"https://example.com/doc.pdf"');
    expect(script).toContain("window.open(U,");
  });

  it("JSON.stringify escapes double-quotes in URL", () => {
    const script = buildEmailScript('https://x.com/d.pdf"});alert(1)//"');
    // JSON.stringify wraps in quotes and escapes internal quotes
    expect(script).not.toContain('");alert(1)');
    expect(script).toContain('\\"');
  });

  it("escapes </script> in URL to prevent script-tag breakout", () => {
    const script = buildEmailScript("https://x.com/</script><script>alert(1)");
    // Raw </script> inside a <script> block would close the tag early.
    // The fix replaces </ with <\/ so the HTML parser sees no closing tag.
    expect(script).not.toMatch(/<\/script>\s*<script>/i);
    expect(script).toContain("<\\/script>");  // </ escaped to <\/
  });

  it("JSON.stringify escapes newlines in URL", () => {
    const script = buildEmailScript("https://x.com/d.pdf\nalert(1)");
    expect(script).not.toContain("\nalert(1)");
  });
});

// ─── D. Workspace access control ─────────────────────────────────────────────

describe("D — Workspace access control: DEMO_WORKSPACE_MEMBERS", () => {
  function workspacesForUser(userId) {
    return DEMO_WORKSPACE_MEMBERS
      .filter(m => m.userId === userId)
      .map(m => m.workspaceId);
  }

  const ALL_IDS = DEMO_WORKSPACES.map(w => w.id);

  it("admin (user 1) has access to all workspaces", () => {
    const ids = workspacesForUser("1");
    ALL_IDS.forEach(id => expect(ids).toContain(id));
  });

  it("editor (user 2) has access to ppi-media and ppi-n3xt only", () => {
    const ids = workspacesForUser("2");
    expect(ids).toContain("ws-ppi-media");
    expect(ids).toContain("ws-ppi-n3xt");
    expect(ids).not.toContain("ws-ppi-talk");
    expect(ids).not.toContain("ws-alphabeta");
  });

  it("viewer (user 3) has access to ppi-talk only", () => {
    const ids = workspacesForUser("3");
    expect(ids).toContain("ws-ppi-talk");
    expect(ids).not.toContain("ws-ppi-media");
    expect(ids).not.toContain("ws-ppi-n3xt");
    expect(ids).not.toContain("ws-alphabeta");
  });

  it("unknown user has no workspace access", () => {
    expect(workspacesForUser("999")).toHaveLength(0);
    expect(workspacesForUser("")).toHaveLength(0);
  });

  it("each workspace in DEMO_WORKSPACES has at least one member", () => {
    ALL_IDS.forEach(id => {
      const members = DEMO_WORKSPACE_MEMBERS.filter(m => m.workspaceId === id);
      expect(members.length).toBeGreaterThan(0);
    });
  });

  it("no duplicate memberships (user+workspace combination is unique)", () => {
    const keys = DEMO_WORKSPACE_MEMBERS.map(m => `${m.userId}:${m.workspaceId}`);
    const unique = new Set(keys);
    expect(unique.size).toBe(keys.length);
  });

  it("roles are one of: admin | editor | viewer", () => {
    const VALID = new Set(["admin", "editor", "viewer"]);
    DEMO_WORKSPACE_MEMBERS.forEach(m => {
      expect(VALID.has(m.role)).toBe(true);
    });
  });
});

// ─── E. pdfMode strictness ────────────────────────────────────────────────────

describe("E — pdfMode: only exact 'direct' triggers download link", () => {
  const PDF_URL = "https://example.com/dossier.pdf";

  it("pdfMode='direct' → direct download link (no email form)", () => {
    const html = renderTemplate(FIRST_TEMPLATE, minimalContent(), PDF_URL, "", "direct");
    expect(html).toContain(`href="${PDF_URL}"`);
    expect(html).not.toContain('type="email"');
  });

  it("pdfMode='email' → email capture form (no direct link)", () => {
    const html = renderTemplate(FIRST_TEMPLATE, minimalContent(), PDF_URL, "", "email");
    expect(html).not.toContain(`href="${PDF_URL}"`);
    expect(html).toContain('type="email"');
  });

  it("pdfMode=undefined → email capture form (safe default)", () => {
    const html = renderTemplate(FIRST_TEMPLATE, minimalContent(), PDF_URL, "");
    expect(html).not.toContain(`href="${PDF_URL}"`);
    expect(html).toContain('type="email"');
  });

  it("pdfMode='DIRECT' (wrong case) → email capture form, no bypass", () => {
    const html = renderTemplate(FIRST_TEMPLATE, minimalContent(), PDF_URL, "", "DIRECT");
    expect(html).not.toContain(`href="${PDF_URL}"`);
    expect(html).toContain('type="email"');
  });

  it("pdfMode='direct' without dossierPdfUrl → no link and no broken form", () => {
    const html = renderTemplate(FIRST_TEMPLATE, minimalContent(), "", "", "direct");
    // No PDF URL → ctaUrl also empty → fallback button rendered
    expect(html).toContain('href="#"');
    expect(html).not.toContain('type="email"');
  });

  it("all registered template ids render without throwing", () => {
    TEMPLATES.forEach(({ id }) => {
      expect(() =>
        renderTemplate(id, minimalContent(), PDF_URL, "", "direct")
      ).not.toThrow();
    });
  });
});

// ─── F. LINK_GUARD idempotency & content ──────────────────────────────────────

describe("F — LINK_GUARD runtime defence", () => {
  it("LINK_GUARD checks for javascript: protocol", () => {
    const html = postProcessHtml(renderTemplate(FIRST_TEMPLATE, minimalContent()));
    expect(html).toContain("startsWith('javascript')");
  });

  it("postProcessHtml is idempotent — double-processing doesn't duplicate guard", () => {
    const once  = postProcessHtml(renderTemplate(FIRST_TEMPLATE, minimalContent()));
    const twice = postProcessHtml(once);
    const count = (str, sub) => str.split(sub).length - 1;
    expect(count(twice, "Spark link guard")).toBe(1);
  });

  it("LINK_GUARD intercepts clicks, not navigation (click event only)", () => {
    const html = postProcessHtml(renderTemplate(FIRST_TEMPLATE, minimalContent()));
    expect(html).toContain("addEventListener('click'");
  });
});
