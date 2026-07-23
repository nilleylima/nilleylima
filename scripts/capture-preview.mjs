import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";

const OUT = "/opt/cursor/artifacts/screenshots";
const BASE = "http://localhost:3000";

fs.mkdirSync(OUT, { recursive: true });

async function shot(page, name, url) {
  await page.goto(url, { waitUntil: "networkidle0", timeout: 30000 });
  await new Promise((r) => setTimeout(r, 1000));
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log("saved", file);
}

const browser = await puppeteer.launch({
  executablePath: "/usr/local/bin/google-chrome",
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--window-size=1440,900"],
  defaultViewport: { width: 1440, height: 900 },
});

const page = await browser.newPage();

await shot(page, "01-landing", `${BASE}/`);
await shot(page, "02-login", `${BASE}/login`);

// login page already pre-fills demo credentials
await page.goto(`${BASE}/login`, { waitUntil: "networkidle0" });
await page.waitForSelector("form button");
await page.click("form button");
await page.waitForFunction(() => location.pathname.startsWith("/app"), {
  timeout: 20000,
});
await new Promise((r) => setTimeout(r, 1800));
await page.screenshot({
  path: path.join(OUT, "03-dashboard.png"),
  fullPage: false,
});
console.log("saved dashboard");

for (const [name, route] of [
  ["04-contas", "/app/contas"],
  ["05-lancamentos", "/app/lancamentos"],
  ["06-pagar-receber", "/app/pagar-receber"],
  ["07-relatorios", "/app/relatorios"],
]) {
  await shot(page, name, `${BASE}${route}`);
}

await page.setViewport({ width: 390, height: 844, isMobile: true });
await page.goto(`${BASE}/`, { waitUntil: "networkidle0" });
// if redirected to app because session exists, logout first via API
await page.goto(`${BASE}/api/auth/logout`, { waitUntil: "networkidle0" }).catch(() => {});
await page.setRequestInterception(false);
await page.evaluate(async () => {
  await fetch("/api/auth/logout", { method: "POST" });
});
await shot(page, "08-landing-mobile", `${BASE}/`);

await browser.close();
console.log("done");
