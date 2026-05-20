import { readFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { build } from "esbuild";
import { Miniflare } from "miniflare";

const root = new URL("..", import.meta.url).pathname;
const outdir = join(root, ".tmp", "cloudwarden-smoke");
const bundle = join(outdir, "worker.mjs");
const base = "http://cloudwarden.test";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function requestJson(mf, path, init = {}, expectedStatus = 200) {
  const response = await mf.dispatchFetch(`${base}${path}`, {
    ...init,
    headers: {
      ...(init.body instanceof FormData ? {} : { "content-type": "application/json" }),
      ...(init.headers ?? {}),
    },
  });
  const text = await response.text();
  assert(response.status === expectedStatus, `${init.method ?? "GET"} ${path} expected ${expectedStatus}, got ${response.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

await mkdir(outdir, { recursive: true });
await build({
  entryPoints: [join(root, "src/index.ts")],
  outfile: bundle,
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
});

const mf = new Miniflare({
  rootPath: outdir,
  modules: true,
  scriptPath: "worker.mjs",
  compatibilityDate: "2026-05-01",
  compatibilityFlags: ["nodejs_compat"],
  d1Databases: { DB: "cloudwarden-smoke-db" },
  r2Buckets: { ATTACHMENTS: "cloudwarden-smoke-attachments" },
  bindings: {
    JWT_SECRET: "smoke-test-secret",
    SIGNUPS_ALLOWED: "true",
    SERVER_NAME: "CloudWarden Smoke",
  },
});

try {
  const db = await mf.getD1Database("DB");
  const migration = await readFile(join(root, "migrations/0001_initial.sql"), "utf8");
  for (const statement of migration.split(";").map((part) => part.trim()).filter(Boolean)) {
    await db.prepare(statement).run();
  }

  const alive = await requestJson(mf, "/alive");
  assert(alive.status === "ok", "health check failed");

  const register = await requestJson(mf, "/api/accounts/register", {
    method: "POST",
    body: JSON.stringify({
      Email: "owner@example.com",
      Name: "Owner",
      MasterPasswordHash: "hashed-master-password",
      Key: "encrypted-user-key",
      Keys: {
        PublicKey: "public-key",
        PrivateKey: "private-key",
      },
      Kdf: 0,
      KdfIterations: 600000,
    }),
  }, 201);
  assert(register.Email === "owner@example.com", "registration did not return profile");

  const prelogin = await requestJson(mf, "/identity/accounts/prelogin", {
    method: "POST",
    body: JSON.stringify({ Email: "owner@example.com" }),
  });
  assert(prelogin.KdfIterations === 600000, "prelogin did not return stored KDF iterations");

  const token = await requestJson(mf, "/identity/connect/token", {
    method: "POST",
    body: JSON.stringify({
      grant_type: "password",
      username: "owner@example.com",
      password: "hashed-master-password",
      device_identifier: "smoke-device",
      device_name: "Smoke Test",
      device_type: "21",
    }),
  });
  assert(typeof token.access_token === "string", "password login did not return an access token");
  assert(typeof token.refresh_token === "string", "password login did not return a refresh token");

  const auth = { authorization: `Bearer ${token.access_token}` };

  const folder = await requestJson(mf, "/api/folders", {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ Name: "Personal" }),
  }, 201);
  assert(folder.Name === "Personal", "folder creation failed");

  const cipher = await requestJson(mf, "/api/ciphers", {
    method: "POST",
    headers: auth,
    body: JSON.stringify({
      Type: 1,
      FolderId: folder.Id,
      Name: "Example Login",
      Notes: "encrypted-notes",
      Login: {
        Username: "encrypted-user",
        Password: "encrypted-password",
        Uris: [{ Uri: "https://example.com", Match: null }],
      },
      Favorite: true,
    }),
  }, 201);
  assert(cipher.Name === "Example Login", "cipher creation failed");
  assert(cipher.FolderId === folder.Id, "cipher folder assignment failed");

  const send = await requestJson(mf, "/api/sends", {
    method: "POST",
    headers: auth,
    body: JSON.stringify({
      Type: 0,
      Name: "Shared Text",
      Text: { Text: "encrypted-send-text", Hidden: false },
      Key: "encrypted-send-key",
    }),
  }, 201);
  assert(send.Name === "Shared Text", "send creation failed");

  await requestJson(mf, "/api/ciphers/import", {
    method: "POST",
    headers: auth,
    body: JSON.stringify({
      Folders: [{ Name: "Imported" }],
      Ciphers: [{
        Type: 2,
        Name: "Imported Note",
        SecureNote: { Type: 0 },
        Notes: "encrypted-imported-note",
      }],
      FolderRelationships: [{ Key: 0, Value: 0 }],
    }),
  }, 204);

  const sync = await requestJson(mf, "/api/sync", { headers: auth });
  assert(sync.Profile.Email === "owner@example.com", "sync profile missing");
  assert(sync.Folders.length === 2, "sync folders missing");
  assert(sync.Ciphers.length === 2, "sync ciphers missing");
  assert(sync.Sends.length === 1, "sync sends missing");

  const refreshed = await requestJson(mf, "/identity/connect/token", {
    method: "POST",
    body: JSON.stringify({
      grant_type: "refresh_token",
      refresh_token: token.refresh_token,
    }),
  });
  assert(typeof refreshed.access_token === "string", "refresh token flow failed");

  console.log("Smoke test passed: register, login, refresh, sync, folders, ciphers, import, and sends are working.");
} finally {
  await mf.dispose();
}
