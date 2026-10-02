const path = require('path');
const puppeteer = require(path.join(__dirname, '../frontend/node_modules/puppeteer'));

const ARTIFACT_DIR = 'C:\\Users\\Harsh Mishra\\.gemini\\antigravity\\brain\\c131cbbd-8177-445f-ae8b-7c4cc46d6a55';

(async () => {
  console.log("Starting Puppeteer browser session with system Chrome...");
  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: "new",
    defaultViewport: { width: 1400, height: 900 }
  });
  const page = await browser.newPage();

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // 0. Login
  console.log("Navigating to Login http://localhost:5173/login...");
  await page.goto("http://localhost:5173/login", { waitUntil: "networkidle0" });
  await wait(500);

  await page.type("input[type='email']", "admin@cryptotrace.gov.in");
  await page.type("input[type='password']", "CT@2026#Quasar");
  await page.click("button[type='submit']");
  await wait(1500); // Wait for auth token & redirect to /

  // 1. Dashboard Page (Default Light Theme, Stat Card Icons, Active Sidebar, INR Loss amounts)
  console.log("Navigating to Dashboard http://localhost:5173...");
  await page.goto("http://localhost:5173", { waitUntil: "networkidle0" });
  await wait(1000);
  const screenshot1Path = path.join(ARTIFACT_DIR, "01_light_theme_dashboard.png");
  await page.screenshot({ path: screenshot1Path, fullPage: true });
  console.log(`Saved screenshot 1: ${screenshot1Path}`);

  // 2. TRON Chain Mismatch Inline Warning
  console.log("Navigating to Fund Flow Tracing page http://localhost:5173/fund-flow...");
  await page.goto("http://localhost:5173/fund-flow", { waitUntil: "networkidle0" });
  await wait(1000);

  // Select input and type TRON address while chain is ETHEREUM
  await page.type("input.mono-address", "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t");
  await page.select("form select", "ethereum"); // select ethereum chain
  await wait(500);

  const screenshot2Path = path.join(ARTIFACT_DIR, "02_tron_chain_mismatch.png");
  await page.screenshot({ path: screenshot2Path, fullPage: true });
  console.log(`Saved screenshot 2: ${screenshot2Path}`);

  // 3. Duplicate Case Prompt Modal
  console.log("Selecting TRON chain to test duplicate case prompt...");
  await page.select("form select", "tron");
  await wait(500);

  // Click Start Trace button
  const submitBtn = await page.$("button[type='submit']");
  if (submitBtn) {
    await submitBtn.click();
    await wait(1500); // wait for 409 API response and modal rendering
  }

  const screenshot3Path = path.join(ARTIFACT_DIR, "03_duplicate_case_modal.png");
  await page.screenshot({ path: screenshot3Path, fullPage: true });
  console.log(`Saved screenshot 3: ${screenshot3Path}`);

  // 4. Reports Page INR formatting
  console.log("Navigating to Reports page http://localhost:5173/reports...");
  await page.goto("http://localhost:5173/reports", { waitUntil: "networkidle0" });
  await wait(1000);

  const screenshot4Path = path.join(ARTIFACT_DIR, "04_reports_page_inr.png");
  await page.screenshot({ path: screenshot4Path, fullPage: true });
  console.log(`Saved screenshot 4: ${screenshot4Path}`);

  await browser.close();
  console.log("Puppeteer screenshot verification completed successfully!");
})();
