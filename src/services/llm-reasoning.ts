import { config } from "../config";

interface ReasoningInput {
  signal: { address: string; tokenAddress: string; action: string; amount: string };
  priceInfo: { price: string; change24h: string } | null;
  klines: { vol: string; c: string }[];
}

export interface ReasoningOutput {
  confidence: number;
  reasoning: string;
}

export async function generateReasoning(input: ReasoningInput): Promise<ReasoningOutput> {
  if (!config.anthropic.apiKey) {
    throw new Error("ANTHROPIC_API_KEY not configured");
  }

  const klineSummary = input.klines.length > 0
    ? `Recent volumes: ${input.klines.slice(-5).map(k => k.vol).join(", ")}. Recent closes: ${input.klines.slice(-5).map(k => k.c).join(", ")}.`
    : "No kline data available.";

  const userMessage = JSON.stringify({
    signal: {
      whaleAddress: input.signal.address,
      token: input.signal.tokenAddress,
      action: input.signal.action,
      amount: input.signal.amount,
    },
    currentPrice: input.priceInfo?.price ?? "unknown",
    priceChange24h: input.priceInfo?.change24h ?? "unknown",
    marketData: klineSummary,
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": config.anthropic.apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: config.anthropic.model,
        max_tokens: 256,
        system: `You are a crypto trading analyst for an autonomous trading agent. Analyze DEX market signals and respond with ONLY a JSON object: {"confidence": <number 0-1>, "reasoning": "<1-2 sentence analysis>"}. No markdown, no code blocks.

The signal data comes from OKX DEX trending token lists. "amount" is 24h trading volume in USD. "action" indicates whether buy or sell transactions dominate. The whale address is synthetic (not a real individual).

Confidence calibration (follow strictly):
- 0.8+: Strong signal — high volume ($10M+), net buy pressure, stable or rising price, good kline volume consistency
- 0.6-0.79: Decent signal — meaningful volume, moderate buy pressure, price holding steady or mild uptrend
- 0.4-0.59: Neutral — volume present but mixed buy/sell, price flat or mildly declining
- 0.2-0.39: Weak — low volume, sell pressure dominant, declining price trend
- Below 0.2: Avoid — extreme sell pressure, crashing price, or no meaningful data

When price data and klines are available, weight them heavily. A token with $10M+ volume, positive price change, and consistent kline closes should score 0.6+.`,
        messages: [{ role: "user", content: userMessage }],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`Anthropic API error: ${res.status}`);
    }

    const json = await res.json() as {
      content: Array<{ type: string; text: string }>;
    };

    const raw = json.content?.[0]?.text || "";
    const text = raw.replace(/^```(?:json)?\n?/g, "").replace(/\n?```$/g, "").trim();
    const parsed = JSON.parse(text) as { confidence: number; reasoning: string };

    if (typeof parsed.confidence !== "number" || typeof parsed.reasoning !== "string") {
      throw new Error("Invalid LLM response structure");
    }

    return {
      confidence: Math.max(0, Math.min(1, parsed.confidence)),
      reasoning: parsed.reasoning,
    };
  } finally {
    clearTimeout(timeout);
  }
}
