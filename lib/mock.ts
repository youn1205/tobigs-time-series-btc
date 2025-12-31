// src/lib/mock.ts
export type Regime =
  | "Steady Bull"
  | "Fomo Rally"
  | "Panic Sell"
  | "Slow Bleed"
  | "Accumulation"
  | "Choppy";

export type DayRow = {
  date: string; // YYYY-MM-DD
  btc_close: number;
  pred_close: number;
  pred_low: number;
  pred_high: number;
  regime: Regime;

  // 대표 피처(EDA에서 다뤘던 느낌 유지)
  ETH: number;
  VIX: number;
  FundingRate: number;
  RSI: number;
  FNG: number; // 0~100
};

export type ExplainItem = { feature: string; value: number; contrib: number };

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(x: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, x));
}

function fmtDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function pickRegime(r: number): Regime {
  // 대충 비율: 평시 많고, 위기/과열은 가끔
  if (r < 0.38) return "Steady Bull";
  if (r < 0.48) return "Accumulation";
  if (r < 0.60) return "Choppy";
  if (r < 0.72) return "Slow Bleed";
  if (r < 0.86) return "Fomo Rally";
  return "Panic Sell";
}

export function generateMockSeries(opts?: {
  days?: number;
  endDate?: string; // YYYY-MM-DD
  seed?: number;
}) {
  const days = opts?.days ?? 180;
  const seed = opts?.seed ?? 20251231;
  const rand = mulberry32(seed);

  const end = opts?.endDate ? new Date(opts.endDate) : new Date();
  end.setHours(0, 0, 0, 0);

  // EDA 느낌: 우측 꼬리/변동성 → 랜덤워크 + 가끔 큰 점프
  let btc = 65000; // 시작값은 데모용(최근 시장 느낌)
  let eth = 2500;
  let vix = 18; // 평균 18대
  let fr = 0.0001;
  let rsi = 53;
  let fng = 50;

  const rows: DayRow[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(end.getDate() - i);

    const shock = rand() < 0.04 ? (rand() - 0.5) * 0.18 : (rand() - 0.5) * 0.04; // 가끔 큰 변동
    const drift = (rand() - 0.48) * 0.002;

    btc = btc * (1 + drift + shock);
    btc = clamp(btc, 8000, 200000);

    // ETH는 BTC에 느슨하게 동행
    eth = eth * (1 + drift * 1.2 + shock * 0.6 + (rand() - 0.5) * 0.02);
    eth = clamp(eth, 200, 12000);

    // VIX: 평시 12~25, 위기 때 40+ 튀는 느낌
    const vixShock = rand() < 0.03 ? rand() * 25 : (rand() - 0.5) * 2.2;
    vix = clamp(vix + vixShock, 10, 65);

    // FundingRate: 0 주변의 작은 값 + 가끔 극단치
    fr = (rand() - 0.5) * 0.0006;
    if (rand() < 0.02) fr += (rand() - 0.5) * 0.002;

    // RSI: 0~100, 50 근처 + 추세에 반응
    rsi = clamp(50 + (shock * 220) + (rand() - 0.5) * 6, 5, 95);

    // FNG: 심리(탐욕/공포) 0~100
    fng = clamp(55 + shock * 180 - (vix - 18) * 0.8 + (rand() - 0.5) * 8, 0, 100);

    const regime = pickRegime(rand());

    // 예측값(데모): 현재가에 작은 오차 + 국면에 따라 방향성 조금
    const bias =
      regime === "Fomo Rally" ? 0.008 :
      regime === "Panic Sell" ? -0.010 :
      regime === "Steady Bull" ? 0.003 :
      regime === "Slow Bleed" ? -0.003 :
      0.0;

    const predClose = btc * (1 + bias + (rand() - 0.5) * 0.01);
    const band = btc * (0.015 + (vix - 18) * 0.0008); // VIX 높으면 밴드 넓게
    const predLow = predClose - band;
    const predHigh = predClose + band;

    rows.push({
      date: fmtDate(d),
      btc_close: Math.round(btc),
      pred_close: Math.round(predClose),
      pred_low: Math.round(predLow),
      pred_high: Math.round(predHigh),
      regime,
      ETH: Math.round(eth),
      VIX: Number(vix.toFixed(2)),
      FundingRate: Number(fr.toFixed(6)),
      RSI: Number(rsi.toFixed(2)),
      FNG: Math.round(fng),
    });
  }

  return rows;
}

export function explainForDate(rows: DayRow[], date: string) {
  const row = rows.find((r) => r.date === date) ?? rows[rows.length - 1];

  // 국면별 “그럴듯한” 중요변수 구성을 고정해두면 데모가 안정적임
  const base: ExplainItem[] = [
    { feature: "FNG", value: row.FNG, contrib: 0 },
    { feature: "VIX", value: row.VIX, contrib: 0 },
    { feature: "FundingRate", value: row.FundingRate, contrib: 0 },
    { feature: "RSI", value: row.RSI, contrib: 0 },
    { feature: "ETH", value: row.ETH, contrib: 0 },
  ];

  const map: Record<Regime, number[]> = {
    "Steady Bull": [0.10, -0.05, 0.02, 0.06, 0.04],
    "Fomo Rally":  [0.18, -0.03, 0.07, 0.03, 0.05],
    "Panic Sell":  [-0.08, -0.16, -0.06, -0.04, -0.02],
    "Slow Bleed":  [-0.04, -0.08, -0.02, -0.03, 0.01],
    "Accumulation":[0.06, -0.04, 0.01, 0.02, 0.03],
    "Choppy":      [0.03, -0.03, 0.01, 0.01, 0.02],
  };

  const w = map[row.regime];
  const items = base.map((b, i) => ({ ...b, contrib: Number(w[i].toFixed(3)) }));

  const topPos = items.filter(x => x.contrib > 0).sort((a,b)=>b.contrib-a.contrib).slice(0,3);
  const topNeg = items.filter(x => x.contrib < 0).sort((a,b)=>a.contrib-b.contrib).slice(0,3);

  const narrative =
    row.regime === "Panic Sell"
      ? `변동성(VIX) 상승과 파생 포지션 쏠림(FundingRate)이 하락 압력을 키운 국면입니다.`
      : row.regime === "Fomo Rally"
      ? `심리(FNG) 과열과 모멘텀(RSI) 신호가 강해 단기 추세가 확대된 국면입니다.`
      : `심리(FNG)·모멘텀(RSI)과 거시 불안(VIX)의 균형 속에서 완만한 방향성이 형성된 국면입니다.`;

  return { date: row.date, regime: row.regime, top_positive: topPos, top_negative: topNeg, narrative };
}
