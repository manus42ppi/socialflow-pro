// Cloudflare Pages Function — POST /print-approve
//
// Nimmt eine freigegebene Druckausgabe entgegen, speichert:
//   1. Den Layout-Plan in den Lern-Index (Few-Shot für zukünftige Generierungen)
//   2. Den Brand Style Guide falls mitgeliefert
//   3. Offene Wissenslücken falls Fragen beantwortet wurden
//
// Payload:
// {
//   issueId: string,
//   workspaceId: string,
//   layoutPlan: { seiten: [...] },              // was generiert wurde
//   komposition: string,                         // kurze Beschreibung
//   layoutZusammenfassung: string,               // was gut funktioniert hat
//   brandStyleGuide?: {...},                     // aktualisierter Stil-Guide
//   gapAnswers?: { gapId: string, antwort: string }[]  // Wissenslücken-Antworten
// }

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

// ── Lern-Index-Eintrag bauen ─────────────────────────────────

function buildIndexEntry(issueId, payload) {
  const seiten = payload.layoutPlan?.seiten ?? [];
  const typen = seiten.reduce((acc, s) => {
    acc[s.typ] = (acc[s.typ] ?? 0) + 1;
    return acc;
  }, {});

  return {
    issueId,
    approved: true,
    approvedAt: new Date().toISOString(),
    artikel_anzahl: new Set(seiten.map(s => s.artikel_id).filter(Boolean)).size,
    seiten_anzahl: seiten.length,
    seiten_typen: typen,
    komposition: payload.komposition ?? "",
    layout_zusammenfassung: payload.layoutZusammenfassung ?? "",
  };
}

// ── Wissenslücken schließen ───────────────────────────────────

async function applyGapAnswers(kv, workspaceId, gapAnswers) {
  if (!gapAnswers?.length) return;

  const existing = await kv.get(`gaps:${workspaceId}`, "json").catch(() => null) ?? [];
  const answerMap = Object.fromEntries(gapAnswers.map(a => [a.gapId, a.antwort]));

  // Beantwortete Lücken aus der Liste entfernen, in Wissen überführen
  const offene = existing.filter(g => !answerMap[g.id]);
  const beantwortet = existing.filter(g => answerMap[g.id]);

  // Gelernte Fakten in separatem Key speichern
  if (beantwortet.length) {
    const gelerntesFakten = await kv.get(`wissen:${workspaceId}`, "json").catch(() => null) ?? [];
    const neuesFakten = beantwortet.map(g => ({
      id: g.id,
      frage: g.frage,
      antwort: answerMap[g.id],
      kategorie: g.kategorie ?? "allgemein",
      gelerntAm: new Date().toISOString(),
    }));
    await kv.put(`wissen:${workspaceId}`, JSON.stringify([...gelerntesFakten, ...neuesFakten]));
  }

  await kv.put(`gaps:${workspaceId}`, JSON.stringify(offene));
}

// ── Neue Wissenslücken erkennen ───────────────────────────────
// Einfache Heuristik: prüft ob der Layout-Plan Platzhalter-Felder enthält

function detectNewGaps(layoutPlan) {
  const gaps = [];
  const seiten = layoutPlan?.seiten ?? [];

  for (const seite of seiten) {
    if (seite.bild_empfehlung && !seite.image) {
      gaps.push({
        id: `gap-${Date.now()}-img-${seite.nr}`,
        kategorie: "bildstil",
        frage: `Seite ${Array.isArray(seite.nr) ? seite.nr.join("–") : seite.nr} (${seite.typ}): Welche Bildstimmung passt zu "${seite.dachzeile}"? Empfehlung lautete: "${seite.bild_empfehlung}"`,
        kontext: { seiteNr: seite.nr, typ: seite.typ },
      });
    }

    if (!seite.rubrik) {
      gaps.push({
        id: `gap-${Date.now()}-rubrik-${seite.nr}`,
        kategorie: "struktur",
        frage: `Welche Rubrik soll für Artikel vom Typ "${seite.typ}" mit Dachzeile "${seite.dachzeile}" verwendet werden?`,
        kontext: { seiteNr: seite.nr, typ: seite.typ },
      });
    }
  }

  return gaps.slice(0, 3); // max 3 neue Lücken pro Freigabe
}

// ── Haupt-Handler ─────────────────────────────────────────────

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
  try { body = await request.json(); }
  catch { return jsonRes({ error: "Invalid JSON" }, 400); }

  const { issueId, workspaceId = "ws-ppi-media", layoutPlan, brandStyleGuide, gapAnswers } = body;

  if (!issueId) return jsonRes({ error: "issueId erforderlich" }, 400);

  const kv = env.SOCIALFLOW_KV;
  if (!kv) return jsonRes({ error: "KV nicht konfiguriert" }, 500);

  try {
    const ops = [];

    // 1. Layout-Lern-Index aktualisieren
    const indexEntry = buildIndexEntry(issueId, body);
    const existingIndex = await kv.get(`layouts:${workspaceId}:index`, "json").catch(() => null) ?? [];
    const updatedIndex = [
      indexEntry,
      ...existingIndex.filter(e => e.issueId !== issueId),
    ].slice(0, 50); // max 50 Einträge im Lern-Index
    ops.push(kv.put(`layouts:${workspaceId}:index`, JSON.stringify(updatedIndex)));

    // 2. Ausgabe als freigegeben markieren
    const draftKey = `issue:${workspaceId}:${issueId}:draft`;
    const draft = await kv.get(draftKey, "json").catch(() => null);
    if (draft) {
      ops.push(kv.put(draftKey.replace(":draft", ":approved"), JSON.stringify({
        ...draft, approvedAt: new Date().toISOString(),
      })));
    }

    // 3. Brand Style Guide speichern (falls mitgeliefert)
    if (brandStyleGuide && Object.keys(brandStyleGuide).length) {
      ops.push(kv.put(`brand:${workspaceId}:style-guide`, JSON.stringify(brandStyleGuide)));
    }

    // 4. Wissenslücken beantworten
    ops.push(applyGapAnswers(kv, workspaceId, gapAnswers));

    // 5. Neue Wissenslücken aus diesem Layout erkennen und speichern
    const neueGaps = detectNewGaps(layoutPlan);
    if (neueGaps.length) {
      const existingGaps = await kv.get(`gaps:${workspaceId}`, "json").catch(() => null) ?? [];
      const allGaps = [...existingGaps, ...neueGaps].slice(0, 20);
      ops.push(kv.put(`gaps:${workspaceId}`, JSON.stringify(allGaps)));
    }

    await Promise.all(ops);

    return jsonRes({
      ok: true,
      issueId,
      indexSize: updatedIndex.length,
      neueGaps,
      message: neueGaps.length
        ? `Freigabe gespeichert. ${neueGaps.length} neue Wissensfrage(n) erkannt.`
        : "Freigabe gespeichert. KI-Lernbasis aktualisiert.",
    });

  } catch (err) {
    console.error("print-approve Fehler:", err.message);
    return jsonRes({ ok: false, error: err.message }, 500);
  }
}
