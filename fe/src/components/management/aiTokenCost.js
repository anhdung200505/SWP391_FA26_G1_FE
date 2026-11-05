// Giá bậc Standard của gemini-3.5-flash-lite trên Google AI, tính theo 1 triệu token.
// Đầu ra gồm cả token suy luận. Nguồn: https://ai.google.dev/gemini-api/docs/pricing
export const GEMINI_MODEL = 'gemini-3.5-flash-lite';
export const INPUT_USD_PER_MILLION = 0.3;
export const OUTPUT_USD_PER_MILLION = 2.5;
export const FALLBACK_VND_PER_USD = 25701;

const vndFormat = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

export function estimateTokenCost(tokens, vndPerUsd) {
  const count = Math.max(0, Number(tokens) || 0);
  const usdLow = (count * INPUT_USD_PER_MILLION) / 1_000_000;
  const usdHigh = (count * OUTPUT_USD_PER_MILLION) / 1_000_000;
  const rate = Number(vndPerUsd) > 0 ? Number(vndPerUsd) : null;
  return {
    tokens: count,
    usdLow,
    usdHigh,
    vndLow: rate == null ? null : usdLow * rate,
    vndHigh: rate == null ? null : usdHigh * rate,
    vndEstimate: rate == null ? null : ((usdLow + usdHigh) / 2) * rate,
    vndPerUsd: rate,
  };
}

export function formatVndAmount(value) {
  const amount = Number(value) || 0;
  if (amount > 0 && amount < 0.5) return 'dưới 1 ₫';
  return vndFormat.format(amount);
}

export function formatEstimatedVnd(cost) {
  if (cost.vndEstimate == null) return 'Đang quy đổi...';
  return formatVndAmount(cost.vndEstimate);
}

let rateRequest;

export function loadUsdVndRate() {
  if (!rateRequest) {
    rateRequest = fetch('https://open.er-api.com/v6/latest/USD')
      .then((response) => {
        if (!response.ok) throw new Error('rate');
        return response.json();
      })
      .then((data) => {
        const rate = Number(data?.rates?.VND);
        if (!Number.isFinite(rate) || rate <= 0) throw new Error('rate');
        return { rate, fallback: false };
      })
      .catch(() => ({ rate: FALLBACK_VND_PER_USD, fallback: true }));
  }
  return rateRequest;
}
