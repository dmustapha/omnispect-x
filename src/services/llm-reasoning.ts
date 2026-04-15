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
  const timeout = setTimeout(() => controller.abort(), 10_000);

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
        system: "You are a crypto trading analyst. Analyze the market signal and respond with ONLY a JSON object: {\"confidence\": <number 0-1>, \"reasoning\": \"<1-2 sentence analysis>\"}. No markdown, no code blocks.",
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
