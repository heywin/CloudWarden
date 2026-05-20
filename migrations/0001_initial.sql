CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  master_password_hash TEXT NOT NULL,
  key TEXT,
  public_key TEXT,
  private_key TEXT,
  security_stamp TEXT NOT NULL,
  kdf INTEGER NOT NULL DEFAULT 0,
  kdf_iterations INTEGER NOT NULL DEFAULT 600000,
  kdf_memory INTEGER,
  kdf_parallelism INTEGER,
  creation_date TEXT NOT NULL,
  revision_date TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  device_identifier TEXT,
  device_name TEXT,
  device_type TEXT,
  expires_at TEXT NOT NULL,
  creation_date TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);

CREATE TABLE IF NOT EXISTS folders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  creation_date TEXT NOT NULL,
  revision_date TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_folders_user_id ON folders(user_id);

CREATE TABLE IF NOT EXISTS ciphers (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  organization_id TEXT,
  folder_id TEXT,
  type INTEGER NOT NULL,
  name TEXT,
  notes TEXT,
  favorite INTEGER NOT NULL DEFAULT 0,
  reprompt INTEGER NOT NULL DEFAULT 0,
  login TEXT,
  secure_note TEXT,
  card TEXT,
  identity TEXT,
  fields TEXT,
  password_history TEXT,
  key TEXT,
  creation_date TEXT NOT NULL,
  revision_date TEXT NOT NULL,
  deleted_date TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_ciphers_user_id ON ciphers(user_id);
CREATE INDEX IF NOT EXISTS idx_ciphers_folder_id ON ciphers(folder_id);

CREATE TABLE IF NOT EXISTS attachments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  cipher_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  attachment_key TEXT,
  size INTEGER NOT NULL DEFAULT 0,
  r2_key TEXT NOT NULL,
  creation_date TEXT NOT NULL,
  revision_date TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (cipher_id) REFERENCES ciphers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_attachments_user_id ON attachments(user_id);
CREATE INDEX IF NOT EXISTS idx_attachments_cipher_id ON attachments(cipher_id);

CREATE TABLE IF NOT EXISTS sends (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type INTEGER NOT NULL,
  name TEXT,
  notes TEXT,
  text TEXT,
  file TEXT,
  key TEXT,
  max_access_count INTEGER,
  access_count INTEGER NOT NULL DEFAULT 0,
  revision_date TEXT NOT NULL,
  creation_date TEXT NOT NULL,
  deletion_date TEXT NOT NULL,
  expiration_date TEXT,
  disabled INTEGER NOT NULL DEFAULT 0,
  hide_email INTEGER NOT NULL DEFAULT 0,
  password_hash TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sends_user_id ON sends(user_id);
