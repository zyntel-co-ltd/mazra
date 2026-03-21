/**
 * Mazra control-plane Supabase (not the client/target DB).
 */

export function getMazraSupabaseUrl(): string {
  return (
    process.env.SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    ""
  );
}

export function getMazraServiceRoleKey(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
}

export function hasMazraControlCredentials(): boolean {
  return Boolean(getMazraSupabaseUrl() && getMazraServiceRoleKey());
}
