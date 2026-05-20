interface Env {
  DB: D1Database;
  ATTACHMENTS?: R2Bucket;
  JWT_SECRET?: string;
  ADMIN_TOKEN?: string;
  SIGNUPS_ALLOWED?: string;
  SERVER_NAME?: string;
}
