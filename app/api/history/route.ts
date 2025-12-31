import { NextResponse } from "next/server";
import { generateMockSeries } from "@/lib/mock";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const days = Number(url.searchParams.get("days") ?? "180");

  const rows = generateMockSeries({ days, seed: 20251231 });

  return NextResponse.json({
    rows,
  });
}

