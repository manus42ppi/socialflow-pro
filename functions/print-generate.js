// Cloudflare Pages Function — POST /print-generate
// Neue Architektur: KI liefert JSON-Plan, Template-Module generieren Typst

import { buildCoverPage } from './print-templates/cover.js';
import { buildEditorialPage } from './print-templates/editorial.js';
import { buildTOCPage } from './print-templates/toc.js';
import { buildOpenerPage } from './print-templates/opener.js';
import { buildIntroPage } from './print-templates/intro.js';
import { buildStandardPage } from './print-templates/standard.js';
import { buildNewsPage } from './print-templates/news.js';

const TYPST_BRIDGE_LOCAL = "http://localhost:9000";

// ── Hilfsfunktionen ────────────────────────────────────────────

function jsonRes(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    },
  });
}

// Typst-String-Escaping: verhindert Syntax-Fehler im generierten Typst-Code
function esc(text) {
  return String(text ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/#/g, "\\#")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]")
    .replace(/\n/g, " ")
    .slice(0, 300);
}

// Headline-String mit \n-Trenner in Array von Zeilen aufteilen
function splitHeadline(raw) {
  return String(raw ?? "")
    .replace(/^\[|\]$/g, "")  // KI-generierte eckige Klammern entfernen
    .split(/\\n|\n/)
    .filter(l => l.trim().length > 0);
}

// BlockNote-Blocks → Plain Text (Fallback: content / body)
function extractBodyText(article) {
  if (!article) return "";
  if (Array.isArray(article.blocks) && article.blocks.length > 0) {
    return article.blocks
      .map(block => {
        const content = block.content ?? [];
        return content
          .filter(c => c.type === "text")
          .map(c => c.text ?? "")
          .join("");
      })
      .filter(t => t.trim())
      .join("\n");
  }
  return article.content ?? article.body ?? "";
}

// Ausgabe-Label für aktuelle Ausgabe (z.B. "September 2026")
function formatAusgabe() {
  const now = new Date();
  return `${now.toLocaleString("de", { month: "long" })} ${now.getFullYear()}`;
}

// ── Bilder laden (Workers-kompatibel — kein Node Buffer) ────────

async function fetchImages(articles, extraImageUrls = {}) {
  const assets = {};
  const toFetch = [];

  // Alle Artikel-Bilder nach Muster "{artikelId}-{index}.jpg" laden
  for (const a of articles) {
    (a.imageUrls ?? []).forEach((url, idx) => {
      toFetch.push({ key: `${a.id}-${idx}.jpg`, url });
    });
  }

  // Optionale extra Bild-URLs (z.B. aus dem Request-Body)
  for (const [key, url] of Object.entries(extraImageUrls)) {
    toFetch.push({ key: key.endsWith(".jpg") ? key : `${key}.jpg`, url });
  }

  await Promise.allSettled(toFetch.map(async ({ key, url }) => {
    if (assets[key]) return;
    try {
      const res = await fetch(url, { redirect: "follow" });
      if (!res.ok) return;
      const buf = await res.arrayBuffer();
      const bytes = new Uint8Array(buf);
      // Workers-sichere chunked btoa (kein Node Buffer)
      const chunks = [];
      for (let i = 0; i < bytes.length; i += 8192) {
        chunks.push(String.fromCharCode(...bytes.subarray(i, i + 8192)));
      }
      assets[`images/${key}`] = btoa(chunks.join(""));
    } catch { /* kein Bild → Template nutzt Gradient-Fallback */ }
  }));

  return assets;
}

// ── KI-Aufruf (direkt zur Anthropic API — korrekt für CF Functions) ──

async function aiCall(prompt, env) {
  if (!env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY nicht gesetzt");
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 4000,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!resp.ok) {
    const errText = await resp.text().catch(() => resp.status.toString());
    throw new Error(`AI-Call fehlgeschlagen: ${resp.status} — ${errText.slice(0, 200)}`);
  }
  const data = await resp.json();
  return data.content?.[0]?.text ?? "";
}

// ── KI-Prompt: NUR JSON-Daten, kein Typst ─────────────────────

function buildAiPrompt(articles, context) {
  const articleSummaries = articles.map(a => ({
    id: a.id,
    title: (a.title ?? "").slice(0, 80),
    subtitle: (a.subtitle ?? "").slice(0, 120),
    rubrik: a.category ?? "",
    imageKeys: (a.imageUrls ?? []).map((_, i) => `${a.id}-${i}`),
    wordCount: extractBodyText(a).split(/\s+/).length,
    bodyStart: extractBodyText(a).slice(0, 300),
  }));

  return `Du bist Senior Art Director eines deutschsprachigen Radsport-Magazins.

Erstelle einen Layout-Plan für diese Ausgabe als JSON. NUR JSON — kein Typst, kein Markdown.

## Verfügbare Artikel
${JSON.stringify(articleSummaries, null, 2)}

## Kontext
Ausgabe: ${context.ausgabe ?? "Aktuelle Ausgabe"}
Seitenumfang: mindestens ${3 + articles.length * 2} Seiten

## Seitentypen
- "opener": Dramatische Eröffnungsseite (1x pro Artikel), Vollbild
- "intro": Foto + Einführungstext, folgt nach opener
- "standard": Standard-Textseite mit Foto, Headline, 2-spaltig
- "news": 2-3 Kurzmeldungen auf einer Seite

## Regeln
- Jeder Artikel braucht mindestens "opener" + "standard"
- Längere Artikel (>800 Wörter): opener + intro + standard
- Kurze Meldungen (<200 Wörter): in news-Seiten bündeln
- Seitenzählung beginnt bei 4 (Cover=1, Editorial=2, TOC=3)
- Headlines mit Zeilenumbrüchen: "ZEILE1\\nZEILE2" (max 2 Zeilen, je max 20 Zeichen)
- bildKey Format: "{artikelId}-{bildIndex}" z.B. "ms-01-0"

## Ausgabe (EXAKT dieses JSON-Schema)
{
  "cover": {
    "headline": "...",
    "unterzeile": "...",
    "teasers": ["...", "...", "...", "..."],
    "bildKey": "...",
    "artikelId": "..."
  },
  "editorial": "2-4 Sätze Willkommenstext vom Chefredakteur",
  "seiten": [
    {
      "nr": 4,
      "typ": "opener|intro|standard|news",
      "artikelId": "...",
      "rubrik": "RUBRIK IN CAPS",
      "dachzeile": "OBERTHEMA",
      "headline": "HAUPTTITEL\\nZWEITE ZEILE",
      "unterzeile": "Ergänzender Untertitel",
      "byline": "Von der Redaktion",
      "bildKey": "...",
      "meldungen": []
    }
  ]
}`;
}

// ── TOC-Einträge aus Plan ableiten ─────────────────────────────

function buildTocEntries(plan, articles) {
  return (plan.seiten ?? [])
    .filter(s => s.typ === "opener")
    .map(s => {
      const artikel = articles.find(a => a.id === s.artikelId);
      return {
        seite: s.nr,
        rubrik: s.rubrik ?? "",
        titel: (s.headline ?? "").replace(/\\n/g, " ") || (artikel?.title ?? ""),
        teaser: s.unterzeile ?? (artikel?.subtitle ?? "").slice(0, 80),
      };
    });
}

// ── Vollständiges Typst-Dokument aus Plan aufbauen ─────────────

async function buildCompleteLayout(plan, articles, assets, context) {
  const pages = [];

  // Seite 1: Cover
  pages.push(buildCoverPage({
    ...plan.cover,
    magazin: context.magazin ?? "ppi CYCLING",
    ausgabe: context.ausgabe ?? formatAusgabe(),
    preis: context.preis ?? "€ 5,90",
  }, assets));

  // Seite 2: Editorial + Impressum
  pages.push(buildEditorialPage({
    text: plan.editorial,
    ausgabe: context.ausgabe ?? formatAusgabe(),
  }, assets));

  // Seite 3: TOC
  const tocEntries = buildTocEntries(plan, articles);
  pages.push(buildTOCPage({
    ausgabe: context.ausgabe ?? formatAusgabe(),
    eintraege: tocEntries,
  }));

  // Seiten 4+: Artikel-Seiten
  for (const seite of (plan.seiten ?? [])) {
    const artikel = articles.find(a => a.id === seite.artikelId);
    const bodyText = artikel ? extractBodyText(artikel) : "";

    const pageData = { ...seite, body: bodyText };

    switch (seite.typ) {
      case "opener":
        pages.push(buildOpenerPage(pageData, assets));
        break;
      case "intro":
        pages.push(buildIntroPage(pageData, assets));
        break;
      case "standard":
        pages.push(buildStandardPage(pageData, assets));
        break;
      case "news":
        pages.push(buildNewsPage(pageData));
        break;
      default:
        // unbekannter Typ → überspringen (kein pagebreak, keine leere Seite)
        break;
    }
  }

  return pages.join("\n\n#pagebreak()\n\n");
}

// ── JSON sicher parsen (KI-Antwort enthält oft Preamble-Text) ──

function parseJSON(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Kein JSON in KI-Antwort. Anfang: " + text.slice(0, 200));
  const sanitized = match[0].replace(/"(?:[^"\\]|\\.)*"/g, m =>
    m.replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\t/g, "\\t")
  );
  try {
    return JSON.parse(sanitized);
  } catch (err) {
    throw new Error(`Layout-JSON ungültig: ${err.message}. Anfang: ${text.slice(0, 400)}`);
  }
}

// ── Typst Bridge ───────────────────────────────────────────────

async function compileTypst(source, files, assets, env) {
  const bridgeUrl = env.TYPST_BRIDGE_URL ?? TYPST_BRIDGE_LOCAL;
  let res;
  try {
    res = await fetch(`${bridgeUrl}/compile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source, files, assets }),
      signal: AbortSignal.timeout(60000),
    });
  } catch {
    return null; // Bridge nicht erreichbar → plan-only Modus
  }
  const data = await res.json();
  if (!data.ok) throw new Error(`Typst-Fehler: ${data.error}`);
  return data.pdf;
}

// ── Haupt-Handler ──────────────────────────────────────────────

export async function onRequest({ request, env }) {
  if (request.method === "OPTIONS") {
    return new Response("", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }
  if (request.method !== "POST") return jsonRes({ error: "POST required" }, 405);

  let body;
  try { body = await request.json(); } catch { return jsonRes({ error: "Invalid JSON" }, 400); }

  const {
    articles,
    workspaceId = "ws-ppi-media",
    issueId,
    templateFiles,
    context = {},
    imageUrls = {},
  } = body;

  if (!articles?.length) return jsonRes({ error: "articles[] erforderlich" }, 400);

  try {
    // 1. Alle Bilder vorab laden (vor KI-Call, damit Keys bekannt sind)
    const assets = await fetchImages(articles, imageUrls);

    // 2. KI-Call: JSON-Plan anfordern (kein Typst, nur Daten)
    const prompt = buildAiPrompt(articles, context);
    const aiResponse = await aiCall(prompt, env);

    // 3. JSON-Plan aus KI-Antwort parsen
    const plan = parseJSON(aiResponse);

    // 4. Vollständiges Typst-Dokument aus Plan + Template-Modulen aufbauen
    const typstSource = await buildCompleteLayout(plan, articles, assets, context);

    // 5. PDF kompilieren (via Typst Bridge)
    const pdfBase64 = await compileTypst(typstSource, templateFiles ?? {}, assets, env);

    // 6. Ausgabe optional in KV persistieren
    if (issueId && env.SOCIALFLOW_KV) {
      await env.SOCIALFLOW_KV.put(
        `issue:${workspaceId}:${issueId}:draft`,
        JSON.stringify({
          plan,
          typstSource,
          generatedAt: new Date().toISOString(),
          articleIds: articles.map(a => a.id),
        })
      ).catch(() => {});
    }

    // 7. PDF als Response zurückgeben
    if (pdfBase64) {
      const pdfBytes = Uint8Array.from(atob(pdfBase64), c => c.charCodeAt(0));
      return new Response(pdfBytes, {
        headers: {
          "Content-Type": "application/pdf",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Content-Disposition": `attachment; filename="ausgabe-${issueId ?? "preview"}.pdf"`,
        },
      });
    }

    // Fallback: Bridge nicht erreichbar → Plan zurückgeben
    const totalPages = (plan.seiten?.length ?? 0) + 3; // +Cover+Editorial+TOC
    return jsonRes({ ok: true, pdf: null, pdfAvailable: false, plan, pages: totalPages });

  } catch (err) {
    console.error("Print-Generate Fehler:", err.message);
    return jsonRes({ ok: false, error: err.message }, 500);
  }
}
