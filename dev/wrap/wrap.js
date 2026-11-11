// Break the long lines of the app's CSS and JS in src/, only where whitespace means nothing, and prove
// the result means the same: the JS parses to the same tree, the CSS to the same rules, and no character
// other than spaces and newlines changed. The QR code library and the markup are left as they are.
//   cd dev/wrap && npm install && node wrap.js [limit]     (default 160; rewrites src/ and initiative.html)
const fs = require("fs"), path = require("path"), acorn = require("acorn"), postcss = require("postcss");
const ROOT = path.join(__dirname, "..", ".."), SRC = path.join(ROOT, "src"), LIMIT = +(process.argv[2] || 160);
const names = fs.readdirSync(SRC).filter(n => /^\d\d-[a-z0-9-]+\.(css|js|html)$/.test(n)).sort();
const texts = names.map(n => fs.readFileSync(path.join(SRC, n), "utf8"));
const src = texts.join("");
// regions
const cssA = src.indexOf("<style>\n") + 8, cssB = src.indexOf("</style>", cssA);
const jsA = src.indexOf("\n(function(){\n") + 1, jsB = src.lastIndexOf("})();\n</script>") + 5;
if (!(cssA > 8 && cssB > cssA && jsA > cssB && jsB > jsA)) throw new Error("regions not found");

// generic greedy wrap of one text, given break candidates (offsets where a newline may go)
function wrapText(text, cands) {   // cands: [offset, strong] - strong breaks (between statements or rules) win when they fit
  const out = [];
  let pos = 0;
  for (const line of text.split("\n")) {
    const a = pos, b = pos + line.length;
    pos = b + 1;
    if (line.length <= LIMIT) { out.push(line); continue; }
    const ind = line.match(/^\s*/)[0], cont = ind + "  ";
    const cs = cands.filter(([c]) => c > a + ind.length && c < b);
    let segStart = a;
    const pieces = [], room = s => (s === a ? 0 : cont.length);
    for (;;) {
      if (b - segStart + room(segStart) <= LIMIT) break;
      const ok = cs.filter(([c]) => c > segStart && b - c >= 12);
      // a break that only leaves a short head before a line that is still too long helps nobody
      const useless = ([c]) => { const nx = ok.find(([d]) => d > c); return c - segStart < 40 && (nx ? nx[0] : b) - c + cont.length > LIMIT; };
      const good = ok.filter(x => !useless(x));
      if (!good.length) break;
      const fit = good.filter(([c]) => c - segStart + room(segStart) <= LIMIT);
      let pick = fit.length ? fit[fit.length - 1] : good[0];
      for (let r = 2; r >= 1; r--) {   // the best kind of break that still fills at least 45% of the line
        const f = fit.filter(x => x[1] >= r);
        if (f.length && f[f.length - 1][0] - segStart >= LIMIT * 0.45) { pick = f[f.length - 1]; break; }
      }
      pieces.push(text.slice(segStart, pick[0]));
      segStart = pick[0];
      while (text[segStart] === " " || text[segStart] === "\t") segStart++;
    }
    pieces.push(text.slice(segStart, b));
    out.push(pieces.map((p, j) => (j ? cont + p : p).replace(/[ \t]+$/, "")).join("\n"));
  }
  return out;   // one entry per input line (with newlines inside where it was broken)
}

// JS: candidates are right after these tokens, so a newline can never end a statement (no ASI change)
const AFTER = new Set([";", ",", "{", "(", "[", "=>", "||", "&&", "??", "?", ":", "${", "=", "+/-", "==/!=/===/!==", "</>/<=/>="]);
function jsCands(code) {
  const c = [];
  let prev = null;
  for (const t of acorn.tokenizer(code, { ecmaVersion: "latest", allowReturnOutsideFunction: true })) {
    if (prev && AFTER.has(prev.type.label) && t.start > prev.end - 1) {
      const gap = code.slice(prev.end, t.start);
      if (/^[ \t]*$/.test(gap) && t.type.label !== ";" && t.type.label !== ",") c.push([prev.end, prev.type.label === ";" ? 2 : ["(", "[", "${", "="].includes(prev.type.label) ? 0 : 1]);
    }
    prev = t;
  }
  return c;
}
// CSS: after } ; { outside strings, comments and parentheses (url() and data: URIs keep their ;)
function cssCands(css) {
  const c = [];
  let q = null, cm = false, depth = 0;
  for (let i = 0; i < css.length; i++) {
    const ch = css[i];
    if (cm) { if (ch === "*" && css[i + 1] === "/") { cm = false; i++; } continue; }
    if (q) { if (ch === "\\") { i++; continue; } if (ch === q) q = null; continue; }
    if (ch === "/" && css[i + 1] === "*") { cm = true; i++; continue; }
    if (ch === '"' || ch === "'") { q = ch; continue; }
    if (ch === "(" && /url$/i.test(css.slice(Math.max(0, i - 3), i)) && css[i + 1] !== '"' && css[i + 1] !== "'") {   // unquoted url(): skip it whole
      i = css.indexOf(")", i); continue;
    }
    if (ch === "," && css[i + 1] !== " " && css[i + 1] !== "\n") { c.push([i + 1, depth ? 0 : 1]); continue; }   // between list items: selectors, layers, arguments
    if (ch === "(") depth++; else if (ch === ")") depth = Math.max(0, depth - 1);
    else if (depth === 0 && (ch === "}" || ch === ";" || ch === "{")) {
      const nx = css[i + 1];
      if (nx !== "\n" && nx !== "}" && nx !== undefined) c.push([i + 1, 2]);
    }
  }
  return c;
}

const css0 = src.slice(cssA, cssB), js0 = src.slice(jsA, jsB);
const cssG = wrapText(css0, cssCands(css0)), jsG = wrapText(js0, jsCands(js0));
const css1 = cssG.join("\n"), js1 = jsG.join("\n");
const out = src.slice(0, cssA) + css1 + src.slice(cssB, jsA) + js1 + src.slice(jsB);
// every line of the joined file, replaced by its wrapped version, so the parts can be written back
const before = src.slice(0, cssA).split("\n").length - 1, mid = src.slice(cssB, jsA).split("\n").length - 1;
const all = src.split("\n"), groups = all.slice();
cssG.slice(0, -1).forEach((g, i) => (groups[before + i] = g));   // the last entry is the empty start of the </style> line
const jsStart = before + cssG.length - 1 + mid;
jsG.forEach((g, i) => (groups[jsStart + i] = g));
if (groups.join("\n") !== out) throw new Error("line map is off");

// ---- proofs ----
const strip = n => JSON.stringify(n, (k, v) => (k === "start" || k === "end" || k === "loc" || k === "range" ? undefined : v));
const p0 = strip(acorn.parse(js0, { ecmaVersion: "latest" })), p1 = strip(acorn.parse(js1, { ecmaVersion: "latest" }));
if (p0 !== p1) throw new Error("JS tree changed");
function cssTree(t) {
  const r = [];
  const cm = x => typeof x === "string" ? x.replace(/,\s+/g, ",") : x;   // space after a list comma means nothing in CSS
  postcss.parse(t).walk(n => r.push([n.type, cm(n.selector), n.prop, cm(n.value), n.important, n.name, n.params, n.text].map(x => x === undefined ? null : x)));
  return JSON.stringify(r);
}
if (cssTree(css0) !== cssTree(css1)) throw new Error("CSS rules changed");
// no character other than whitespace was added, removed or moved
const nows = s => s.replace(/\s+/g, "");
if (nows(src) !== nows(out)) throw new Error("non-space characters changed");
if (src.slice(0, cssA) !== out.slice(0, cssA) || src.slice(cssB, jsA) !== out.slice(cssB + (css1.length - css0.length), jsA + (css1.length - css0.length))) throw new Error("outside changed");
let k = 0;
names.forEach((n, i) => {
  const m = texts[i].split("\n").length - 1;
  fs.writeFileSync(path.join(SRC, n), groups.slice(k, k + m).join("\n") + "\n");
  k += m;
});
fs.writeFileSync(path.join(ROOT, "initiative.html"), out);
const longs = s => s.split("\n").filter(l => l.length > LIMIT).length;
console.log(`css: ${longs(css0)} -> ${longs(css1)} lines over ${LIMIT}; js: ${longs(js0)} -> ${longs(js1)}; lines ${src.split("\n").length} -> ${out.split("\n").length}; bytes ${src.length} -> ${out.length}`);
console.log("proof: JS tree identical, CSS rules identical, only whitespace differs");
