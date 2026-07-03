#!/usr/bin/env node
/**
 * check-fixed-assets.mjs
 *
 * Verifica que nenhum arquivo de código fonte referencia assets fixos
 * de formas que quebram quando o projeto é copiado/exportado/hospedado:
 *
 *   - `*.asset.json` (CDN interno da Lovable do projeto original)
 *   - `/__l5e/assets-v1/...` (URL direta do CDN interno)
 *   - `blob:` literais
 *   - strings cruas `"/src/assets/..."` em JSX/CSS (devem ser imports Vite)
 *
 * Imagens dinâmicas de proprietários (URLs vindas do Supabase Storage ou
 * de upload do usuário) NÃO são afetadas — esta verificação só olha o
 * código fonte, não dados em runtime.
 *
 * Uso: node scripts/check-fixed-assets.mjs
 * Sai com código 1 se encontrar violações.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const ROOT = new URL("../src/", import.meta.url).pathname;
const EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".css", ".html"]);
const FORBIDDEN = [
  { pattern: /\.asset\.json/, label: ".asset.json (CDN interno Lovable)" },
  { pattern: /\/__l5e\/assets-v1\//, label: "/__l5e/assets-v1/ (CDN interno Lovable)" },
  { pattern: /["'`]blob:/, label: "blob: literal" },
  { pattern: /["'`]\/src\/assets\//, label: '"/src/assets/..." string crua (use import Vite)' },
];

const violations = [];
function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) { walk(full); continue; }
    if (!EXTS.has(extname(entry))) continue;
    if (full.endsWith("routeTree.gen.ts")) continue;
    if (full.endsWith("scripts/check-fixed-assets.mjs")) continue;
    if (full.includes("config/assets.ts")) continue; // doc-only rules in the central asset file
    const src = readFileSync(full, "utf8");
    src.split("\n").forEach((line, i) => {
      for (const { pattern, label } of FORBIDDEN) {
        if (pattern.test(line)) {
          violations.push(`${full}:${i + 1}  [${label}]  ${line.trim()}`);
        }
      }
    });
  }
}
walk(ROOT);

if (violations.length) {
  console.error("\n❌ Referências proibidas a assets fixos do sistema:\n");
  for (const v of violations) console.error("  " + v);
  console.error(`\n${violations.length} violação(ões). Use src/config/assets.ts.\n`);
  process.exit(1);
}
console.log("✅ Nenhuma referência proibida a assets fixos encontrada.");
