#!/usr/bin/env node
// Syntax-checks every tracked .js file and every inline <script> block in every
// tracked .html file.
//
// The inline blocks are the point. index.html carries a single ~6,300-line
// script, and a parse error anywhere in it means the browser executes none of
// it: no bootstrap, no event handlers, every button dead, while the server
// happily returns 200 for the page. That shipped once — a regex literal written
// as /<\//textarea/gi, whose second slash closed the pattern and left
// "textarea/gi" to be read as flags — and the site was unusable until someone
// opened it in a browser and noticed.

const { execFileSync } = require("child_process");
const fs = require("fs");
const vm = require("vm");

function trackedFiles() {
  return execFileSync("git", ["ls-files"], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 })
    .split("\n")
    .map((f) => f.trim())
    .filter(Boolean);
}

let failures = 0;
let checked = 0;

// Compiling is enough: it parses without running, so browser globals and
// require() calls are irrelevant. lineOffset makes reported line numbers refer
// to the real file rather than to the extracted block.
function checkSource(code, filename, lineOffset = 0) {
  checked++;
  try {
    new vm.Script(code, { filename, lineOffset });
  } catch (err) {
    failures++;
    console.error(`FAIL  ${filename}: ${err.message}`);
    if (err.stack) {
      const location = err.stack.split("\n").slice(0, 3).join("\n");
      console.error(
        location
          .split("\n")
          .map((l) => `        ${l}`)
          .join("\n")
      );
    }
  }
}

// Matches how a browser finds script content: the block ends at the first
// closing tag, so this agrees with what actually gets executed.
const SCRIPT_BLOCK = /<script([^>]*)>([\s\S]*?)<\/script\s*>/gi;

function checkHtml(file) {
  const source = fs.readFileSync(file, "utf8");
  let match;
  let found = 0;

  while ((match = SCRIPT_BLOCK.exec(source)) !== null) {
    const [full, attributes, code] = match;
    // External scripts have nothing inline to parse.
    if (/\bsrc\s*=/i.test(attributes)) continue;
    // Non-JavaScript payloads (JSON-LD, templates) are not ours to parse.
    const type = /\btype\s*=\s*["']?([^"'\s>]+)/i.exec(attributes);
    if (type && !/^(text\/javascript|application\/javascript|module)$/i.test(type[1])) continue;
    if (!code.trim()) continue;

    const openTagLength = full.indexOf(">") + 1;
    const before = source.slice(0, match.index + openTagLength);
    const lineOffset = (before.match(/\n/g) || []).length;

    found++;
    checkSource(code, file, lineOffset);
  }

  if (found === 0) console.log(`note  ${file}: no inline script blocks found`);
}

for (const file of trackedFiles()) {
  if (file.endsWith(".js")) checkSource(fs.readFileSync(file, "utf8"), file);
  else if (file.endsWith(".html")) checkHtml(file);
}

if (failures) {
  console.error(`\n${failures} of ${checked} script(s) failed to parse.`);
  process.exit(1);
}

console.log(`All ${checked} script(s) parse cleanly.`);
