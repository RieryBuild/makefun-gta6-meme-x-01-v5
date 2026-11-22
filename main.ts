// main.ts — gta6-meme-x-01 round 6 ("Wait-Damage Claim").
// Reads POST.json next to this file, validates the X post URL it names,
// and writes the canonical POST.json into MAKEFUN_OUTPUT_DIR only.
// Node 22, stdlib only, zero dependencies.
//
// POST.json shape (per the competition's RULES.txt):
//   {"url": "https://x.com/<handle>/status/<id>"}
// Accepted hosts: x.com / twitter.com, with optional www. or mobile. prefix,
// and /i/web/status/<id> paths. The id must be digits only. Any query string
// or fragment is stripped; the output is the canonical X address.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HOSTS = new Set([
  "x.com",
  "www.x.com",
  "mobile.x.com",
  "twitter.com",
  "www.twitter.com",
  "mobile.twitter.com",
]);

function fail(message: string): never {
  console.error(`error: ${message}`);
  process.exit(1);
}

function canonicalPostUrl(raw: unknown): string {
  if (typeof raw !== "string" || raw.length === 0) {
    fail("POST.json must be a JSON object with a string \"url\" field");
  }
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    fail(`POST.json "url" is not a valid URL: ${raw}`);
  }
  if (parsed.protocol !== "https:") {
    fail(`post URL must use https, got ${parsed.protocol}`);
  }
  if (parsed.port !== "") {
    fail(`post URL must not carry a port, got ${parsed.port}`);
  }
  const host = parsed.hostname.toLowerCase();
  if (!HOSTS.has(host)) {
    fail(`post URL host must be x.com or twitter.com, got ${host}`);
  }
  const match = parsed.pathname.match(
    /^\/(?:i\/web\/status\/(\d+)|([A-Za-z0-9_]{1,15})\/status\/(\d+))$/,
  );
  if (!match) {
    fail(
      "post URL must look like https://x.com/<handle>/status/<digits> " +
        `(got path ${parsed.pathname})`,
    );
  }
  const id = match[1] ?? match[3];
  const handle = match[2] ?? null;
  return handle === null
    ? `https://x.com/i/web/status/${id}`
    : `https://x.com/${handle}/status/${id}`;
}

const here = dirname(fileURLToPath(import.meta.url));
const postPath = join(here, "POST.json");

let rawText: string;
try {
  rawText = readFileSync(postPath, "utf8");
} catch {
  fail("POST.json not found next to main.ts");
}

// The gate caps POST.json at 16384 bytes (post_file check).
if (Buffer.byteLength(rawText, "utf8") > 16384) {
  fail("POST.json is larger than the 16384-byte cap");
}

let data: unknown;
try {
  data = JSON.parse(rawText);
} catch {
  fail("POST.json is not valid JSON");
}

const urlValue =
  typeof data === "string"
    ? data
    : data !== null && typeof data === "object"
      ? (data as Record<string, unknown>)["url"]
      : undefined;

const canonical = canonicalPostUrl(urlValue);

const outDir = process.env["MAKEFUN_OUTPUT_DIR"];
if (!outDir) {
  fail("MAKEFUN_OUTPUT_DIR is not set");
}
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "POST.json"), JSON.stringify({ url: canonical }) + "\n", "utf8");
console.log("entry link OK");
