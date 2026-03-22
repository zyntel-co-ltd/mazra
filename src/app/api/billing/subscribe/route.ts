import { NextRequest, NextResponse } from "next/server";
import { createSubscriptionPayment, type MazraPlan } from "@/lib/billing/flutterwave";
import { getMazraAppUrl } from "@/lib/billing/app-url";
import { createMazraAdminClient } from "@/lib/mazra/supabase-admin";

const PLANS = new Set<MazraPlan>(["starter", "pro", "enterprise"]);

function corsHeaders(req: NextRequest): HeadersInit {
  const origin = req.headers.get("origin");
  const configured = process.env.MAZRA_LANDING_ORIGIN?.trim();

  let allow = "https://mazra.dev";
  if (configured === "*") {
    allow = "*";
  } else if (configured) {
    const list = configured.split(",").map((s) => s.trim()).filter(Boolean);
    if (origin && list.includes(origin)) allow = origin;
    else if (list[0]) allow = list[0];
  } else if (origin?.startsWith("http://localhost:")) {
    allow = origin;
  }

  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

/**
 * POST /api/billing/subscribe
 * JSON: { company_name, email, plan, target_db_url }
 * Returns: { payment_url } — redirect browser to payment_url
 */
export async function POST(req: NextRequest) {
  const headers = corsHeaders(req);

  let body: {
    company_name?: string;
    email?: string;
    plan?: string;
    target_db_url?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "invalid_json" },
      { status: 400, headers }
    );
  }

  const company_name = body.company_name?.trim();
  const email = body.email?.trim()?.toLowerCase();
  const plan = body.plan?.trim().toLowerCase() as MazraPlan | undefined;
  const target_db_url = body.target_db_url?.trim() || null;

  if (!company_name || !email || !plan || !PLANS.has(plan)) {
    return NextResponse.json(
      {
        error: "validation_failed",
        hint: "company_name, email, plan (starter|pro|enterprise) required",
      },
      { status: 400, headers }
    );
  }

  try {
    const db = createMazraAdminClient();

    const { data: client, error: insErr } = await db
      .from("mazra_clients")
      .insert({
        company_name,
        contact_email: email,
        plan,
        target_db_url,
        is_active: false,
      })
      .select("id")
      .single();

    if (insErr || !client?.id) {
      return NextResponse.json(
        { error: "db_insert_failed", message: insErr?.message },
        { status: 500, headers }
      );
    }

    const appUrl = getMazraAppUrl();
    const redirectUrl = `${appUrl}/api/billing/confirm`;

    const payment_url = await createSubscriptionPayment({
      email,
      name: company_name,
      plan,
      clientId: client.id,
      redirectUrl,
    });

    return NextResponse.json({ payment_url }, { headers });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: "payment_init_failed", message: msg },
      { status: 502, headers }
    );
  }
}
