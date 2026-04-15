import type { Context, Next } from "hono";
import { createHmac } from "crypto";
import { createPublicClient, http, defineChain, parseAbiItem, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { config } from "../config";

// Derive payTo address once (not on every request)
const payToAddress = config.agentWallet.privateKey
  ? privateKeyToAccount(config.agentWallet.privateKey as Hex).address
  : null;

// ─── On-Chain Verification (viem) ──────────────────────────────────────────

const xlayer = defineChain({
  id: 196,
  name: "X Layer",
  nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 },
  rpcUrls: { default: { http: [config.xlayer.rpcUrl] } },
});

const publicClient = createPublicClient({ chain: xlayer, transport: http(config.xlayer.rpcUrl) });

const TRANSFER_EVENT = parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 value)");

async function verifyPaymentOnChain(txHash: string): Promise<boolean> {
  try {
    const receipt = await publicClient.getTransactionReceipt({ hash: txHash as `0x${string}` });

    if (receipt.status !== "success") return false;

    const usdgAddress = config.x402.paymentTokenAddress.toLowerCase();
    const requiredAmount = BigInt(config.x402.pricePerReport);

    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== usdgAddress) continue;
      if (!log.topics[0] || log.topics[0] !== "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef") continue;

      // Decode Transfer(from, to, value)
      const to = log.topics[2] ? ("0x" + log.topics[2].slice(26)) as `0x${string}` : null;
      const value = log.data ? BigInt(log.data) : 0n;

      if (to && payToAddress && to.toLowerCase() === payToAddress.toLowerCase() && value >= requiredAmount) {
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}

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
    // Demo mode bypass — OKX x402 facilitator endpoints not yet available
    if ((process.env.X402_DEMO_MODE || "").toLowerCase() === "true") {
      await next();
      return;
    }

    const paymentHeader = c.req.header("X-Payment") || c.req.header("x-payment");

    if (!paymentHeader) {
      if (!payToAddress) {
        return c.json({ error: "Payment not configured — PRIVATE_KEY missing" }, 503);
      }

      // Return 402 with payment requirements
      const requirements = {
        scheme: "exact",
        network: "xlayer",
        maxAmountRequired: config.x402.pricePerReport,
        resource: c.req.url,
        description: "Premium Omnispect-X Trust Report",
        mimeType: "application/json",
        payToAddress,
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

    // Verify payment: try on-chain first, then OKX facilitator
    let valid = false;
    if (paymentHeader.startsWith("0x") && paymentHeader.length === 66) {
      valid = await verifyPaymentOnChain(paymentHeader);
    }
    if (!valid) {
      valid = await verifyPayment(paymentHeader);
    }
    if (!valid) {
      return c.json({ error: "Invalid payment" }, 402);
    }

    // Process request
    await next();

    // Fire-and-forget settlement (don't block response on settlement)
    settlePayment(paymentHeader).catch((err) => {
      console.error(`[x402] Settlement failed for payment: ${paymentHeader.slice(0, 32)}... — ${err}`);
    });
  };
}
