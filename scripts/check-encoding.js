#!/usr/bin/env node
// Verifies every tracked text file is valid UTF-8 and carries no byte-order
// mark.
//
// Nixpacks reads source files as strict UTF-8 and aborts the build on the first
// invalid byte, so a single stray character fails the deploy with a message
// that points at the file but not at the position. A BOM is a separate hazard:
// it is valid UTF-8, but at the top of a .js file it becomes part of the first
// token.
//
// This exists because both failure modes shipped: a CP1252 em-dash (0x97) in
// server.js broke the build, and node --check did not catch it because the
// bytes sat inside a comment and parsed fine.

const { execFileSync } = require("child_process");
const fs = require("fs");

function trackedFiles() {
  return execFileSync("git", ["ls-files"], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 })
    .split("\n")
    .map((f) => f.trim())
    .filter(Boolean);
}

// Mirrors git's own heuristic: a NUL in the leading bytes means binary, and a
// binary file has no business being checked for text encoding.
function looksBinary(buf) {
  return buf.subarray(0, 8000).includes(0);
}

// Returns the offsets of every byte that breaks UTF-8, with its line number.
function findInvalidSequences(buf) {
  const bad = [];
  let i = 0;
  let line = 1;

  while (i < buf.length) {
    const b = buf[i];
    if (b === 0x0a) {
      line++;
      i++;
      continue;
    }
    if (b < 0x80) {
      i++;
      continue;
    }

    let continuationBytes;
    if (b >= 0xc2 && b <= 0xdf) continuationBytes = 1;
    else if (b >= 0xe0 && b <= 0xef) continuationBytes = 2;
    else if (b >= 0xf0 && b <= 0xf4) continuationBytes = 3;
    else {
      bad.push({ offset: i, line, byte: b });
      i++;
      continue;
    }

    let valid = true;
    for (let k = 1; k <= continuationBytes; k++) {
      const next = buf[i + k];
      if (next === undefined || next < 0x80 || next > 0xbf) {
        valid = false;
        break;
      }
    }

    if (valid) {
      i += continuationBytes + 1;
    } else {
      bad.push({ offset: i, line, byte: b });
      i++;
    }
  }

  return bad;
}

function context(buf, offset) {
  const from = Math.max(0, offset - 45);
  return buf
    .subarray(from, offset + 45)
    .toString("latin1")
    .replace(/\r?\n/g, "\\n");
}

let failures = 0;
let checked = 0;

for (const file of trackedFiles()) {
  let buf;
  try {
    buf = fs.readFileSync(file);
  } catch {
    continue; // Deleted or unreadable in this checkout; git ls-files can be ahead.
  }
  if (looksBinary(buf)) continue;
  checked++;

  if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    failures++;
    console.error(`FAIL  ${file}: starts with a UTF-8 byte-order mark; save without a BOM`);
  }

  for (const bad of findInvalidSequences(buf).slice(0, 10)) {
    failures++;
    console.error(
      `FAIL  ${file}:${bad.line}: invalid UTF-8 byte 0x${bad.byte.toString(16)} at offset ${bad.offset}\n` +
        `        ...${context(buf, bad.offset)}...`
    );
  }
}

if (failures) {
  console.error(`\n${failures} encoding problem(s) across ${checked} text file(s).`);
  process.exit(1);
}

console.log(`All ${checked} tracked text files are valid UTF-8 with no BOM.`);
