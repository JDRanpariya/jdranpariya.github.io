declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    RESEARCH_ADMIN_PASSPHRASE?: string;
    RESEARCH_SESSION_SECRET?: string;
  }
}
