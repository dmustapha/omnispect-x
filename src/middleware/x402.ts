import type { Context, Next } from "hono";
import { createHmac } from "crypto";
import { config } from "../config";

const FACILITATOR_URL = config.x402.facilitatorUrl; // https://web3.okx.com/api/v6/x402

// ─── HMAC for OKX facilitator calls ────────────────────────────────────────

function okxFacilitatorHeaders(method: string, path: string, body = ""): Record<string, string> {
  const timestamp = new Date().toISOString();
  const prehash = timestamp + method.toUpperCase() + path + body;
  const sign = createHmac("sha256", config.okx.secretKey).update(prehash).digest("base64");
  return {
    "OK-ACCESS-KEY": config.okx.apiKey,
    "OK-ACCESS-SIGN": sign,
    "OK-ACCESS-TIMESTAMP": timestamp,
    "OK-ACCESS-PASSPHRASE": config.okx.passphrase,
    "Content-Type": "application/json",
  };
}

// ─── Payment Verification ───────────────────────────────────────────────────

async function verifyPayment(paymentHeader: string): Promise<boolean> {
  const path = "/api/v6/x402/verify";
  const body = JSON.stringify({ payment: paymentHeader });
  const headers = okxFacilitatorHeaders("POST", path, body);

  try {
    const res = await fetch(`${config.okx.baseUrl}${path}`, {
      method: "POST",
      headers,
      body,
    });
    if (!res.ok) return false;
    const json = await res.json() as { code: string; data: { valid: boolean }[] };
    return json.code === "0" && json.data?.[0]?.valid === true;
  } catch {
    return false;
  }
}

async function settlePayment(paymentHeader: string): Promise<boolean> {
  const path = "/api/v6/x402/settle";
  const body = JSON.stringify({ payment: paymentHeader });
  const headers = okxFacilitatorHeaders("POST", path, body);

  try {
    const res = await fetch(`${config.okx.baseUrl}${path}`, {
      method: "POST",
      headers,
      body,
    });
    if (!res.ok) return false;
    const json = await res.json() as { code: string };
    return json.code === "0";
  } catch {
    return false;
  }
}

// ─── Middleware ──────────────────────────────────────────────────────────────

export function x402Gate() {
  return async (c: Context, next: Next) => {
    const paymentHeader = c.req.header("X-Payment") || c.req.header("x-payment");

    if (!paymentHeader) {
      // Return 402 with payment requirements
      const requirements = {
        scheme: "exact",
        network: "xlayer",
        maxAmountRequired: config.x402.pricePerReport,
        resource: c.req.url,
        description: "Premium Omnispect-X Trust Report",
        mimeType: "application/json",
        payToAddress: config.agentWallet.privateKey
          ? "DERIVE_FROM_WALLET"
          : "0x0000000000000000000000000000000000000000",
        requiredDeadlineSeconds: 300,
        extra: {
          name: "Omnispect-X",
          version: "1",
          chainId: 196,
          tokenAddress: config.x402.paymentTokenAddress, // USDG
          facilitatorAddress: config.okx.baseUrl,
        },
      };

      return c.json(
        { error: "Payment Required", paymentRequirements: requirements },
        402
      );
    }

    // Verify payment
    const valid = await verifyPayment(paymentHeader);
    if (!valid) {
      return c.json({ error: "Invalid payment" }, 402);
    }

    // Process request
    await next();

    // Settle payment after successful response
    await settlePayment(paymentHeader);
  };
}
