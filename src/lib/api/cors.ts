import { NextResponse } from "next/server";

export function corsHeaders(): HeadersInit {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

export function withCors<T>(res: NextResponse<T>): NextResponse<T> {
  const h = corsHeaders();
  for (const [k, v] of Object.entries(h)) {
    res.headers.set(k, v);
  }
  return res;
}
