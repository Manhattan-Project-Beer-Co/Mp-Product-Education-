#!/usr/bin/env node
/**
 * Creates a Microsoft Entra app registration and writes Azure auth env vars.
 * Run once: npm run setup:microsoft -- --admin-email=you@company.com
 *
 * Optional: set RENDER_API_KEY to push env vars to Render automatically.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { DeviceCodeCredential } from "@azure/identity";
import { Client } from "@microsoft/microsoft-graph-client";
import { TokenCredentialAuthenticationProvider } from "@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const ENV_PATH = path.join(ROOT, ".env");
const APP_NAME = "MP Staff Training Portal";
const PRODUCTION_URL = "https://mp-product-education.onrender.com";
const LOCAL_URL = "http://localhost:8080";

function parseArgs(argv) {
  const args = { adminEmail: "", renderService: "mp-product-education" };
  for (const arg of argv) {
    if (arg.startsWith("--admin-email=")) args.adminEmail = arg.slice("--admin-email=".length).trim();
    if (arg.startsWith("--render-service=")) args.renderService = arg.slice("--render-service=".length).trim();
  }
  return args;
}

function upsertEnvFile(values) {
  const lines = fs.existsSync(ENV_PATH)
    ? fs.readFileSync(ENV_PATH, "utf8").split("\n")
    : fs.readFileSync(path.join(ROOT, ".env.example"), "utf8").split("\n");

  const keys = new Set(Object.keys(values));
  const out = [];
  const seen = new Set();

  for (let line of lines) {
    const match = line.match(/^([A-Z0-9_]+)=/);
    if (match && keys.has(match[1])) {
      out.push(`${match[1]}=${values[match[1]]}`);
      seen.add(match[1]);
    } else {
      out.push(line);
    }
  }

  for (const [key, value] of Object.entries(values)) {
    if (!seen.has(key)) out.push(`${key}=${value}`);
  }

  fs.writeFileSync(ENV_PATH, out.filter((line, idx, arr) => !(idx === arr.length - 1 && line === "")).join("\n") + "\n");
}

async function createGraphClient() {
  const credential = new DeviceCodeCredential({
    tenantId: "organizations",
    clientId: "14d82eec-204b-4c2f-b7e8-296a70dab67e",
    userPromptCallback: (info) => {
      console.log("\nMicrosoft sign-in required to create the app registration:\n");
      console.log(info.message);
      console.log("");
    }
  });

  const authProvider = new TokenCredentialAuthenticationProvider(credential, {
    scopes: ["https://graph.microsoft.com/.default"]
  });

  return Client.initWithMiddleware({ authProvider });
}

async function createAzureApp(graph) {
  const redirectUris = [
    `${PRODUCTION_URL}/api/auth/microsoft/callback`,
    `${LOCAL_URL}/api/auth/microsoft/callback`
  ];

  const app = await graph.api("/applications").post({
    displayName: APP_NAME,
    signInAudience: "AzureADMultipleOrgs",
    web: {
      redirectUris,
      implicitGrantSettings: {
        enableIdTokenIssuance: false,
        enableAccessTokenIssuance: false
      }
    }
  });

  await graph.api("/servicePrincipals").post({ appId: app.appId });

  const secret = await graph.api(`/applications/${app.id}/addPassword`).post({
    passwordCredential: {
      displayName: "mp-staff-training",
      endDateTime: new Date(Date.now() + 1000 * 60 * 60 * 24 * 730).toISOString()
    }
  });

  return {
    clientId: app.appId,
    clientSecret: secret.secretText,
    tenantId: "organizations"
  };
}

async function pushToRender(serviceName, envVars) {
  const apiKey = process.env.RENDER_API_KEY;
  if (!apiKey) return false;

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    Accept: "application/json"
  };

  const servicesRes = await fetch("https://api.render.com/v1/services?limit=100", { headers });
  if (!servicesRes.ok) throw new Error(`Render services lookup failed: ${servicesRes.status}`);
  const servicesPayload = await servicesRes.json();
  const match = servicesPayload.find((entry) => entry.service?.name === serviceName);
  if (!match?.service?.id) throw new Error(`Render service not found: ${serviceName}`);

  const serviceId = match.service.id;
  for (const [key, value] of Object.entries(envVars)) {
    const res = await fetch(`https://api.render.com/v1/services/${serviceId}/env-vars`, {
      method: "POST",
      headers,
      body: JSON.stringify({ envVar: { key, value } })
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Failed to set ${key} on Render: ${res.status} ${body}`);
    }
  }

  return true;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.adminEmail) {
    console.error("Usage: npm run setup:microsoft -- --admin-email=you@company.com");
    console.error("Optional: RENDER_API_KEY=... to push env vars to Render automatically.");
    process.exit(1);
  }

  console.log("Creating Microsoft Entra app registration...");
  const graph = await createGraphClient();
  const azure = await createAzureApp(graph);

  const envValues = {
    AZURE_CLIENT_ID: azure.clientId,
    AZURE_CLIENT_SECRET: azure.clientSecret,
    AZURE_TENANT_ID: azure.tenantId,
    APP_BASE_URL: PRODUCTION_URL,
    AZURE_ADMIN_EMAILS: args.adminEmail
  };

  upsertEnvFile({
    ...envValues,
    APP_BASE_URL: LOCAL_URL
  });

  console.log("\nLocal .env updated.");
  console.log(`AZURE_CLIENT_ID=${azure.clientId}`);
  console.log("AZURE_CLIENT_SECRET=***");
  console.log(`AZURE_ADMIN_EMAILS=${args.adminEmail}`);

  const renderEnv = { ...envValues };
  if (process.env.RENDER_API_KEY) {
    console.log("\nPushing env vars to Render...");
    await pushToRender(args.renderService, renderEnv);
    console.log("Render env vars updated. Redeploy will pick them up automatically.");
  } else {
    console.log("\nRender: add these env vars in the dashboard, then redeploy:");
    for (const [key, value] of Object.entries(renderEnv)) {
      console.log(`${key}=${key.includes("SECRET") ? "***" : value}`);
    }
    console.log("\nOr rerun with RENDER_API_KEY set to push automatically.");
  }

  console.log("\nDone. Restart the server locally, then sign in with Microsoft.");
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
