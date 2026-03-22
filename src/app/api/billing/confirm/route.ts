import { NextRequest, NextResponse } from "next/server";
import { verifyPayment } from "@/lib/billing/flutterwave";
import { getMazraPublicSiteUrl } from "@/lib/billing/app-url";
import { createMazraAdminClient } from "@/lib/mazra/supabase-admin";

/**
 * Flutterwave redirect after Standard checkout.
 * Query params vary; we accept common shapes: transaction_id, status.
 */
export async function GET(req: NextRequest) {
  const site = getMazraPublicSiteUrl();
  const fail = `${site}/?payment=failed`;
  const okUrl = `${site}/?payment=success`;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const transactionId =
    searchParams.get("transaction_id") ??
    searchParams.get("id") ??
    searchParams.get("tx_id");

  if (status === "cancelled" || status === "failed") {
    return NextResponse.redirect(fail);
  }

  if (!transactionId) {
    return NextResponse.redirect(fail);
  }

  const verified = await verifyPayment(transactionId);
  if (!verified.ok || !verified.clientId) {
    return NextResponse.redirect(fail);
  }

  try {
    const db = createMazraAdminClient();
    const { error } = await db
      .from("mazra_clients")
      .update({
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", verified.clientId);

    if (error) {
      console.error("billing confirm update:", error.message);
      return NextResponse.redirect(fail);
    }
  } catch (e) {
    console.error(e);
    return NextResponse.redirect(fail);
  }

  return NextResponse.redirect(okUrl);
}
