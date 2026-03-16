import fs from "node:fs";
import path from "node:path";

const ignoredDirectories = new Set([
  ".git",
  ".next",
  ".vercel",
  "coverage",
  "dist",
  "node_modules",
  "out",
]);

const duplicateCopyPattern = / \d+\.[^.]+$/;
const repoRoot = process.cwd();
const matches = [];

function walk(directory) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        walk(path.join(directory, entry.name));
      }
      continue;
    }

    if (duplicateCopyPattern.test(entry.name)) {
      matches.push(path.relative(repoRoot, path.join(directory, entry.name)));
    }
  }
}

walk(repoRoot);

if (matches.length === 0) {
  console.log("Repo hygiene check passed.");
  process.exit(0);
}

console.error("Repo hygiene check failed. Remove duplicate copy files:");
for (const match of matches.sort()) {
  console.error(`- ${match}`);
}
process.exit(1);
