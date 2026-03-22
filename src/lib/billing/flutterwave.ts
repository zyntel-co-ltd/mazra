/**
 * Flutterwave v3 REST (Standard / hosted payment link).
 * Server-side only — uses FLW_SECRET_KEY.
 *
 * @see https://developer.flutterwave.com/docs/flutterwave-standard
 */

const FLW_API = "https://api.flutterwave.com/v3";

export type MazraPlan = "starter" | "pro" | "enterprise";

const PLAN_USD: Record<MazraPlan, number> = {
  starter: 99,
  pro: 299,
  enterprise: 799,
};

function requireSecret(): string {
  const k = process.env.FLW_SECRET_KEY?.trim();
  if (!k) throw new Error("FLW_SECRET_KEY is not set");
  return k;
}

export async function createSubscriptionPayment(opts: {
  email: string;
  name: string;
  plan: MazraPlan;
  clientId: string;
  redirectUrl: string;
}): Promise<string> {
  const secret = requireSecret();
  const amount = PLAN_USD[opts.plan];
  if (!amount) throw new Error("invalid plan");

  const tx_ref = `mazra_${opts.clientId}_${Date.now()}`;

  const payload = {
    tx_ref,
    amount: String(amount),
    currency: "USD",
    redirect_url: opts.redirectUrl,
    customer: {
      email: opts.email,
      name: opts.name,
    },
    customizations: {
      title: "Mazra",
      description: `${opts.plan} plan — hospital data simulation`,
      logo: process.env.MAZRA_BILLING_LOGO_URL ?? "https://mazra.dev/favicon.ico",
    },
    meta: {
      client_id: opts.clientId,
      plan: opts.plan,
    },
  };

  const res = await fetch(`${FLW_API}/payments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const json = (await res.json()) as {
    status?: string;
    message?: string;
    data?: { link?: string };
  };

  if (!res.ok || json.status !== "success" || !json.data?.link) {
    throw new Error(
      json.message || `Flutterwave initiate failed (${res.status})`
    );
  }

  return json.data.link;
}

function metaClientIdFromVerifyData(data: Record<string, unknown>): string | null {
  const meta = data.meta;
  if (meta && typeof meta === "object" && !Array.isArray(meta)) {
    const id = (meta as { client_id?: unknown }).client_id;
    if (typeof id === "string" && id.length > 0) return id;
  }
  if (Array.isArray(meta)) {
    for (const m of meta) {
      if (m && typeof m === "object") {
        const o = m as { metaname?: string; metavalue?: string };
        if (o.metaname === "client_id" && o.metavalue) return o.metavalue;
      }
    }
  }
  return null;
}

export async function verifyPayment(transactionId: string): Promise<{
  ok: boolean;
  clientId: string | null;
}> {
  const secret = requireSecret();
  const res = await fetch(`${FLW_API}/transactions/${transactionId}/verify`, {
    headers: { Authorization: `Bearer ${secret}` },
  });

  const json = (await res.json()) as {
    status?: string;
    data?: Record<string, unknown>;
  };

  if (!res.ok || json.status !== "success" || !json.data) {
    return { ok: false, clientId: null };
  }

  const data = json.data;
  const status = data.status;
  const ok = status === "successful";
  const clientId = metaClientIdFromVerifyData(data);
  return { ok, clientId };
}
