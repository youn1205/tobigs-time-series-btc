"use client";

import { useEffect, useMemo, useState } from "react";
import PriceChart from "@/components/PriceChart";
import type { DayRow } from "@/lib/mock";

type ExplainItem = { feature: string; value: number; contrib: number };

type ExplainRes = {
  date: string;
  regime: string;
  top_positive: ExplainItem[];
  top_negative: ExplainItem[];
  narrative: string;
};

export default function Home() {
  const [rows, setRows] = useState<DayRow[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [explain, setExplain] = useState<ExplainRes | null>(null);

  // 1) 차트 데이터 로드
  useEffect(() => {
    (async () => {
      const res = await fetch("/api/history?days=180");
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();

      const rowsData: DayRow[] = Array.isArray(json?.rows) ? json.rows : [];
      setRows(rowsData);
      setSelectedDate(rowsData.at(-1)?.date ?? "");
    })().catch((e) => {
      console.error("history fetch error:", e);
      setRows([]);
      setSelectedDate("");
    });
  }, []);

  // 2) 날짜 선택되면 설명 로드 (여기서 top_positive/top_negative를 '무조건 배열'로 강제)
  useEffect(() => {
    if (!selectedDate) return;

    (async () => {
      const res = await fetch(`/api/explain?date=${selectedDate}`);
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();

      const safeExplain: ExplainRes = {
        date: typeof json?.date === "string" ? json.date : selectedDate,
        regime: typeof json?.regime === "string" ? json.regime : "-",
        top_positive: Array.isArray(json?.top_positive) ? json.top_positive : [],
        top_negative: Array.isArray(json?.top_negative) ? json.top_negative : [],
        narrative: typeof json?.narrative === "string" ? json.narrative : "",
      };

      setExplain(safeExplain);
    })().catch((e) => {
      console.error("explain fetch error:", e);
      setExplain(null);
    });
  }, [selectedDate]);

  // 3) “실시간처럼” 보이게 ping (선택)
  useEffect(() => {
    const t = setInterval(() => {
      fetch("/api/predict/latest").catch(() => {});
    }, 30_000);
    return () => clearInterval(t);
  }, []);

  const last = useMemo(() => (rows.length ? rows[rows.length - 1] : null), [rows]);

  // ✅ explain map 안전화
  const pos = Array.isArray(explain?.top_positive) ? explain!.top_positive : [];
  const neg = Array.isArray(explain?.top_negative) ? explain!.top_negative : [];

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">BTC XAI Dashboard (Mock)</h1>
            <p className="text-sm text-muted-foreground">
              클릭한 날짜 기준으로 예측/설명(가짜 데이터)을 보여주는 MVP
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Selected</div>
            <div className="text-lg font-semibold">{selectedDate || "-"}</div>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <Kpi title="BTC (last)" value={last ? last.btc_close.toLocaleString() : "-"} />
          <Kpi title="Pred (last)" value={last ? last.pred_close.toLocaleString() : "-"} />
          <Kpi title="VIX (last)" value={last ? String(last.VIX) : "-"} />
          <Kpi title="Regime (last)" value={last ? last.regime : "-"} />
        </section>

        <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="md:col-span-2 rounded-xl border p-4">
            {rows.length > 0 ? (
              <PriceChart rows={rows} selectedDate={selectedDate} onSelectDate={setSelectedDate} />
            ) : (
              <div className="h-[420px] flex items-center justify-center text-sm text-muted-foreground">
                loading...
              </div>
            )}
          </div>

          <div className="rounded-xl border p-4 space-y-4">
            <h2 className="text-lg font-semibold">Explanation</h2>

            {explain ? (
              <>
                <div className="text-sm">
                  <div className="text-muted-foreground">Regime</div>
                  <div className="font-semibold">{explain.regime}</div>
                </div>

                <div className="text-sm">
                  <div className="text-muted-foreground mb-2">Top Positive</div>
                  <ul className="space-y-1">
                    {pos.map((x) => (
                      <li key={x.feature} className="flex justify-between">
                        <span>
                          {x.feature} ({x.value})
                        </span>
                        <span className="font-semibold">+{x.contrib}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="text-sm">
                  <div className="text-muted-foreground mb-2">Top Negative</div>
                  <ul className="space-y-1">
                    {neg.map((x) => (
                      <li key={x.feature} className="flex justify-between">
                        <span>
                          {x.feature} ({x.value})
                        </span>
                        <span className="font-semibold">{x.contrib}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-lg bg-muted p-3 text-sm">{explain.narrative}</div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">
                날짜를 선택하면 설명이 표시돼요.
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function Kpi({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl border p-4">
      <div className="text-xs text-muted-foreground">{title}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}
