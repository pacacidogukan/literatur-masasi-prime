declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    PRIME_OWNER_EMAIL?: string;
    PRIME_EDITOR_ORIGIN?: string;
    PRIME_CODE_PEPPER?: string;
    BUCKET?: R2Bucket;
  }
}
