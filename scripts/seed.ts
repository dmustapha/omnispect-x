import { createWalletClient, http, createPublicClient, keccak256, toBytes, defineChain, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { config } from "../src/config";

const LINEAGE_ABI = [
  {
    name: "registerAgent",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "metadata", type: "string" }],
    outputs: [],
  },
  {
    name: "logDecision",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "decisionId", type: "bytes32" },
      { name: "reasoningHash", type: "bytes32" },
      { name: "reasoningURI", type: "string" },
      { name: "actionType", type: "uint8" },
      { name: "resultTxHash", type: "bytes32" },
    ],
    outputs: [],
  },
  {
    name: "isRegistered",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "agent", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

const xlayer = defineChain({
  id: 196,
  name: "X Layer",
  nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 },
  rpcUrls: { default: { http: [config.xlayer.rpcUrl] } },
});

const account = privateKeyToAccount(config.agentWallet.privateKey as Hex);

const walletClient = createWalletClient({
  account,
  chain: xlayer,
  transport: http(config.xlayer.rpcUrl),
});

const publicClient = createPublicClient({
  chain: xlayer,
  transport: http(config.xlayer.rpcUrl),
});

const contract = config.xlayer.lineageLoggerAddress as `0x${string}`;

const DECISIONS = [
  { actionType: 0, reason: "Strong OKB momentum detected via smart money signals" },
  { actionType: 1, reason: "Taking partial profits on USDC position" },
  { actionType: 2, reason: "Market volatility too high, holding positions" },
  { actionType: 0, reason: "USDG accumulation — low risk, stablecoin position" },
  { actionType: 3, reason: "OKB sell signal — RSI overbought, reducing exposure" },
];

async function seed() {
  console.log("Checking agent registration...");
  const isReg = await publicClient.readContract({
    address: contract,
    abi: LINEAGE_ABI,
    functionName: "isRegistered",
    args: [account.address],
  });

  if (!isReg) {
    console.log("Registering agent...");
    const regHash = await walletClient.writeContract({
      address: contract,
      abi: LINEAGE_ABI,
      functionName: "registerAgent",
      args: ['{"name":"Omnispect-X Seed Agent","strategy":"momentum"}'],
    });
    await publicClient.waitForTransactionReceipt({ hash: regHash });
    console.log("Agent registered:", regHash);
  } else {
    console.log("Agent already registered.");
  }

  for (let i = 0; i < DECISIONS.length; i++) {
    const d = DECISIONS[i];
    const reasoning = { phase: "seed", reason: d.reason, index: i };
    const reasoningHash = keccak256(toBytes(JSON.stringify(reasoning)));
    const decisionId = keccak256(toBytes(`seed-${Date.now()}-${i}-${Math.random()}`));

    console.log(`Logging decision ${i + 1}/5: ${d.reason.slice(0, 40)}...`);

    const hash = await walletClient.writeContract({
      address: contract,
      abi: LINEAGE_ABI,
      functionName: "logDecision",
      args: [
        decisionId,
        reasoningHash,
        `ipfs://seed-decision-${i}`,
        d.actionType,
        `0x${"0".repeat(64)}` as `0x${string}`,
      ],
    });
    await publicClient.waitForTransactionReceipt({ hash });
    console.log(`  Done: ${hash}`);
  }

  console.log("\nSeed complete. 5 decisions logged on-chain.");
}

seed().catch(console.error);
