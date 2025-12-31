import { NextResponse } from "next/server";
import { generateMockSeries, explainForDate } from "@/lib/mock";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const date = url.searchParams.get("date");

  const rows = generateMockSeries({ days: 180, seed: 20251231 });
  const result = explainForDate(rows, date ?? rows[rows.length - 1].date);

  return NextResponse.json(result);
}
