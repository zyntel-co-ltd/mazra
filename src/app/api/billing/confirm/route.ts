import { NextRequest, NextResponse } from "next/server";
import { verifyPayment } from "@/lib/billing/flutterwave";
import { getMazraPublicSiteUrl } from "@/lib/billing/app-url";

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

  return NextResponse.redirect(okUrl);
}
