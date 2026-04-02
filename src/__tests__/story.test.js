import { describe, it, expect } from 'vitest';

// ── Inline-Kopien der Helfer aus StoryEditorModal ──────────────────────────
// (Diese Funktionen sind dort nicht exportiert – Tests gegen die gleiche Logik)

function blocksToText(blocks) {
  if (!blocks?.length) return "";
  const extract = (content) => {
    if (!content) return "";
    if (Array.isArray(content)) return content.map(item => item.type === "text" ? (item.text || "") : "").join("");
    return "";
  };
  const lines = [];
  for (const block of blocks) {
    const t = extract(block.content);
    if (t.trim()) lines.push(t.trim());
    if (block.children?.length) lines.push(blocksToText(block.children));
  }
  return lines.filter(Boolean).join("\n\n");
}

function sectionsToBlocks(sections) {
  if (!sections?.length) return [];
  const blocks = [];
  for (const sec of sections) {
    if (sec.heading) blocks.push({ type:"heading", props:{level:2,textAlignment:"left"}, content:[{type:"text",text:sec.heading,styles:{}}], children:[] });
    if (sec.content) blocks.push({ type:"paragraph", props:{textAlignment:"left"}, content:[{type:"text",text:sec.content,styles:{}}], children:[] });
  }
  return blocks;
}

const CH_LIMITS = { instagram:2200, twitter:280, linkedin:1300, facebook:500, whatsapp:800, website:100000, print:100000 };

function truncate(text, channel) {
  const limit = CH_LIMITS[channel] || 500;
  if (text.length <= limit) return text;
  return text.slice(0, limit - 3).trimEnd() + "…";
}

// ── blocksToText ──────────────────────────────────────────────────────────────
describe('blocksToText()', () => {
  it('returns empty string for null/undefined/empty', () => {
    expect(blocksToText(null)).toBe("");
    expect(blocksToText(undefined)).toBe("");
    expect(blocksToText([])).toBe("");
  });

  it('extracts text from a paragraph block', () => {
    const blocks = [{ type:"paragraph", content:[{type:"text",text:"Hallo Welt"}], children:[] }];
    expect(blocksToText(blocks)).toBe("Hallo Welt");
  });

  it('extracts text from a heading block', () => {
    const blocks = [{ type:"heading", props:{level:2}, content:[{type:"text",text:"Überschrift"}], children:[] }];
    expect(blocksToText(blocks)).toBe("Überschrift");
  });

  it('joins multiple blocks with double newline', () => {
    const blocks = [
      { type:"paragraph", content:[{type:"text",text:"Erster Absatz"}], children:[] },
      { type:"paragraph", content:[{type:"text",text:"Zweiter Absatz"}], children:[] },
    ];
    expect(blocksToText(blocks)).toBe("Erster Absatz\n\nZweiter Absatz");
  });

  it('skips blocks with no text content', () => {
    const blocks = [
      { type:"paragraph", content:[], children:[] },
      { type:"paragraph", content:[{type:"text",text:"Text"}], children:[] },
    ];
    expect(blocksToText(blocks)).toBe("Text");
  });

  it('handles nested children', () => {
    const blocks = [{
      type:"paragraph",
      content:[{type:"text",text:"Parent"}],
      children:[{
        type:"paragraph",
        content:[{type:"text",text:"Child"}],
        children:[],
      }],
    }];
    const result = blocksToText(blocks);
    expect(result).toContain("Parent");
    expect(result).toContain("Child");
  });

  it('ignores non-text inline content types', () => {
    const blocks = [{
      type:"paragraph",
      content:[{type:"link",text:"ignore"},{type:"text",text:"keep"}],
      children:[],
    }];
    expect(blocksToText(blocks)).toBe("keep");
  });
});

// ── sectionsToBlocks ──────────────────────────────────────────────────────────
describe('sectionsToBlocks()', () => {
  it('returns empty array for null/undefined/empty', () => {
    expect(sectionsToBlocks(null)).toEqual([]);
    expect(sectionsToBlocks(undefined)).toEqual([]);
    expect(sectionsToBlocks([])).toEqual([]);
  });

  it('converts a section with heading and content', () => {
    const sections = [{ heading:"Titel", content:"Beschreibung" }];
    const blocks = sectionsToBlocks(sections);
    expect(blocks.length).toBe(2);
    expect(blocks[0].type).toBe("heading");
    expect(blocks[0].content[0].text).toBe("Titel");
    expect(blocks[1].type).toBe("paragraph");
    expect(blocks[1].content[0].text).toBe("Beschreibung");
  });

  it('skips heading block when heading is empty', () => {
    const sections = [{ heading:"", content:"Nur Text" }];
    const blocks = sectionsToBlocks(sections);
    expect(blocks.length).toBe(1);
    expect(blocks[0].type).toBe("paragraph");
  });

  it('skips paragraph block when content is empty', () => {
    const sections = [{ heading:"Nur Titel", content:"" }];
    const blocks = sectionsToBlocks(sections);
    expect(blocks.length).toBe(1);
    expect(blocks[0].type).toBe("heading");
  });

  it('produces valid BlockNote heading props', () => {
    const sections = [{ heading:"H2", content:"" }];
    const blocks = sectionsToBlocks(sections);
    expect(blocks[0].props.level).toBe(2);
    expect(blocks[0].props.textAlignment).toBe("left");
    expect(blocks[0].children).toEqual([]);
  });

  it('handles multiple sections', () => {
    const sections = [
      { heading:"Section 1", content:"Content 1" },
      { heading:"Section 2", content:"Content 2" },
    ];
    const blocks = sectionsToBlocks(sections);
    expect(blocks.length).toBe(4);
    expect(blocks[0].content[0].text).toBe("Section 1");
    expect(blocks[2].content[0].text).toBe("Section 2");
  });
});

// ── truncate (Channel-Limit) ──────────────────────────────────────────────────
describe('truncate() für Kanal-Ableitungen', () => {
  const shortText = "Kurzer Text";

  it('gibt Text unverändert zurück wenn unter dem Limit', () => {
    expect(truncate(shortText, "instagram")).toBe(shortText);
    expect(truncate(shortText, "twitter")).toBe(shortText);
  });

  it('schneidet Twitter auf max 280 Zeichen ab', () => {
    const long = "x".repeat(400);
    const result = truncate(long, "twitter");
    expect(result.length).toBeLessThanOrEqual(280);
    expect(result.endsWith("…")).toBe(true);
  });

  it('schneidet Instagram auf max 2200 Zeichen ab', () => {
    const long = "a".repeat(3000);
    const result = truncate(long, "instagram");
    expect(result.length).toBeLessThanOrEqual(2200);
    expect(result.endsWith("…")).toBe(true);
  });

  it('lässt Website/Print unberührt (sehr hohes Limit)', () => {
    const long = "w".repeat(50000);
    expect(truncate(long, "website")).toBe(long);
    expect(truncate(long, "print")).toBe(long);
  });

  it('fällt auf 500 Zeichen zurück bei unbekanntem Kanal', () => {
    const long = "x".repeat(1000);
    const result = truncate(long, "unknown_channel");
    expect(result.length).toBeLessThanOrEqual(500);
    expect(result.endsWith("…")).toBe(true);
  });
});
