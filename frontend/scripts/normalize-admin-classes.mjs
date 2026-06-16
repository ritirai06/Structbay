/**
 * One-shot: normalize legacy hex / white-border utilities under src/admin to sb-* tokens.
 * Run: node scripts/normalize-admin-classes.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const adminDir = path.join(__dirname, "..", "src", "admin");

/** Order: most specific strings first */
const REPLACEMENTS = [
  ["placeholder:text-[#D4C4A8]/35", "placeholder:text-sb-ink/40"],
  ["placeholder:text-[#D4C4A8]/30", "placeholder:text-sb-ink/40"],
  ["text-[#F4E9D8]/90", "text-sb-ink/90"],
  ["text-[#F4E9D8]/80", "text-sb-ink/80"],
  ["text-[#FE5E00]/90", "text-sb-orange"],
  ["text-[#FE5E00]/80", "text-sb-orange/90"],
  ["text-[#D4C4A8]/60", "text-sb-ink/55"],
  ["text-[#D4C4A8]/55", "text-sb-ink/50"],
  ["text-[#D4C4A8]/50", "text-sb-ink/50"],
  ["text-[#D4C4A8]/70", "text-sb-ink/65"],
  ["text-[#D4C4A8]/45", "text-sb-ink/45"],
  ["text-[#D4C4A8]/40", "text-sb-ink/45"],
  ["text-[#D4C4A8]/30", "text-sb-ink/40"],
  ["text-[#D4C4A8]/20", "text-sb-ink/20"],
  ["text-[#D4C4A8]/80", "text-sb-ink/70"],
  ["text-[#D4C4A8]/90", "text-sb-ink/75"],
  ["text-[10px] text-[#D4C4A8]/50", "text-[10px] text-sb-ink/50"],
  ["hover:text-[#F4E9D8]", "hover:text-sb-ink"],
  ["hover:text-[#FE5E00]", "hover:text-sb-orange"],
  ["border-[#FE5E00]/50", "border-sb-orange/50"],
  ["border-[#FE5E00]/40", "border-sb-orange/40"],
  ["border-[#FE5E00]/30", "border-sb-orange/30"],
  ["border-[#FE5E00]/25", "border-sb-orange/25"],
  ["border-[#FE5E00]/20", "border-sb-orange/20"],
  ["border-[#FE5E00]", "border-sb-orange"],
  ["bg-[#FE5E00]/20", "bg-sb-orange/20"],
  ["bg-[#FE5E00]/15", "bg-sb-orange/15"],
  ["bg-[#FE5E00]/10", "bg-sb-orange/10"],
  ["bg-[#FE5E00]", "bg-sb-orange"],
  ["text-[#FE5E00]", "text-sb-orange"],
  ["hover:bg-[#E05200]", "hover:bg-sb-orange-hover"],
  ["focus:border-[#FE5E00]", "focus:border-sb-orange"],
  ["focus:ring-[#FE5E00]/20", "focus:ring-sb-orange/20"],
  ["focus:ring-[#FE5E00]/15", "focus:ring-sb-orange/20"],
  ["focus:ring-2 focus:ring-[#FE5E00]", "focus:ring-2 focus:ring-sb-orange"],
  ["ring-[#FE5E00]", "ring-sb-orange"],
  ["shadow-[0_4px_16px_rgba(254,94,0,0.25)]", "shadow-[0_4px_16px_rgba(254,94,0,0.22)]"],
  ["bg-[#1A1A1A]", "bg-sb-cream-secondary"],
  ["border-white/15", "border-sb-ink/15"],
  ["border-white/12", "border-sb-ink/12"],
  ["border-white/10", "border-sb-ink/10"],
  ["border-white/8", "border-sb-ink/10"],
  ["border-white/5", "border-sb-ink/8"],
  ["border-white/20", "border-sb-ink/20"],
  ["border-white/30", "border-sb-ink/25"],
  ["hover:border-white/30", "hover:border-sb-ink/25"],
  ["hover:border-white/20", "hover:border-sb-ink/20"],
  ["hover:bg-white/[0.02]", "hover:bg-sb-cream-secondary/90"],
  ["bg-white/8", "bg-sb-cream-secondary"],
  ["text-[#F4E9D8]", "text-sb-ink"],
  ["text-[#D4C4A8]", "text-sb-ink/60"],
  // Status colors → palette-only
  ["text-green-400", "text-sb-orange"],
  ["text-red-400", "text-sb-ink/55"],
  ["border-green-500/20", "border-sb-orange/22"],
  ["bg-green-500/15", "bg-sb-orange/12"],
  ["border-red-400/20", "border-sb-ink/18"],
  ["bg-red-500/15", "bg-sb-cream-secondary"],
  ["border-red-400/40", "border-sb-orange/30"],
  ["hover:border-red-400/40", "hover:border-sb-orange/35"],
  ["text-red-300", "text-sb-ink/50"],

  // ── Pass 2: leftover non-palette utilities ─────────────────────────────
  ["bg-[#C9A227]/15 text-[#C9A227] border-[#C9A227]/25", "bg-sb-orange/12 text-sb-orange border-sb-orange/25"],
  ["text-[#C9A227]", "text-sb-orange"],
  ["font-bold text-[#C9A227]", "font-bold text-sb-orange"],
  ["bg-blue-500/15 text-blue-400 border-blue-500/20", "bg-sb-cream-secondary text-sb-ink border-sb-ink/12"],
  ["text-blue-400", "text-sb-ink"],
  ["border-blue-500/20", "border-sb-ink/12"],
  ["border-blue-500/25", "border-sb-ink/12"],
  ["border-red-500/30", "border-sb-ink/18"],
  ["border-red-500/25", "border-sb-ink/15"],
  ["border-red-500/20", "border-sb-ink/15"],
  ["bg-red-500/10", "bg-sb-cream-secondary"],
  ["text-red-200/90", "text-sb-ink/85"],
  ["text-red-200/70", "text-sb-ink/65"],
  ["text-red-200", "text-sb-ink"],
  ["text-red-100/90", "text-sb-ink/80"],
  ["text-red-100", "text-sb-ink"],
  ["border-amber-500/30", "border-sb-orange/25"],
  ["bg-amber-500/10", "bg-sb-orange/10"],
  ["text-amber-200/95", "text-sb-ink/80"],
  ["text-amber-200/70", "text-sb-ink/65"],
  ["text-amber-200", "text-sb-ink"],
  ["text-amber-400/90", "text-sb-ink/70"],
  ["text-yellow-400", "text-sb-orange"],
  ["text-cyan-400", "text-sb-ink"],
  ["bg-cyan-500/15", "bg-sb-cream-secondary"],
  ["border-cyan-500/25", "border-sb-ink/12"],
  ["text-purple-400", "text-sb-ink"],
  ["bg-purple-500/15", "bg-sb-orange/10"],
  ["border-purple-500/25", "border-sb-orange/22"],
  ["text-indigo-300", "text-sb-ink"],
  ["text-violet-300", "text-sb-ink"],
  ["bg-green-600 hover:bg-green-700", "bg-sb-orange hover:bg-sb-orange-hover"],
  ["bg-green-600", "bg-sb-orange"],
  ["hover:bg-green-700", "hover:bg-sb-orange-hover"],
  ["bg-red-600 hover:bg-red-700", "bg-sb-ink hover:bg-sb-ink/90"],
  ["bg-red-600", "bg-sb-ink"],
  ["hover:bg-red-700", "hover:bg-sb-ink/90"],
  ["hover:bg-green-500/20", "hover:bg-sb-orange/15"],
  ["bg-green-500/20", "bg-sb-orange/12"],
  ["bg-green-500/10", "bg-sb-orange/10"],
  ["hover:bg-green-500/10", "hover:bg-sb-orange/10"],
  ["hover:bg-red-500/20", "hover:bg-sb-cream-secondary"],
  ["hover:bg-red-400/10", "hover:bg-sb-cream-secondary"],
  ["border-red-400/30", "border-sb-ink/18"],
  ["text-green-300/95", "text-sb-ink/80"],
  ["hover:text-[#E05200]", "hover:text-sb-orange-hover"],
  ["accent-[#FE5E00]", "accent-sb-orange"],
  ["bg-[#171717]", "bg-sb-cream-secondary"],
  ["from-[#2A2A2A] to-[#1A1A1A]", "from-sb-cream-secondary to-sb-cream"],
  ["border-[#1A1A1A]", "border-sb-ink/10"],
  ["border-white/6", "border-sb-ink/8"],
  ["hover:bg-white/4", "hover:bg-sb-cream-secondary/80"],
  ['tick={{ fill: "#D4C4A8"', 'tick={{ fill: "rgba(34,34,34,0.5)"'],
  ["stroke=\"#D4C4A8\"", "stroke=\"rgba(34,34,34,0.35)\""],
  ["fill=\"#C9A227\"", "fill=\"#FE5E00\""],
  ["bg-[#2A2A2A]", "bg-sb-cream-secondary"],
  ["hover:bg-[#2A2A2A]", "hover:bg-sb-cream-secondary"],
  ["border-[#C9A227]/25 bg-[#C9A227]/5", "border-sb-orange/25 bg-sb-orange/8"],
  ["border-[#C9A227]/25", "border-sb-orange/25"],
  ["bg-[#C9A227]/5", "bg-sb-orange/8"],
  ["border-[#C9A227]/20", "border-sb-orange/20"],
  ["bg-[#C9A227]/15 text-sb-orange border border-[#C9A227]/20", "bg-sb-orange/12 text-sb-orange border border-sb-orange/20"],
  ["bg-[#C9A227]/15", "bg-sb-orange/12"],
  ["border-green-500/30", "border-sb-orange/25"],
  ["border-green-500/25", "border-sb-orange/22"],
  ["border-amber-500/25", "border-sb-orange/25"],
  ["border-green-500/20", "border-sb-orange/20"],
  ["bg-white/10", "bg-sb-cream-secondary"],
  ["bg-blue-500/15 text-sb-ink border-sb-ink/12", "bg-sb-cream-secondary text-sb-ink border-sb-ink/12"],
  ["bg-yellow-500/15 text-sb-orange border-yellow-500/25", "bg-sb-orange/10 text-sb-orange border-sb-orange/25"],
];

function walk(dir, acc = []) {
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, name.name);
    if (name.isDirectory()) walk(p, acc);
    else if (name.isFile() && (p.endsWith(".tsx") || p.endsWith(".ts"))) acc.push(p);
  }
  return acc;
}

let changed = 0;
for (const file of walk(adminDir)) {
  let text = fs.readFileSync(file, "utf8");
  const orig = text;
  for (const [a, b] of REPLACEMENTS) {
    text = text.split(a).join(b);
  }
  if (text !== orig) {
    fs.writeFileSync(file, text, "utf8");
    changed++;
    console.log("updated:", path.relative(path.join(__dirname, ".."), file));
  }
}
console.log("files changed:", changed);
