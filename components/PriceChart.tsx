"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import type { DayRow } from "@/lib/mock";

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

export default function PriceChart({
  rows,
  selectedDate,
  onSelectDate,
}: {
  rows: DayRow[];
  selectedDate: string;
  onSelectDate: (d: string) => void;
}) {
  const option = useMemo(() => {
    const dates = rows.map((r) => r.date);
    const btc = rows.map((r) => r.btc_close);
    const pred = rows.map((r) => r.pred_close);
    const low = rows.map((r) => r.pred_low);
    const high = rows.map((r) => r.pred_high);

    return {
      tooltip: { trigger: "axis" },
      legend: { data: ["BTC", "Pred", "Band"] },
      xAxis: { type: "category", data: dates },
      yAxis: { type: "value", scale: true },
      dataZoom: [{ type: "inside" }, { type: "slider" }],
      series: [
        { name: "BTC", type: "line", data: btc, smooth: true, showSymbol: false },
        { name: "Pred", type: "line", data: pred, smooth: true, showSymbol: false },
        // 신뢰구간 느낌(하한/상한 2개로 band)
        {
          name: "Band",
          type: "line",
          data: low,
          showSymbol: false,
          lineStyle: { opacity: 0.2 },
          areaStyle: { opacity: 0.08 },
          stack: "band",
        },
        {
          name: "Band",
          type: "line",
          data: high,
          showSymbol: false,
          lineStyle: { opacity: 0.2 },
          areaStyle: { opacity: 0.08 },
          stack: "band",
        },
      ],
      // 선택 날짜 표시(세로선)
      markLine: {
        symbol: "none",
        data: [{ xAxis: selectedDate }],
        lineStyle: { opacity: 0.7 },
      },
    };
  }, [rows, selectedDate]);

  const onEvents = {
    click: (params: any) => {
      // x축 카테고리 클릭 시 date 선택
      const d = params?.name;
      if (typeof d === "string") onSelectDate(d);
    },
  };

  return <ReactECharts option={option} style={{ height: 420, width: "100%" }} onEvents={onEvents} />;
}
