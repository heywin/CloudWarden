const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
};

const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  "access-control-allow-headers": "authorization,content-type,device-type,bitwarden-client-name,bitwarden-client-version",
};

type AnyRecord = Record<string, unknown>;

type UserRow = {
  id: string;
  email: string;
  name: string | null;
  master_password_hash: string;
  key: string | null;
  public_key: string | null;
  private_key: string | null;
  security_stamp: string;
  kdf: number;
  kdf_iterations: number;
  kdf_memory: number | null;
  kdf_parallelism: number | null;
  creation_date: string;
  revision_date: string;
};

type FolderRow = {
  id: string;
  user_id: string;
  name: string;
  creation_date: string;
  revision_date: string;
};

type CipherRow = {
  id: string;
  user_id: string;
  organization_id: string | null;
  folder_id: string | null;
  type: number;
  name: string | null;
  notes: string | null;
  favorite: number;
  reprompt: number;
  login: string | null;
  secure_note: string | null;
  card: string | null;
  identity: string | null;
  fields: string | null;
  password_history: string | null;
  key: string | null;
  creation_date: string;
  revision_date: string;
  deleted_date: string | null;
};

type AttachmentRow = {
  id: string;
  user_id: string;
  cipher_id: string;
  file_name: string;
  attachment_key: string | null;
  size: number;
  r2_key: string;
  creation_date: string;
  revision_date: string;
};

type SendRow = {
  id: string;
  user_id: string;
  type: number;
  name: string | null;
  notes: string | null;
  text: string | null;
  file: string | null;
  key: string | null;
  max_access_count: number | null;
  access_count: number;
  revision_date: string;
  creation_date: string;
  deletion_date: string;
  expiration_date: string | null;
  disabled: number;
  hide_email: number;
  password_hash: string | null;
};

type AuthContext = {
  user: UserRow;
  token: AnyRecord;
};

function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(CORS_HEADERS)) headers.set(key, value);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function json(data: unknown, init: ResponseInit = {}): Response {
  return withCors(new Response(JSON.stringify(data), {
    ...init,
    headers: { ...JSON_HEADERS, ...(init.headers ?? {}) },
  }));
}

function empty(status = 204): Response {
  return withCors(new Response(null, { status, headers: { "cache-control": "no-store" } }));
}

function error(status: number, message: string, extra: AnyRecord = {}): Response {
  return json({
    Object: "error",
    Message: message,
    ValidationErrors: {},
    ...extra,
  }, { status });
}

function now(): string {
  return new Date().toISOString();
}

function uuid(): string {
  return crypto.randomUUID();
}

function normalizeEmail(email: unknown): string {
  return String(email ?? "").trim().toLowerCase();
}

function boolFromEnv(value: string | undefined, fallback: boolean): boolean {
  if (value == null || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function pick<T = unknown>(body: AnyRecord, ...names: string[]): T | undefined {
  for (const name of names) {
    if (Object.prototype.hasOwnProperty.call(body, name)) return body[name] as T;
    const lower = name.charAt(0).toLowerCase() + name.slice(1);
    if (Object.prototype.hasOwnProperty.call(body, lower)) return body[lower] as T;
    const upper = name.charAt(0).toUpperCase() + name.slice(1);
    if (Object.prototype.hasOwnProperty.call(body, upper)) return body[upper] as T;
  }
  return undefined;
}

function maybeString(value: unknown): string | null {
  if (value == null) return null;
  return String(value);
}

function maybeNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function asNumber(value: unknown, fallback = 0): number {
  const numeric = maybeNumber(value);
  return numeric == null ? fallback : numeric;
}

function asBooleanNumber(value: unknown, fallback = 0): number {
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "number") return value ? 1 : 0;
  if (typeof value === "string") return ["true", "1", "yes", "on"].includes(value.toLowerCase()) ? 1 : 0;
  return fallback;
}

function parseJson<T>(text: string | null, fallback: T): T {
  if (!text) return fallback;
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

function stringifyJson(value: unknown): string | null {
  if (value == null) return null;
  return JSON.stringify(value);
}

async function readJson(request: Request): Promise<AnyRecord> {
  const text = await request.text();
  if (!text) return {};
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/x-www-form-urlencoded")) {
    return Object.fromEntries(new URLSearchParams(text));
  }
  try {
    return JSON.parse(text) as AnyRecord;
  } catch {
    return {};
  }
}

function base64Url(bytes: ArrayBuffer | Uint8Array): string {
  const array = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (const byte of array) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function utf8(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

async function sha256(value: string): Promise<string> {
  return base64Url(await crypto.subtle.digest("SHA-256", utf8(value)));
}

async function hmac(secret: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", utf8(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return base64Url(await crypto.subtle.sign("HMAC", key, utf8(value)));
}

async function signJwt(env: Env, payload: AnyRecord, expiresInSeconds: number): Promise<string> {
  const secret = env.JWT_SECRET ?? "cloudwarden-dev-secret-change-me";
  const issued = Math.floor(Date.now() / 1000);
  const header = base64Url(utf8(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const body = base64Url(utf8(JSON.stringify({
    nbf: issued,
    iat: issued,
    exp: issued + expiresInSeconds,
    iss: "CloudWarden",
    aud: "Bitwarden",
    ...payload,
  })));
  const signature = await hmac(secret, `${header}.${body}`);
  return `${header}.${body}.${signature}`;
}

async function verifyJwt(env: Env, token: string): Promise<AnyRecord | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const expected = await hmac(env.JWT_SECRET ?? "cloudwarden-dev-secret-change-me", `${parts[0]}.${parts[1]}`);
  if (expected !== parts[2]) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(parts[1]))) as AnyRecord;
    if (typeof payload.exp === "number" && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

async function requireAuth(env: Env, request: Request): Promise<AuthContext | Response> {
  const auth = request.headers.get("authorization") ?? "";
  const match = auth.match(/^Bearer\s+(.+)$/i);
  if (!match) return error(401, "Missing bearer token");
  const token = await verifyJwt(env, match[1]);
  if (!token?.sub) return error(401, "Invalid bearer token");
  const user = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(String(token.sub)).first<UserRow>();
  if (!user) return error(401, "User no longer exists");
  return { user, token };
}

async function getUserByEmail(env: Env, email: string): Promise<UserRow | null> {
  return env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(normalizeEmail(email)).first<UserRow>();
}

async function usersCount(env: Env): Promise<number> {
  const row = await env.DB.prepare("SELECT COUNT(*) AS count FROM users").first<{ count: number }>();
  return row?.count ?? 0;
}

function profileObject(user: UserRow): AnyRecord {
  return {
    Object: "profile",
    Id: user.id,
    Name: user.name,
    Email: user.email,
    EmailVerified: true,
    Premium: true,
    MasterPasswordHint: null,
    Culture: "en-US",
    TwoFactorEnabled: false,
    Key: user.key,
    PublicKey: user.public_key,
    PrivateKey: user.private_key,
    SecurityStamp: user.security_stamp,
    Organizations: [],
    Providers: [],
    ProviderOrganizations: [],
    ForcePasswordReset: false,
    UsesKeyConnector: false,
    Kdf: user.kdf,
    KdfIterations: user.kdf_iterations,
    KdfMemory: user.kdf_memory,
    KdfParallelism: user.kdf_parallelism,
    UserDecryptionOptions: {
      Object: "userDecryptionOptions",
      HasMasterPassword: true,
      TrustedDeviceOption: null,
      KeyConnectorOption: null,
    },
  };
}

function folderObject(row: FolderRow): AnyRecord {
  return {
    Object: "folder",
    Id: row.id,
    Name: row.name,
    RevisionDate: row.revision_date,
  };
}

function attachmentObject(row: AttachmentRow): AnyRecord {
  return {
    Object: "attachment",
    Id: row.id,
    Url: `/api/ciphers/${row.cipher_id}/attachment/${row.id}`,
    FileName: row.file_name,
    Key: row.attachment_key,
    Size: String(row.size),
    SizeName: formatSize(row.size),
  };
}

function formatSize(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

async function cipherObject(env: Env, row: CipherRow, includeAttachments = true): Promise<AnyRecord> {
  const attachments = includeAttachments
    ? await env.DB.prepare("SELECT * FROM attachments WHERE cipher_id = ? ORDER BY creation_date").bind(row.id).all<AttachmentRow>()
    : { results: [] as AttachmentRow[] };
  return {
    Object: "cipherDetails",
    Id: row.id,
    OrganizationId: row.organization_id,
    FolderId: row.folder_id,
    Type: row.type,
    Name: row.name,
    Notes: row.notes,
    Favorite: Boolean(row.favorite),
    Reprompt: row.reprompt,
    Login: parseJson(row.login, null),
    SecureNote: parseJson(row.secure_note, null),
    Card: parseJson(row.card, null),
    Identity: parseJson(row.identity, null),
    Fields: parseJson(row.fields, []),
    PasswordHistory: parseJson(row.password_history, null),
    Attachments: attachments.results.map(attachmentObject),
    OrganizationUseTotp: false,
    Edit: true,
    ViewPassword: true,
    LocalData: null,
    CollectionIds: [],
    CreationDate: row.creation_date,
    RevisionDate: row.revision_date,
    DeletedDate: row.deleted_date,
    Key: row.key,
  };
}

function sendObject(row: SendRow): AnyRecord {
  return {
    Object: "send",
    Id: row.id,
    AccessId: row.id,
    Type: row.type,
    Name: row.name,
    Notes: row.notes,
    Text: parseJson(row.text, null),
    File: parseJson(row.file, null),
    Key: row.key,
    MaxAccessCount: row.max_access_count,
    AccessCount: row.access_count,
    RevisionDate: row.revision_date,
    CreationDate: row.creation_date,
    DeletionDate: row.deletion_date,
    ExpirationDate: row.expiration_date,
    Disabled: Boolean(row.disabled),
    HideEmail: Boolean(row.hide_email),
  };
}

async function handlePrelogin(env: Env, request: Request): Promise<Response> {
  const body = await readJson(request);
  const email = normalizeEmail(pick(body, "Email", "email"));
  const user = email ? await getUserByEmail(env, email) : null;
  return json({
    Object: "prelogin",
    Kdf: user?.kdf ?? 0,
    KdfIterations: user?.kdf_iterations ?? 600000,
    KdfMemory: user?.kdf_memory ?? null,
    KdfParallelism: user?.kdf_parallelism ?? null,
  });
}

async function handleRegister(env: Env, request: Request): Promise<Response> {
  const body = await readJson(request);
  const signupsAllowed = boolFromEnv(env.SIGNUPS_ALLOWED, true);
  const count = await usersCount(env);
  const adminToken = env.ADMIN_TOKEN;
  const requestAdminToken = request.headers.get("x-cloudwarden-admin-token") ?? maybeString(pick(body, "AdminToken")) ?? "";

  if (count > 0 && !signupsAllowed && (!adminToken || requestAdminToken !== adminToken)) {
    return error(403, "Signups are disabled");
  }

  const email = normalizeEmail(pick(body, "Email", "email"));
  const masterPasswordHash = maybeString(pick(body, "MasterPasswordHash", "masterPasswordHash", "master_password_hash"));
  if (!email || !masterPasswordHash) return error(400, "Email and masterPasswordHash are required");

  const existing = await getUserByEmail(env, email);
  if (existing) return error(409, "An account with this email already exists");

  const keys = (pick<AnyRecord>(body, "Keys", "keys") ?? {}) as AnyRecord;
  const date = now();
  const id = uuid();
  const user = {
    id,
    email,
    name: maybeString(pick(body, "Name", "name")),
    master_password_hash: masterPasswordHash,
    key: maybeString(pick(body, "Key", "key")),
    public_key: maybeString(pick(keys, "PublicKey", "publicKey")) ?? maybeString(pick(body, "PublicKey", "publicKey")),
    private_key: maybeString(pick(keys, "PrivateKey", "privateKey")) ?? maybeString(pick(body, "PrivateKey", "privateKey")),
    security_stamp: uuid(),
    kdf: asNumber(pick(body, "Kdf", "kdf"), 0),
    kdf_iterations: asNumber(pick(body, "KdfIterations", "kdfIterations"), 600000),
    kdf_memory: maybeNumber(pick(body, "KdfMemory", "kdfMemory")),
    kdf_parallelism: maybeNumber(pick(body, "KdfParallelism", "kdfParallelism")),
    creation_date: date,
    revision_date: date,
  };

  await env.DB.prepare(`
    INSERT INTO users (id, email, name, master_password_hash, key, public_key, private_key, security_stamp, kdf, kdf_iterations, kdf_memory, kdf_parallelism, creation_date, revision_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    user.id,
    user.email,
    user.name,
    user.master_password_hash,
    user.key,
    user.public_key,
    user.private_key,
    user.security_stamp,
    user.kdf,
    user.kdf_iterations,
    user.kdf_memory,
    user.kdf_parallelism,
    user.creation_date,
    user.revision_date,
  ).run();

  return json(profileObject(user), { status: 201 });
}

async function createTokenResponse(env: Env, user: UserRow, body: AnyRecord): Promise<Response> {
  const accessToken = await signJwt(env, {
    sub: user.id,
    email: user.email,
    name: user.name,
    premium: true,
    email_verified: true,
    sstamp: user.security_stamp,
    amr: ["Application"],
    scope: ["api", "offline_access"],
  }, 3600);

  const refreshToken = `${uuid()}.${base64Url(crypto.getRandomValues(new Uint8Array(32)))}`;
  const refreshHash = await sha256(refreshToken);
  const date = now();
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 90).toISOString();

  await env.DB.prepare(`
    INSERT INTO refresh_tokens (id, user_id, token_hash, device_identifier, device_name, device_type, expires_at, creation_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    uuid(),
    user.id,
    refreshHash,
    maybeString(pick(body, "device_identifier", "DeviceIdentifier")),
    maybeString(pick(body, "device_name", "DeviceName")),
    maybeString(pick(body, "device_type", "DeviceType")),
    expires,
    date,
  ).run();

  return json({
    access_token: accessToken,
    expires_in: 3600,
    token_type: "Bearer",
    refresh_token: refreshToken,
    Key: user.key,
    PrivateKey: user.private_key,
    Kdf: user.kdf,
    KdfIterations: user.kdf_iterations,
    KdfMemory: user.kdf_memory,
    KdfParallelism: user.kdf_parallelism,
    ResetMasterPassword: false,
    ForcePasswordReset: false,
    UserDecryptionOptions: profileObject(user).UserDecryptionOptions,
  });
}

async function handleToken(env: Env, request: Request): Promise<Response> {
  const body = await readJson(request);
  const grantType = maybeString(pick(body, "grant_type", "GrantType"));

  if (grantType === "refresh_token") {
    const token = maybeString(pick(body, "refresh_token", "RefreshToken"));
    if (!token) return error(400, "refresh_token is required");
    const hash = await sha256(token);
    const row = await env.DB.prepare(`
      SELECT users.* FROM refresh_tokens
      INNER JOIN users ON users.id = refresh_tokens.user_id
      WHERE refresh_tokens.token_hash = ? AND refresh_tokens.expires_at > ?
    `).bind(hash, now()).first<UserRow>();
    if (!row) return error(400, "invalid_grant", { error: "invalid_grant" });
    await env.DB.prepare("DELETE FROM refresh_tokens WHERE token_hash = ?").bind(hash).run();
    return createTokenResponse(env, row, body);
  }

  const email = normalizeEmail(pick(body, "username", "Username", "email", "Email"));
  const password = maybeString(pick(body, "password", "Password", "masterPasswordHash", "MasterPasswordHash"));
  if (!email || !password) return error(400, "username and password are required");

  const user = await getUserByEmail(env, email);
  if (!user || user.master_password_hash !== password) {
    return json({ error: "invalid_grant", error_description: "invalid username or password" }, { status: 400 });
  }

  return createTokenResponse(env, user, body);
}

async function handleSync(env: Env, context: AuthContext): Promise<Response> {
  const [folders, ciphers, sends] = await Promise.all([
    env.DB.prepare("SELECT * FROM folders WHERE user_id = ? ORDER BY revision_date").bind(context.user.id).all<FolderRow>(),
    env.DB.prepare("SELECT * FROM ciphers WHERE user_id = ? ORDER BY revision_date").bind(context.user.id).all<CipherRow>(),
    env.DB.prepare("SELECT * FROM sends WHERE user_id = ? ORDER BY revision_date").bind(context.user.id).all<SendRow>(),
  ]);
  return json({
    Object: "sync",
    Profile: profileObject(context.user),
    Folders: folders.results.map(folderObject),
    Collections: [],
    Ciphers: await Promise.all(ciphers.results.map((row) => cipherObject(env, row))),
    Domains: {
      Object: "domains",
      EquivalentDomains: [],
      GlobalEquivalentDomains: [],
    },
    Policies: [],
    Sends: sends.results.map(sendObject),
  });
}

async function listFolders(env: Env, context: AuthContext): Promise<Response> {
  const rows = await env.DB.prepare("SELECT * FROM folders WHERE user_id = ? ORDER BY revision_date").bind(context.user.id).all<FolderRow>();
  return json({ Object: "list", Data: rows.results.map(folderObject), ContinuationToken: null });
}

async function createFolder(env: Env, context: AuthContext, request: Request): Promise<Response> {
  const body = await readJson(request);
  const name = maybeString(pick(body, "Name", "name"));
  if (!name) return error(400, "Folder name is required");
  const date = now();
  const row: FolderRow = { id: uuid(), user_id: context.user.id, name, creation_date: date, revision_date: date };
  await env.DB.prepare("INSERT INTO folders (id, user_id, name, creation_date, revision_date) VALUES (?, ?, ?, ?, ?)")
    .bind(row.id, row.user_id, row.name, row.creation_date, row.revision_date)
    .run();
  return json(folderObject(row), { status: 201 });
}

async function updateFolder(env: Env, context: AuthContext, request: Request, id: string): Promise<Response> {
  const body = await readJson(request);
  const name = maybeString(pick(body, "Name", "name"));
  if (!name) return error(400, "Folder name is required");
  const date = now();
  const result = await env.DB.prepare("UPDATE folders SET name = ?, revision_date = ? WHERE id = ? AND user_id = ?")
    .bind(name, date, id, context.user.id)
    .run();
  if (!result.meta.changes) return error(404, "Folder not found");
  const row = await env.DB.prepare("SELECT * FROM folders WHERE id = ? AND user_id = ?").bind(id, context.user.id).first<FolderRow>();
  return json(folderObject(row!));
}

async function deleteFolder(env: Env, context: AuthContext, id: string): Promise<Response> {
  await env.DB.batch([
    env.DB.prepare("UPDATE ciphers SET folder_id = NULL, revision_date = ? WHERE folder_id = ? AND user_id = ?").bind(now(), id, context.user.id),
    env.DB.prepare("DELETE FROM folders WHERE id = ? AND user_id = ?").bind(id, context.user.id),
  ]);
  return empty();
}

function cipherInputToDb(body: AnyRecord, userId: string, id = uuid(), creationDate = now()): CipherRow {
  const revision = now();
  return {
    id,
    user_id: userId,
    organization_id: maybeString(pick(body, "OrganizationId", "organizationId")),
    folder_id: maybeString(pick(body, "FolderId", "folderId")),
    type: asNumber(pick(body, "Type", "type"), 1),
    name: maybeString(pick(body, "Name", "name")),
    notes: maybeString(pick(body, "Notes", "notes")),
    favorite: asBooleanNumber(pick(body, "Favorite", "favorite")),
    reprompt: asNumber(pick(body, "Reprompt", "reprompt"), 0),
    login: stringifyJson(pick(body, "Login", "login")),
    secure_note: stringifyJson(pick(body, "SecureNote", "secureNote")),
    card: stringifyJson(pick(body, "Card", "card")),
    identity: stringifyJson(pick(body, "Identity", "identity")),
    fields: stringifyJson(pick(body, "Fields", "fields") ?? []),
    password_history: stringifyJson(pick(body, "PasswordHistory", "passwordHistory")),
    key: maybeString(pick(body, "Key", "key")),
    creation_date: creationDate,
    revision_date: revision,
    deleted_date: maybeString(pick(body, "DeletedDate", "deletedDate")),
  };
}

async function listCiphers(env: Env, context: AuthContext): Promise<Response> {
  const rows = await env.DB.prepare("SELECT * FROM ciphers WHERE user_id = ? ORDER BY revision_date").bind(context.user.id).all<CipherRow>();
  return json({ Object: "list", Data: await Promise.all(rows.results.map((row) => cipherObject(env, row))), ContinuationToken: null });
}

async function createCipher(env: Env, context: AuthContext, request: Request): Promise<Response> {
  const body = await readJson(request);
  const row = cipherInputToDb(body, context.user.id);
  await env.DB.prepare(`
    INSERT INTO ciphers (id, user_id, organization_id, folder_id, type, name, notes, favorite, reprompt, login, secure_note, card, identity, fields, password_history, key, creation_date, revision_date, deleted_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    row.id,
    row.user_id,
    row.organization_id,
    row.folder_id,
    row.type,
    row.name,
    row.notes,
    row.favorite,
    row.reprompt,
    row.login,
    row.secure_note,
    row.card,
    row.identity,
    row.fields,
    row.password_history,
    row.key,
    row.creation_date,
    row.revision_date,
    row.deleted_date,
  ).run();
  return json(await cipherObject(env, row), { status: 201 });
}

async function importCiphers(env: Env, context: AuthContext, request: Request): Promise<Response> {
  const body = await readJson(request);
  const folders = pick<AnyRecord[]>(body, "Folders", "folders") ?? [];
  const ciphers = pick<AnyRecord[]>(body, "Ciphers", "ciphers") ?? [];
  const relationships = pick<AnyRecord[]>(body, "FolderRelationships", "folderRelationships") ?? [];

  const date = now();
  const folderIds = new Map<number, string>();
  const statements: D1PreparedStatement[] = [];

  folders.forEach((folder, index) => {
    const id = maybeString(pick(folder, "Id", "id")) ?? uuid();
    folderIds.set(index, id);
    statements.push(env.DB.prepare("INSERT INTO folders (id, user_id, name, creation_date, revision_date) VALUES (?, ?, ?, ?, ?)")
      .bind(id, context.user.id, maybeString(pick(folder, "Name", "name")) ?? "", date, date));
  });

  const relationshipMap = new Map<number, string>();
  relationships.forEach((relationship) => {
    const cipherIndex = maybeNumber(pick(relationship, "Key", "key"));
    const folderIndex = maybeNumber(pick(relationship, "Value", "value"));
    if (cipherIndex != null && folderIndex != null) {
      const folderId = folderIds.get(folderIndex);
      if (folderId) relationshipMap.set(cipherIndex, folderId);
    }
  });

  ciphers.forEach((cipher, index) => {
    const row = cipherInputToDb({
      ...cipher,
      FolderId: maybeString(pick(cipher, "FolderId", "folderId")) ?? relationshipMap.get(index) ?? null,
    }, context.user.id);
    statements.push(env.DB.prepare(`
      INSERT INTO ciphers (id, user_id, organization_id, folder_id, type, name, notes, favorite, reprompt, login, secure_note, card, identity, fields, password_history, key, creation_date, revision_date, deleted_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      row.id,
      row.user_id,
      row.organization_id,
      row.folder_id,
      row.type,
      row.name,
      row.notes,
      row.favorite,
      row.reprompt,
      row.login,
      row.secure_note,
      row.card,
      row.identity,
      row.fields,
      row.password_history,
      row.key,
      row.creation_date,
      row.revision_date,
      row.deleted_date,
    ));
  });

  if (statements.length) await env.DB.batch(statements);
  return empty();
}

async function getCipher(env: Env, context: AuthContext, id: string): Promise<Response> {
  const row = await env.DB.prepare("SELECT * FROM ciphers WHERE id = ? AND user_id = ?").bind(id, context.user.id).first<CipherRow>();
  if (!row) return error(404, "Cipher not found");
  return json(await cipherObject(env, row));
}

async function updateCipher(env: Env, context: AuthContext, request: Request, id: string): Promise<Response> {
  const existing = await env.DB.prepare("SELECT * FROM ciphers WHERE id = ? AND user_id = ?").bind(id, context.user.id).first<CipherRow>();
  if (!existing) return error(404, "Cipher not found");
  const body = await readJson(request);
  const row = cipherInputToDb(body, context.user.id, id, existing.creation_date);
  await env.DB.prepare(`
    UPDATE ciphers SET organization_id = ?, folder_id = ?, type = ?, name = ?, notes = ?, favorite = ?, reprompt = ?, login = ?, secure_note = ?, card = ?, identity = ?, fields = ?, password_history = ?, key = ?, revision_date = ?, deleted_date = ?
    WHERE id = ? AND user_id = ?
  `).bind(
    row.organization_id,
    row.folder_id,
    row.type,
    row.name,
    row.notes,
    row.favorite,
    row.reprompt,
    row.login,
    row.secure_note,
    row.card,
    row.identity,
    row.fields,
    row.password_history,
    row.key,
    row.revision_date,
    row.deleted_date,
    id,
    context.user.id,
  ).run();
  const updated = await env.DB.prepare("SELECT * FROM ciphers WHERE id = ? AND user_id = ?").bind(id, context.user.id).first<CipherRow>();
  return json(await cipherObject(env, updated!));
}

async function softDeleteCipher(env: Env, context: AuthContext, id: string): Promise<Response> {
  const date = now();
  const result = await env.DB.prepare("UPDATE ciphers SET deleted_date = ?, revision_date = ? WHERE id = ? AND user_id = ?")
    .bind(date, date, id, context.user.id)
    .run();
  if (!result.meta.changes) return error(404, "Cipher not found");
  const row = await env.DB.prepare("SELECT * FROM ciphers WHERE id = ? AND user_id = ?").bind(id, context.user.id).first<CipherRow>();
  return json(await cipherObject(env, row!));
}

async function restoreCipher(env: Env, context: AuthContext, id: string): Promise<Response> {
  const date = now();
  const result = await env.DB.prepare("UPDATE ciphers SET deleted_date = NULL, revision_date = ? WHERE id = ? AND user_id = ?")
    .bind(date, id, context.user.id)
    .run();
  if (!result.meta.changes) return error(404, "Cipher not found");
  const row = await env.DB.prepare("SELECT * FROM ciphers WHERE id = ? AND user_id = ?").bind(id, context.user.id).first<CipherRow>();
  return json(await cipherObject(env, row!));
}

async function purgeCipher(env: Env, context: AuthContext, id: string): Promise<Response> {
  const attachments = await env.DB.prepare("SELECT * FROM attachments WHERE cipher_id = ? AND user_id = ?").bind(id, context.user.id).all<AttachmentRow>();
  if (env.ATTACHMENTS) {
    await Promise.all(attachments.results.map((attachment) => env.ATTACHMENTS!.delete(attachment.r2_key)));
  }
  await env.DB.prepare("DELETE FROM ciphers WHERE id = ? AND user_id = ?").bind(id, context.user.id).run();
  return empty();
}

async function createAttachment(env: Env, context: AuthContext, request: Request, cipherId: string): Promise<Response> {
  if (!env.ATTACHMENTS) return error(501, "R2 bucket is not configured");
  const cipher = await env.DB.prepare("SELECT * FROM ciphers WHERE id = ? AND user_id = ?").bind(cipherId, context.user.id).first<CipherRow>();
  if (!cipher) return error(404, "Cipher not found");

  const form = await request.formData();
  const file = form.get("file");
  if (!file || typeof file !== "object" || !("stream" in file) || !("size" in file)) {
    return error(400, "multipart field 'file' is required");
  }
  const upload = file as File;

  const id = uuid();
  const fileName = String(form.get("fileName") ?? form.get("FileName") ?? upload.name);
  const key = maybeString(form.get("key") ?? form.get("Key"));
  const r2Key = `${context.user.id}/${cipherId}/${id}`;
  await env.ATTACHMENTS.put(r2Key, upload.stream(), {
    httpMetadata: { contentType: upload.type || "application/octet-stream" },
    customMetadata: { fileName },
  });
  const date = now();
  const row: AttachmentRow = {
    id,
    user_id: context.user.id,
    cipher_id: cipherId,
    file_name: fileName,
    attachment_key: key,
    size: upload.size,
    r2_key: r2Key,
    creation_date: date,
    revision_date: date,
  };
  await env.DB.batch([
    env.DB.prepare("INSERT INTO attachments (id, user_id, cipher_id, file_name, attachment_key, size, r2_key, creation_date, revision_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(row.id, row.user_id, row.cipher_id, row.file_name, row.attachment_key, row.size, row.r2_key, row.creation_date, row.revision_date),
    env.DB.prepare("UPDATE ciphers SET revision_date = ? WHERE id = ? AND user_id = ?").bind(date, cipherId, context.user.id),
  ]);
  return json(attachmentObject(row), { status: 201 });
}

async function downloadAttachment(env: Env, context: AuthContext, cipherId: string, attachmentId: string): Promise<Response> {
  if (!env.ATTACHMENTS) return error(501, "R2 bucket is not configured");
  const row = await env.DB.prepare("SELECT * FROM attachments WHERE id = ? AND cipher_id = ? AND user_id = ?")
    .bind(attachmentId, cipherId, context.user.id)
    .first<AttachmentRow>();
  if (!row) return error(404, "Attachment not found");
  const object = await env.ATTACHMENTS.get(row.r2_key);
  if (!object) return error(404, "Attachment object not found");
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("content-disposition", `attachment; filename="${row.file_name.replace(/"/g, "")}"`);
  headers.set("cache-control", "private, no-store");
  return withCors(new Response(object.body, { headers }));
}

async function deleteAttachment(env: Env, context: AuthContext, cipherId: string, attachmentId: string): Promise<Response> {
  const row = await env.DB.prepare("SELECT * FROM attachments WHERE id = ? AND cipher_id = ? AND user_id = ?")
    .bind(attachmentId, cipherId, context.user.id)
    .first<AttachmentRow>();
  if (!row) return error(404, "Attachment not found");
  if (env.ATTACHMENTS) await env.ATTACHMENTS.delete(row.r2_key);
  await env.DB.prepare("DELETE FROM attachments WHERE id = ? AND user_id = ?").bind(attachmentId, context.user.id).run();
  return empty();
}

async function listSends(env: Env, context: AuthContext): Promise<Response> {
  const rows = await env.DB.prepare("SELECT * FROM sends WHERE user_id = ? ORDER BY revision_date").bind(context.user.id).all<SendRow>();
  return json({ Object: "list", Data: rows.results.map(sendObject), ContinuationToken: null });
}

function sendInputToDb(body: AnyRecord, userId: string, id = uuid(), creationDate = now()): SendRow {
  const date = now();
  const deletionDate = maybeString(pick(body, "DeletionDate", "deletionDate")) ?? new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString();
  return {
    id,
    user_id: userId,
    type: asNumber(pick(body, "Type", "type"), 0),
    name: maybeString(pick(body, "Name", "name")),
    notes: maybeString(pick(body, "Notes", "notes")),
    text: stringifyJson(pick(body, "Text", "text")),
    file: stringifyJson(pick(body, "File", "file")),
    key: maybeString(pick(body, "Key", "key")),
    max_access_count: maybeNumber(pick(body, "MaxAccessCount", "maxAccessCount")),
    access_count: asNumber(pick(body, "AccessCount", "accessCount"), 0),
    revision_date: date,
    creation_date: creationDate,
    deletion_date: deletionDate,
    expiration_date: maybeString(pick(body, "ExpirationDate", "expirationDate")),
    disabled: asBooleanNumber(pick(body, "Disabled", "disabled")),
    hide_email: asBooleanNumber(pick(body, "HideEmail", "hideEmail")),
    password_hash: maybeString(pick(body, "Password", "PasswordHash", "passwordHash")),
  };
}

async function createSend(env: Env, context: AuthContext, request: Request): Promise<Response> {
  const row = sendInputToDb(await readJson(request), context.user.id);
  await env.DB.prepare(`
    INSERT INTO sends (id, user_id, type, name, notes, text, file, key, max_access_count, access_count, revision_date, creation_date, deletion_date, expiration_date, disabled, hide_email, password_hash)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(row.id, row.user_id, row.type, row.name, row.notes, row.text, row.file, row.key, row.max_access_count, row.access_count, row.revision_date, row.creation_date, row.deletion_date, row.expiration_date, row.disabled, row.hide_email, row.password_hash).run();
  return json(sendObject(row), { status: 201 });
}

async function getSend(env: Env, context: AuthContext, id: string): Promise<Response> {
  const row = await env.DB.prepare("SELECT * FROM sends WHERE id = ? AND user_id = ?").bind(id, context.user.id).first<SendRow>();
  if (!row) return error(404, "Send not found");
  return json(sendObject(row));
}

async function updateSend(env: Env, context: AuthContext, request: Request, id: string): Promise<Response> {
  const existing = await env.DB.prepare("SELECT * FROM sends WHERE id = ? AND user_id = ?").bind(id, context.user.id).first<SendRow>();
  if (!existing) return error(404, "Send not found");
  const row = sendInputToDb(await readJson(request), context.user.id, id, existing.creation_date);
  await env.DB.prepare(`
    UPDATE sends SET type = ?, name = ?, notes = ?, text = ?, file = ?, key = ?, max_access_count = ?, access_count = ?, revision_date = ?, deletion_date = ?, expiration_date = ?, disabled = ?, hide_email = ?, password_hash = ?
    WHERE id = ? AND user_id = ?
  `).bind(row.type, row.name, row.notes, row.text, row.file, row.key, row.max_access_count, row.access_count, row.revision_date, row.deletion_date, row.expiration_date, row.disabled, row.hide_email, row.password_hash, id, context.user.id).run();
  return json(sendObject(row));
}

async function deleteSend(env: Env, context: AuthContext, id: string): Promise<Response> {
  await env.DB.prepare("DELETE FROM sends WHERE id = ? AND user_id = ?").bind(id, context.user.id).run();
  return empty();
}

function config(env: Env, url: URL): AnyRecord {
  const base = `${url.protocol}//${url.host}`;
  return {
    Object: "config",
    Version: "2026.5.0-cloudwarden",
    GitHash: "cloudwarden",
    Server: {
      Name: env.SERVER_NAME ?? "CloudWarden",
      Url: base,
    },
    Environment: {
      Vault: base,
      Api: base,
      Identity: base,
      Icons: base,
      Notifications: base,
      Events: base,
      WebVault: base,
    },
    FeatureStates: {},
  };
}

async function route(request: Request, env: Env): Promise<Response> {
  if (request.method === "OPTIONS") return withCors(new Response(null, { status: 204, headers: CORS_HEADERS }));

  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";

  if (path === "/" && request.method === "GET") return json({ name: env.SERVER_NAME ?? "CloudWarden", status: "ok" });
  if ((path === "/alive" || path === "/health") && request.method === "GET") return json({ status: "ok", time: now() });
  if ((path === "/api/config" || path === "/config") && request.method === "GET") return json(config(env, url));
  if ((path === "/identity/accounts/prelogin" || path === "/api/accounts/prelogin") && request.method === "POST") return handlePrelogin(env, request);
  if (path === "/api/accounts/register" && request.method === "POST") return handleRegister(env, request);
  if (path === "/api/accounts/password-hint" && request.method === "POST") return empty();
  if (path === "/identity/connect/token" && request.method === "POST") return handleToken(env, request);
  if (path === "/notifications/hub" || path === "/notifications/hub/negotiate") return json({ connectionId: uuid(), availableTransports: [] });

  const auth = await requireAuth(env, request);
  if (auth instanceof Response) return auth;

  if (path === "/api/sync" && request.method === "GET") return handleSync(env, auth);
  if (path === "/api/accounts/profile" && request.method === "GET") return json(profileObject(auth.user));
  if (path === "/api/folders" && request.method === "GET") return listFolders(env, auth);
  if (path === "/api/folders" && request.method === "POST") return createFolder(env, auth, request);

  const folderMatch = path.match(/^\/api\/folders\/([^/]+)$/);
  if (folderMatch && request.method === "PUT") return updateFolder(env, auth, request, folderMatch[1]);
  if (folderMatch && request.method === "DELETE") return deleteFolder(env, auth, folderMatch[1]);

  if (path === "/api/ciphers" && request.method === "GET") return listCiphers(env, auth);
  if (path === "/api/ciphers" && request.method === "POST") return createCipher(env, auth, request);
  if (path === "/api/ciphers/import" && request.method === "POST") return importCiphers(env, auth, request);

  const cipherMatch = path.match(/^\/api\/ciphers\/([^/]+)$/);
  if (cipherMatch && request.method === "GET") return getCipher(env, auth, cipherMatch[1]);
  if (cipherMatch && (request.method === "PUT" || request.method === "POST")) return updateCipher(env, auth, request, cipherMatch[1]);
  if (cipherMatch && request.method === "DELETE") return softDeleteCipher(env, auth, cipherMatch[1]);

  const cipherActionMatch = path.match(/^\/api\/ciphers\/([^/]+)\/(delete|restore)$/);
  if (cipherActionMatch && cipherActionMatch[2] === "delete" && (request.method === "PUT" || request.method === "POST")) return softDeleteCipher(env, auth, cipherActionMatch[1]);
  if (cipherActionMatch && cipherActionMatch[2] === "delete" && request.method === "DELETE") return purgeCipher(env, auth, cipherActionMatch[1]);
  if (cipherActionMatch && cipherActionMatch[2] === "restore" && (request.method === "PUT" || request.method === "POST")) return restoreCipher(env, auth, cipherActionMatch[1]);

  const attachmentMatch = path.match(/^\/api\/ciphers\/([^/]+)\/attachment(?:s)?$/);
  if (attachmentMatch && request.method === "POST") return createAttachment(env, auth, request, attachmentMatch[1]);

  const attachmentItemMatch = path.match(/^\/api\/ciphers\/([^/]+)\/attachment(?:s)?\/([^/]+)$/);
  if (attachmentItemMatch && request.method === "GET") return downloadAttachment(env, auth, attachmentItemMatch[1], attachmentItemMatch[2]);
  if (attachmentItemMatch && request.method === "DELETE") return deleteAttachment(env, auth, attachmentItemMatch[1], attachmentItemMatch[2]);

  if (path === "/api/sends" && request.method === "GET") return listSends(env, auth);
  if (path === "/api/sends" && request.method === "POST") return createSend(env, auth, request);

  const sendMatch = path.match(/^\/api\/sends\/([^/]+)$/);
  if (sendMatch && request.method === "GET") return getSend(env, auth, sendMatch[1]);
  if (sendMatch && (request.method === "PUT" || request.method === "POST")) return updateSend(env, auth, request, sendMatch[1]);
  if (sendMatch && request.method === "DELETE") return deleteSend(env, auth, sendMatch[1]);

  if (path.startsWith("/api/organizations") || path.startsWith("/api/policies") || path.startsWith("/api/two-factor")) {
    if (request.method === "GET") return json({ Object: "list", Data: [], ContinuationToken: null });
    return error(501, "CloudWarden personal edition does not implement this enterprise feature");
  }

  return error(404, "Not found");
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      return await route(request, env);
    } catch (cause) {
      console.error(cause);
      return error(500, "Internal server error");
    }
  },
};
