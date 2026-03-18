import { defineConfig, devices } from "@playwright/test";
import path from "node:path";

const supportedEnvironments = ["local", "prod"] as const;
const requestedEnvironment = (process.env.ENV ?? "local").toLowerCase();

if (
  !supportedEnvironments.includes(
    requestedEnvironment as (typeof supportedEnvironments)[number],
  )
) {
  throw new Error(
    `Unsupported ENV "${requestedEnvironment}". Use one of: ${supportedEnvironments.join(", ")}.`,
  );
}

const environment = requestedEnvironment as (typeof supportedEnvironments)[number];

const baseURLs = {
  local: process.env.E2E_LOCAL_BASE_URL ?? "http://localhost:5173",
  prod:
    process.env.E2E_PROD_BASE_URL ??
    "https://mro.aws.cloudmrhub.com/main",
} as const;

const baseURL = baseURLs[environment];
const useAuthState = ["1", "true", "yes"].includes(
  (process.env.USE_AUTH_STATE ?? "").toLowerCase(),
);
const authStatePath = path.join(process.cwd(), "playwright", ".auth", "auth.json");
const isCI = !!process.env.CI;

const localServerUrl = new URL(baseURLs.local);
const localServerHost = localServerUrl.hostname;
const localServerPort =
  localServerUrl.port || (localServerUrl.protocol === "https:" ? "443" : "80");

const chromiumProject = {
  name: "chromium",
  testIgnore: /auth\.setup\.ts/,
  use: {
    ...devices["Desktop Chrome"],
    ...(useAuthState ? { storageState: authStatePath } : {}),
  },
};

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "on", // Changed from "retain-on-failure"
  },
  projects: useAuthState
    ? [
        {
          name: "setup",
          testMatch: /auth\.setup\.ts/,
          use: {
            ...devices["Desktop Chrome"],
          },
        },
        {
          ...chromiumProject,
          dependencies: ["setup"],
        },
      ]
    : [chromiumProject],
  ...(environment === "local"
    ? {
        webServer: {
          command: `npx vite --host ${localServerHost} --port ${localServerPort} --strictPort`,
          url: baseURLs.local,
          reuseExistingServer: !isCI,
          timeout: 120_000,
        },
      }
    : {}),
});
