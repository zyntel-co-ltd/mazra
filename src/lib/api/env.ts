export function getUpstashRedisUrl(): string {
  return process.env.UPSTASH_REDIS_REST_URL?.trim() || "";
}

export function getUpstashRedisToken(): string {
  return process.env.UPSTASH_REDIS_REST_TOKEN?.trim() || "";
}

export function hasUpstashRedis(): boolean {
  return Boolean(getUpstashRedisUrl() && getUpstashRedisToken());
}

/** Optional read-only Supabase role for data SELECT; falls back to service role. */
export function getDataReadSupabaseKey(): string {
  return (
    process.env.SUPABASE_READ_ONLY_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    ""
  );
}
