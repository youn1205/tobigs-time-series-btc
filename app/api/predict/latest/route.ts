import { NextResponse } from "next/server";
import { generateMockSeries } from "@/lib/mock";

export async function GET() {
  const rows = generateMockSeries({ days: 180, seed: 20251231 });
  const last = rows[rows.length - 1];

  return NextResponse.json({
    asof: new Date().toISOString(),
    horizon_days: 1,
    pred_close: last.pred_close,
    confidence: 0.62,
    regime: last.regime,
  });
}

