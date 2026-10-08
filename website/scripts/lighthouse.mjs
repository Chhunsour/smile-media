import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const reportDirectory = path.join(root, "qa");
await mkdir(reportDirectory, { recursive: true });
const cli = fileURLToPath(import.meta.resolve("lighthouse/cli/index.js"));
const args = [cli, process.env.CHECK_SITE_URL || "http://localhost:3000", "--chrome-flags=--headless=new", "--only-categories=performance,seo,accessibility,best-practices", "--output=json", "--output=html", `--output-path=${path.join(reportDirectory, "mobile-lighthouse")}`, "--quiet"];
const status = await new Promise((resolve, reject) => {
  const child = spawn(process.execPath, args, { stdio: "inherit" });
  child.on("error", reject);
  child.on("exit", resolve);
});
if (status !== 0) process.exit(status || 1);
const report = JSON.parse(await readFile(path.join(reportDirectory, "mobile-lighthouse.report.json"), "utf8"));
const scores = Object.fromEntries(Object.entries(report.categories).map(([key, value]) => [key, value.score === null ? null : Math.round(value.score * 100)]));
await writeFile(path.join(reportDirectory, "lighthouse-scores.json"), JSON.stringify({ mode: "mobile", chrome: report.environment.hostUserAgent, scores }, null, 2));
console.log(scores);
if (Object.values(scores).some(score => score === null || score < 90)) process.exitCode = 1;
