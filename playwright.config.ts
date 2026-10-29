import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e", fullyParallel: true, workers: 2,
  forbidOnly: !!process.env.CI, retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  timeout: 45000, expect: { timeout: 10000 },
  use: { baseURL: "http://127.0.0.1:3100", trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chromium", use: { ...devices["Pixel 7"], defaultBrowserType: "chromium" } },
  ],
  webServer: { command: "npm run dev -- --webpack --hostname 127.0.0.1 --port 3100", url: "http://127.0.0.1:3100/workspace", reuseExistingServer: false, timeout: 180000,
    env: { NEXT_DIST_DIR: ".next-e2e", GEMINI_API_KEY: "test-only-not-a-real-key", NEXT_PUBLIC_MAPBOX_TOKEN: "", NEXT_TELEMETRY_DISABLED: "1" } },
});
