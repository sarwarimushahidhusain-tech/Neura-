/**
 * NEURA PHASE 6 — DASHBOARD METRICS API
 * GET /api/dashboard/metrics — returns all learning metrics for the authenticated user
 */

import { NextResponse } from "next/server";
import { getServerUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getDashboardMetrics } from "@/lib/dashboard/service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: "Supabase not configured.", code: "UNCONFIGURED" },
        { status: 503 }
      );
    }

    const user = await getServerUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Authentication required.", code: "UNAUTHENTICATED" },
        { status: 401 }
      );
    }

    const metrics = await getDashboardMetrics(user.id);

    return NextResponse.json(
      { success: true, metrics },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unexpected error.";
    return NextResponse.json(
      { success: false, error: msg, code: "INTERNAL_ERROR" },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  }
}
