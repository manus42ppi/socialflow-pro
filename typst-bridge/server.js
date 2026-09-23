/**
 * Typst Bridge Server — lokaler Entwicklungs-Compiler
 * Läuft auf Port 9000 neben Wrangler.
 * In Produktion: Endpunkt durch VPS oder CF Worker WASM ersetzen.
 *
 * Start: node typst-bridge/server.js
 * POST /compile  { source: "...", assets: { "bild.jpg": "<base64>" } }
 *   → { ok: true, pdf: "<base64>" }
 *   → { ok: false, error: "..." }
 */

import http from "http";
import { execSync, spawnSync } from "child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "fs";
import { tmpdir, homedir } from "os";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
// Typst binary: lokale Installation unter ~/.local/bin, Fallback auf PATH
const TYPST_BIN = `${homedir()}/.local/bin/typst`;
const FONTS_DIR = join(__dirname, "fonts");

const PORT = 9000;

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
}

function json(res, status, data) {
  cors(res);
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

// Typst-Binary prüfen
try {
  execSync(`${TYPST_BIN} --version`, { stdio: "pipe" });
} catch {
  console.error(`❌ Typst nicht gefunden unter ${TYPST_BIN}`);
  process.exit(1);
}

const server = http.createServer((req, res) => {
  if (req.method === "OPTIONS") { cors(res); res.writeHead(204); res.end(); return; }
  if (req.method !== "POST" || req.url !== "/compile") {
    json(res, 404, { ok: false, error: "Only POST /compile" }); return;
  }

  let body = "";
  req.on("data", d => { body += d; });
  req.on("end", () => {
    let payload;
    try { payload = JSON.parse(body); } catch {
      json(res, 400, { ok: false, error: "Invalid JSON" }); return;
    }

    const { source, assets = {}, files = {} } = payload;
    if (!source) { json(res, 400, { ok: false, error: "source required" }); return; }

    const tmpDir = mkdtempSync(join(tmpdir(), "sfp-typst-"));
    const inputFile = join(tmpDir, "main.typ");
    const outputFile = join(tmpDir, "main.pdf");

    try {
      writeFileSync(inputFile, source, "utf-8");

      // files: { "templates/base.typ": "<typst source>" } — Plain-Text-Dateien
      for (const [relPath, text] of Object.entries(files)) {
        const destPath = join(tmpDir, relPath);
        mkdirSync(join(tmpDir, relPath.split("/").slice(0, -1).join("/")), { recursive: true });
        writeFileSync(destPath, text, "utf-8");
      }

      // assets: { "imgs/bild.jpg": "<base64>" } — Binärdateien (inkl. Unterverzeichnisse)
      for (const [filename, b64] of Object.entries(assets)) {
        const destPath = join(tmpDir, filename);
        const destDir = destPath.split("/").slice(0, -1).join("/");
        if (destDir) mkdirSync(destDir, { recursive: true });
        writeFileSync(destPath, Buffer.from(b64, "base64"));
      }

      const result = spawnSync(TYPST_BIN, [
        "compile", inputFile, outputFile,
        "--font-path", FONTS_DIR,
      ], {
        cwd: tmpDir,
        timeout: 30000,
        encoding: "buffer",
      });

      if (result.status !== 0) {
        const errMsg = result.stderr?.toString() || "Typst-Fehler (kein Output)";
        console.error("Typst-Fehler:\n", errMsg);
        json(res, 422, { ok: false, error: errMsg }); return;
      }

      const pdfBytes = readFileSync(outputFile);
      json(res, 200, { ok: true, pdf: pdfBytes.toString("base64") });
      console.log(`✅ Compiled ${(pdfBytes.length / 1024).toFixed(0)} KB`);

    } catch (err) {
      console.error("Bridge-Fehler:", err.message);
      json(res, 500, { ok: false, error: err.message });
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

server.listen(PORT, () => {
  console.log(`🖨  Typst Bridge läuft auf http://localhost:${PORT}`);
  console.log(`    POST /compile  { source, assets? } → { ok, pdf (base64) }`);
});
