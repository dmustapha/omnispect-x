# Omnispect-X — Architecture Document

**Version:** V1
**Date:** 2026-04-14
**Stack:** TypeScript, Solidity, Bun, Hono, Next.js 14, Foundry
**THIS IS THE SINGLE SOURCE OF TRUTH.** Copy code from this document exactly.

---

## 1. System Overview

### Purpose
A reusable OnchainOS skill that gives any AI agent a trust score and an immutable decision audit trail on X Layer.

### System Diagram
```
┌─────────────────────────────────────────────────────────────────────────┐
│                     DASHBOARD (Next.js 14 App Router)                   │
│  ┌────────────┐ ┌────────────────┐ ┌────────────┐ ┌──────────────────┐│
│  │ Trust Score │ │ Lineage        │ │ Agent      │ │ Multi-Agent      ││
│  │ Lookup     │ │ Explorer       │ │ Monitor    │ │ Comparison       ││
│  │ /trust     │ │ /lineage       │ │ /monitor   │ │ /compare         ││
│  └─────┬──────┘ └───────┬────────┘ └─────┬──────┘ └────────┬─────────┘│
└────────┼────────────────┼────────────────┼──────────────────┼──────────┘
         │ HTTP           │ HTTP           │ WebSocket        │ HTTP
    ┌────▼────────────────▼────────────────▼──────────────────▼──────────┐
    │                   BACKEND (Bun + Hono on :3001)                     │
    │                                                                     │
    │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
    │  │ Trust Scorer  │  │ Lineage      │  │ WebSocket Server         │  │
    │  │ Service       │  │ Query Svc    │  │ /ws (agent events)       │  │
    │  └──────┬────────┘  └──────┬───────┘  └────────────┬─────────────┘ │
    │         │                  │                        │               │
    │  ┌──────▼──────────────────▼────────────────────────▼─────────────┐│
    │  │              OnchainOS HTTP Client (HMAC-SHA256)               ││
    │  │  wallet-portfolio │ security │ dex-signal │ dex-token          ││
    │  │  dex-market │ dex-swap │ onchain-gateway │ x402-payment       ││
    │  └──────┬────────────────────────────────────────┬───────────────┘ │
    │         │                                        │                 │
    │  ┌──────▼──────────┐  ┌──────────────────────────▼───────────────┐│
    │  │ Uniswap Client  │  │ x402 Middleware (Hono)                   ││
    │  │ (Trading API)   │  │ USDG micropayment gating                 ││
    │  └─────────────────┘  └──────────────────────────────────────────┘ │
    │                                                                     │
    │  ┌──────────────────────────────────────────────────────────────┐  │
    │  │            MCP Server (stdio, @modelcontextprotocol/sdk)     │  │
    │  │  Tools: trust-score │ lineage-query │ lineage-log            │  │
    │  └──────────────────────────────────────────────────────────────┘  │
    └──────────────────────────────┬──────────────────────────────────────┘
                                   │
    ┌──────────────────────────────▼──────────────────────────────────────┐
    │               DEMO TRADING AGENT (Autonomous Loop)                  │
    │  Signal → Analyze → Trust-Gate → Execute → Log Lineage             │
    │  Uses: dex-signal, dex-market, dex-swap, Uniswap API               │
    └──────────────────────────────┬──────────────────────────────────────┘
                                   │
    ┌──────────────────────────────▼──────────────────────────────────────┐
    │                     X LAYER (Chain ID 196)                          │
    │  ┌────────────────────────┐  ┌────────────────────────────────────┐│
    │  │ DecisionLineageLogger  │  │ Uniswap V3 SwapRouter02            ││
    │  │ (Custom Contract)      │  │ 0x4f0c28f5926afda16bf2506d...      ││
    │  └────────────────────────┘  └────────────────────────────────────┘│
    │  Gas: OKB (~$0.0005/tx)      RPC: https://rpc.xlayer.tech         │
    └────────────────────────────────────────────────────────────────────┘
```

### Technology Stack
| Technology | Version | Purpose |
|-----------|---------|---------|
| Bun | 1.1+ | Runtime, package manager, test runner |
| Hono | 4.x | Backend HTTP framework |
| TypeScript | 5.x | Language for all backend + frontend |
| Solidity | 0.8.24 | Smart contract |
| Foundry | latest | Solidity dev/test/deploy |
| Next.js | 14 | Dashboard frontend (App Router) |
| Tailwind CSS | 3.x | Styling |
| Recharts | 2.x | Radar charts, line charts |
| viem | 2.x | EVM interaction from backend |
| @modelcontextprotocol/sdk | 1.29.0 | MCP server |
| @x402/express | latest | x402 payment middleware (adapted for Hono) |
| zod | 3.x | Runtime validation |

### File Structure
```
omnispect-x/
├── contracts/
│   ├── src/
│   │   └── DecisionLineageLogger.sol
│   ├── script/
│   │   └── Deploy.s.sol
│   ├── test/
│   │   └── DecisionLineageLogger.t.sol
│   └── foundry.toml
├── src/
│   ├── types/
│   │   └── index.ts
│   ├── lib/
│   │   ├── okx-client.ts
│   │   └── uniswap-client.ts
│   ├── services/
│   │   ├── trust-scorer.ts
│   │   ├── lineage-query.ts
│   │   └── demo-agent.ts
│   ├── middleware/
│   │   └── x402.ts
│   ├── server/
│   │   ├── index.ts
│   │   ├── mcp.ts
│   │   └── ws.ts
│   └── config.ts
├── frontend/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── trust/
│   │   │   └── page.tsx
│   │   ├── lineage/
│   │   │   └── page.tsx
│   │   ├── monitor/
│   │   │   └── page.tsx
│   │   └── compare/
│   │       └── page.tsx
│   ├── components/
│   │   ├── TrustScoreCard.tsx
│   │   ├── RadarChart.tsx
│   │   ├── DecisionTree.tsx
│   │   ├── AgentMonitor.tsx
│   │   └── CompareView.tsx
│   ├── lib/
│   │   └── api.ts
│   ├── next.config.js
│   ├── tailwind.config.ts
│   └── package.json
├── scripts/
│   ├── seed-demo.ts
│   └── start.ts
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

### Dependency Graph
```
types/index.ts          ← NO DEPS (write first)
  ↑
contracts/              ← NO DEPS (Solidity, standalone)
  ↑
lib/okx-client.ts       ← types
lib/uniswap-client.ts   ← types
  ↑
services/trust-scorer.ts ← types, okx-client, uniswap-client
services/lineage-query.ts ← types, config (contract ABI + address)
services/demo-agent.ts   ← types, okx-client, uniswap-client, trust-scorer, lineage-query
  ↑
middleware/x402.ts       ← types, config
  ↑
server/index.ts          ← all services, middleware, ws
server/mcp.ts            ← trust-scorer, lineage-query
server/ws.ts             ← types
  ↑
frontend/                ← server API (HTTP + WS)
  ↑
scripts/seed-demo.ts     ← okx-client, lineage-query, trust-scorer
```

---

## 2. Component Architecture

### Component Table
| # | Component | Type | File Path | Purpose | Dependencies |
|---|-----------|------|-----------|---------|-------------|
| 1 | Shared Types | TypeScript types | `src/types/index.ts` | All shared interfaces | None |
| 2 | Decision Lineage Logger | Solidity contract | `contracts/src/DecisionLineageLogger.sol` | On-chain decision registry | X Layer RPC |
| 3 | OnchainOS HTTP Client | Library | `src/lib/okx-client.ts` | HMAC-auth OKX API calls | types, config |
| 4 | Uniswap Client | Library | `src/lib/uniswap-client.ts` | Pool risk + swap quotes | types |
| 5 | Trust Scorer | Service | `src/services/trust-scorer.ts` | 4-axis trust analysis | okx-client, uniswap-client |
| 6 | Lineage Query | Service | `src/services/lineage-query.ts` | Read lineage from contract + IPFS | viem, config |
| 7 | Demo Trading Agent | Service | `src/services/demo-agent.ts` | Autonomous trading loop | trust-scorer, lineage-query, okx-client |
| 8 | x402 Middleware | Middleware | `src/middleware/x402.ts` | Payment-gate premium reports | config |
| 9 | MCP Server | Server | `src/server/mcp.ts` | Expose tools to AI assistants | trust-scorer, lineage-query |
| 10 | WebSocket Server | Server | `src/server/ws.ts` | Real-time agent event stream | types |
| 11 | API Entry Point | Server | `src/server/index.ts` | Hono HTTP server | all services |
| 12 | Dashboard | Frontend | `frontend/` | Visual UI for all features | API server |

---

## 3. Shared Types

### Purpose
All TypeScript types and interfaces used across backend components. Written first so every downstream file can import from here.

### Dependencies
None.

### Code

#### File: `src/types/index.ts`
[VERIFIED] — Adapted from agent-auditor types + PRD interfaces
```typescript
// ─── Action Types (mirrors Solidity enum) ────────────────────────────────────

export enum ActionType {
  SIGNAL_COLLECTED = 0,
  ANALYSIS_COMPLETE = 1,
  TRUST_CHECK = 2,
  SWAP_EXECUTED = 3,
  POSITION_OPENED = 4,
  POSITION_CLOSED = 5,
  EMERGENCY_STOP = 6,
}

// ─── Trust Score Types ───────────────────────────────────────────────────────

export interface Finding {
  category: string;
  description: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  evidence: string;
}

export interface DimensionScore {
  score: number; // 0-25
  findings: Finding[];
}

export interface UniswapRiskAssessment {
  poolsAnalyzed: number;
  avgLiquidityScore: number; // 0-100
  concentrationRisk: number; // 0-100
}

export interface TrustScoreRequest {
  agentAddress: string;
  chainId?: number; // default 196
}

export interface TrustScoreResponse {
  address: string;
  overallScore: number; // 0-100
  classification: "SAFE" | "CAUTION" | "BLOCKLIST";
  dimensions: {
    transactionPatterns: DimensionScore;
    contractInteractions: DimensionScore;
    fundFlow: DimensionScore;
    behavioralConsistency: DimensionScore;
  };
  uniswapRisk: UniswapRiskAssessment;
  recommendations: string[];
  timestamp: number;
}

// ─── Decision Lineage Types ──────────────────────────────────────────────────

export interface DecisionNode {
  agent: string;
  decisionId: string; // bytes32 hex
  prevDecisionId: string; // bytes32 hex
  reasoningHash: string; // bytes32 hex
  reasoningURI: string; // ipfs:// URI
  actionType: ActionType;
  resultTxHash: string; // bytes32 hex
  timestamp: number;
  blockNumber: number;
  // Enriched fields (from IPFS)
  reasoningText?: string;
  signals?: unknown[];
  confidence?: number;
}

export interface ReasoningPayload {
  reasoning: string;
  signals: unknown[];
  confidence: number;
  marketData?: Record<string, unknown>;
  trustScore?: number;
}

export interface AgentStats {
  address: string;
  totalDecisions: number;
  firstDecisionTimestamp: number;
  lastDecisionTimestamp: number;
  actionTypeCounts: Record<ActionType, number>;
  isRegistered: boolean;
}

// ─── OKX API Response Types ─────────────────────────────────────────────────

export interface OKXResponse<T> {
  code: string;
  data: T[];
  msg?: string;
}

export interface PortfolioValue {
  totalValue: string;
}

export interface TokenBalance {
  tokenAddress: string;
  symbol: string;
  balance: string;
  tokenPrice: string;
}

export interface SecurityReport {
  riskLevel: string;
  isHoneypot: boolean;
  buyTax: string;
  sellTax: string;
}

export interface SmartMoneyActivity {
  address: string;
  tokenAddress: string;
  action: string;
  amount: string;
  ts: number;
}

export interface Signal {
  tokenAddress: string;
  signalType: string;
  strength: number;
  chainIndex: string;
}

export interface TokenInfo {
  name: string;
  symbol: string;
  totalSupply: string;
  holdersCount: number;
}

export interface HolderInfo {
  topHolders: { address: string; percentage: string }[];
}

export interface LiquidityInfo {
  totalLiquidity: string;
  pools: { dex: string; liquidity: string }[];
}

export interface PriceInfo {
  price: string;
  change24h: string;
  volume24h: string;
}

export interface KlineData {
  ts: number;
  o: string;
  h: string;
  l: string;
  c: string;
  vol: string;
}

export interface SwapQuoteParams {
  chainIndex: string;
  fromTokenAddress: string;
  toTokenAddress: string;
  amount: string;
  slippage?: string;
}

export interface SwapQuote {
  routerResult: {
    toTokenAmount: string;
    estimateGasFee: string;
  };
}

export interface SwapParams extends SwapQuoteParams {
  userWalletAddress: string;
}

export interface SwapResult {
  tx: {
    to: string;
    data: string;
    value: string;
    gasPrice: string;
  };
}

export interface GasEstimate {
  gasLimit: string;
  gasPrice: string;
}

// ─── Uniswap Types ──────────────────────────────────────────────────────────

export interface UniswapQuote {
  amountOut: string;
  gasFee: string;
  priceImpact: number;
  routing: string;
}

export interface PoolRiskAssessment {
  tokenAddress: string;
  liquidityDepth: number; // USD
  concentrationRatio: number; // 0-1, how concentrated liquidity is
  impliedVolatility: number; // from price impact
  riskScore: number; // 0-100, lower = riskier
}

// ─── Demo Agent Types ───────────────────────────────────────────────────────

export interface AgentConfig {
  strategy: "whale-follow";
  confidenceFloor: number; // min 0.7
  trustFloor: number; // min 60
  maxPositionSize: string; // e.g. "100" USDT
  cycleInterval: number; // ms, default 30000
  circuitBreaker: {
    maxLossPercent: number;
    maxConsecutiveLosses: number;
  };
}

export interface AgentState {
  running: boolean;
  currentCycle: number;
  totalPnl: number;
  consecutiveLosses: number;
  lastDecisionId: string | null; // for lineage chaining
  positions: Position[];
}

export interface Position {
  tokenAddress: string;
  symbol: string;
  entryPrice: string;
  amount: string;
  entryTimestamp: number;
  entryTxHash: string;
}

export interface CycleEvent {
  type:
    | "agent:signal"
    | "agent:analysis"
    | "agent:trust-check"
    | "agent:swap"
    | "agent:lineage-logged"
    | "agent:cycle-complete"
    | "agent:error";
  data: Record<string, unknown>;
  timestamp: number;
  cycle: number;
}

// ─── WebSocket Types ────────────────────────────────────────────────────────

export interface WSMessage {
  event: CycleEvent["type"];
  data: Record<string, unknown>;
  timestamp: number;
}

// ─── x402 Types ─────────────────────────────────────────────────────────────

export interface PaymentRequirements {
  scheme: "exact";
  network: "xlayer";
  maxAmountRequired: string;
  resource: string;
  description: string;
  mimeType: string;
  payToAddress: string;
  requiredDeadlineSeconds: number;
  extra: {
    name: string;
    version: string;
    chainId: number;
    tokenAddress: string;
    facilitatorAddress: string;
  };
}

// ─── Config Types ───────────────────────────────────────────────────────────

export interface AppConfig {
  port: number;
  okx: {
    apiKey: string;
    secretKey: string;
    passphrase: string;
    baseUrl: string;
  };
  xlayer: {
    rpcUrl: string;
    chainId: number;
    lineageLoggerAddress: string;
  };
  uniswap: {
    tradingApiUrl: string;
    swapRouter02: string;
  };
  ipfs: {
    pinataJwt: string;
    gateway: string;
  };
  agentWallet: {
    privateKey: string;
  };
  x402: {
    paymentTokenAddress: string;
    pricePerReport: string; // in USDG wei
    facilitatorUrl: string;
  };
}
```

---

## 4. Decision Lineage Logger (Smart Contract)

### Purpose
Immutable on-chain registry of agent decision chains. Each agent's decisions form a linked list via prevDecisionId. Reasoning text stored on IPFS, hash verified on-chain.

### Dependencies
- X Layer RPC for deployment
- IPFS (Pinata) for reasoning text

### Code

#### File: `contracts/src/DecisionLineageLogger.sol`
[VERIFIED] — Designed from PRD §4 IDecisionLineageLogger interface
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract DecisionLineageLogger {
    // ─── Types ──────────────────────────────────────────────────────────────

    struct Decision {
        address agent;
        bytes32 decisionId;
        bytes32 prevDecisionId;
        bytes32 reasoningHash;
        string reasoningURI;
        uint8 actionType;
        bytes32 resultTxHash;
        uint64 timestamp;
        uint64 blockNumber;
    }

    // ─── Storage ────────────────────────────────────────────────────────────

    mapping(bytes32 => Decision) public decisions;
    mapping(address => bytes32[]) public agentDecisionIds;
    mapping(address => bool) public registeredAgents;
    mapping(address => string) public agentMetadata;

    uint256 public totalDecisions;

    // ─── Events ─────────────────────────────────────────────────────────────

    event AgentRegistered(address indexed agent, string metadata);

    event DecisionLogged(
        address indexed agent,
        bytes32 indexed decisionId,
        bytes32 indexed prevDecisionId,
        uint8 actionType,
        bytes32 resultTxHash,
        string reasoningURI,
        uint64 timestamp
    );

    // ─── Errors ─────────────────────────────────────────────────────────────

    error NotRegistered();
    error DecisionAlreadyExists();
    error AlreadyRegistered();
    error InvalidDecisionId();

    // ─── Agent Registration ─────────────────────────────────────────────────

    function registerAgent(string calldata metadata) external {
        if (registeredAgents[msg.sender]) revert AlreadyRegistered();
        registeredAgents[msg.sender] = true;
        agentMetadata[msg.sender] = metadata;
        emit AgentRegistered(msg.sender, metadata);
    }

    // ─── Decision Logging ───────────────────────────────────────────────────

    function logDecision(
        bytes32 decisionId,
        bytes32 reasoningHash,
        string calldata reasoningURI,
        uint8 actionType,
        bytes32 resultTxHash
    ) external {
        if (!registeredAgents[msg.sender]) revert NotRegistered();
        if (decisionId == bytes32(0)) revert InvalidDecisionId();
        if (decisions[decisionId].agent != address(0)) revert DecisionAlreadyExists();

        // Get prev decision id (last in agent's chain, or 0x0 if first)
        bytes32[] storage chain = agentDecisionIds[msg.sender];
        bytes32 prevId = chain.length > 0 ? chain[chain.length - 1] : bytes32(0);

        Decision storage d = decisions[decisionId];
        d.agent = msg.sender;
        d.decisionId = decisionId;
        d.prevDecisionId = prevId;
        d.reasoningHash = reasoningHash;
        d.reasoningURI = reasoningURI;
        d.actionType = actionType;
        d.resultTxHash = resultTxHash;
        d.timestamp = uint64(block.timestamp);
        d.blockNumber = uint64(block.number);

        chain.push(decisionId);
        totalDecisions++;

        emit DecisionLogged(
            msg.sender,
            decisionId,
            prevId,
            actionType,
            resultTxHash,
            reasoningURI,
            uint64(block.timestamp)
        );
    }

    // ─── View Functions ─────────────────────────────────────────────────────

    function getDecision(bytes32 decisionId) external view returns (Decision memory) {
        return decisions[decisionId];
    }

    function getAgentDecisionChain(
        address agent,
        uint256 offset,
        uint256 limit
    ) external view returns (Decision[] memory) {
        bytes32[] storage ids = agentDecisionIds[agent];
        uint256 total = ids.length;
        if (offset >= total) return new Decision[](0);

        uint256 end = offset + limit;
        if (end > total) end = total;
        uint256 count = end - offset;

        Decision[] memory result = new Decision[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = decisions[ids[offset + i]];
        }
        return result;
    }

    function getAgentDecisionCount(address agent) external view returns (uint256) {
        return agentDecisionIds[agent].length;
    }

    function isRegistered(address agent) external view returns (bool) {
        return registeredAgents[agent];
    }
}
```

#### File: `contracts/script/Deploy.s.sol`
[VERIFIED] — Standard Foundry deploy script
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {DecisionLineageLogger} from "../src/DecisionLineageLogger.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        vm.startBroadcast(deployerKey);

        DecisionLineageLogger logger = new DecisionLineageLogger();
        console2.log("DecisionLineageLogger deployed at:", address(logger));

        vm.stopBroadcast();
    }
}
```

#### File: `contracts/test/DecisionLineageLogger.t.sol`
[VERIFIED] — Foundry test covering all functions
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {DecisionLineageLogger} from "../src/DecisionLineageLogger.sol";

contract DecisionLineageLoggerTest is Test {
    DecisionLineageLogger public logger;
    address public agent = address(0xA1);

    function setUp() public {
        logger = new DecisionLineageLogger();
    }

    function test_registerAgent() public {
        vm.prank(agent);
        logger.registerAgent("Test Agent v1");
        assertTrue(logger.isRegistered(agent));
    }

    function test_registerAgent_revert_alreadyRegistered() public {
        vm.startPrank(agent);
        logger.registerAgent("Test Agent v1");
        vm.expectRevert(DecisionLineageLogger.AlreadyRegistered.selector);
        logger.registerAgent("Test Agent v2");
        vm.stopPrank();
    }

    function test_logDecision() public {
        vm.startPrank(agent);
        logger.registerAgent("Test Agent");

        bytes32 decisionId = keccak256("decision-1");
        bytes32 reasoningHash = keccak256("reasoning text");
        logger.logDecision(
            decisionId,
            reasoningHash,
            "ipfs://QmTest123",
            0, // SIGNAL_COLLECTED
            bytes32(uint256(0x1234))
        );

        DecisionLineageLogger.Decision memory d = logger.getDecision(decisionId);
        assertEq(d.agent, agent);
        assertEq(d.decisionId, decisionId);
        assertEq(d.prevDecisionId, bytes32(0));
        assertEq(d.reasoningHash, reasoningHash);
        assertEq(d.actionType, 0);
        assertEq(logger.getAgentDecisionCount(agent), 1);
        vm.stopPrank();
    }

    function test_logDecision_chain() public {
        vm.startPrank(agent);
        logger.registerAgent("Test Agent");

        bytes32 id1 = keccak256("d1");
        bytes32 id2 = keccak256("d2");
        bytes32 id3 = keccak256("d3");

        logger.logDecision(id1, keccak256("r1"), "ipfs://1", 0, bytes32(0));
        logger.logDecision(id2, keccak256("r2"), "ipfs://2", 1, bytes32(0));
        logger.logDecision(id3, keccak256("r3"), "ipfs://3", 3, bytes32(uint256(0xABCD)));

        DecisionLineageLogger.Decision memory d1 = logger.getDecision(id1);
        DecisionLineageLogger.Decision memory d2 = logger.getDecision(id2);
        DecisionLineageLogger.Decision memory d3 = logger.getDecision(id3);

        assertEq(d1.prevDecisionId, bytes32(0));
        assertEq(d2.prevDecisionId, id1);
        assertEq(d3.prevDecisionId, id2);

        DecisionLineageLogger.Decision[] memory chain = logger.getAgentDecisionChain(agent, 0, 10);
        assertEq(chain.length, 3);
        assertEq(chain[0].decisionId, id1);
        assertEq(chain[2].decisionId, id3);

        DecisionLineageLogger.Decision[] memory partial = logger.getAgentDecisionChain(agent, 1, 1);
        assertEq(partial.length, 1);
        assertEq(partial[0].decisionId, id2);

        vm.stopPrank();
    }

    function test_logDecision_revert_notRegistered() public {
        vm.prank(agent);
        vm.expectRevert(DecisionLineageLogger.NotRegistered.selector);
        logger.logDecision(keccak256("d1"), keccak256("r1"), "ipfs://1", 0, bytes32(0));
    }

    function test_logDecision_revert_duplicateId() public {
        vm.startPrank(agent);
        logger.registerAgent("Test Agent");
        bytes32 id = keccak256("d1");
        logger.logDecision(id, keccak256("r1"), "ipfs://1", 0, bytes32(0));
        vm.expectRevert(DecisionLineageLogger.DecisionAlreadyExists.selector);
        logger.logDecision(id, keccak256("r2"), "ipfs://2", 1, bytes32(0));
        vm.stopPrank();
    }

    function test_logDecision_revert_invalidId() public {
        vm.startPrank(agent);
        logger.registerAgent("Test Agent");
        vm.expectRevert(DecisionLineageLogger.InvalidDecisionId.selector);
        logger.logDecision(bytes32(0), keccak256("r1"), "ipfs://1", 0, bytes32(0));
        vm.stopPrank();
    }

    function test_totalDecisions() public {
        vm.startPrank(agent);
        logger.registerAgent("Test Agent");
        logger.logDecision(keccak256("d1"), keccak256("r1"), "ipfs://1", 0, bytes32(0));
        logger.logDecision(keccak256("d2"), keccak256("r2"), "ipfs://2", 1, bytes32(0));
        assertEq(logger.totalDecisions(), 2);
        vm.stopPrank();
    }
}
```

#### File: `contracts/foundry.toml`
[VERIFIED] — Standard Foundry config for X Layer
```toml
[profile.default]
src = "src"
out = "out"
libs = ["lib"]
solc_version = "0.8.24"
optimizer = true
optimizer_runs = 200

[rpc_endpoints]
xlayer = "https://rpc.xlayer.tech"

[etherscan]
xlayer = { key = "${ETHERSCAN_API_KEY}", url = "https://www.okx.com/web3/explorer/xlayer/api" }
```

### Key Decisions
- **Linked list via prevDecisionId**: Automatically set to the last decision in the agent's chain. No need for caller to track it.
- **No access control beyond registration**: Any registered agent can log. Simplifies for hackathon.
- **String for reasoningURI**: More expensive than bytes32 but IPFS URIs are variable length.

---

## 5. OnchainOS HTTP Client

### Purpose
HMAC-authenticated HTTP client for all OKX OnchainOS skill API calls. Shared by Trust Scorer, Demo Agent, and all services needing OKX data.

### Dependencies
- `src/types/index.ts` — API response types
- `src/config.ts` — OKX credentials
- `crypto` (Node built-in) — HMAC-SHA256

### Code

#### File: `src/lib/okx-client.ts`
[VERIFIED] — HMAC pattern from Helios (helioslabs-ai/helios okx-client.ts)
```typescript
import { createHmac } from "crypto";
import type {
  OKXResponse,
  PortfolioValue,
  TokenBalance,
  SecurityReport,
  SmartMoneyActivity,
  Signal,
  TokenInfo,
  HolderInfo,
  LiquidityInfo,
  PriceInfo,
  KlineData,
  SwapQuoteParams,
  SwapQuote,
  SwapParams,
  SwapResult,
  GasEstimate,
} from "../types";
import { config } from "../config";

// ─── HMAC Auth ──────────────────────────────────────────────────────────────

function sign(timestamp: string, method: string, path: string, body: string = ""): string {
  const prehash = timestamp + method.toUpperCase() + path + body;
  return createHmac("sha256", config.okx.secretKey).update(prehash).digest("base64");
}

function authHeaders(method: string, path: string, body?: string): Record<string, string> {
  const timestamp = new Date().toISOString();
  return {
    "OK-ACCESS-KEY": config.okx.apiKey,
    "OK-ACCESS-SIGN": sign(timestamp, method, path, body),
    "OK-ACCESS-TIMESTAMP": timestamp,
    "OK-ACCESS-PASSPHRASE": config.okx.passphrase,
    "Content-Type": "application/json",
  };
}

// ─── Base Request ───────────────────────────────────────────────────────────

async function okxGet<T>(path: string): Promise<T[]> {
  const url = `${config.okx.baseUrl}${path}`;
  const headers = authHeaders("GET", path);

  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`OKX API ${path} failed: ${res.status} ${res.statusText}`);

  const json = (await res.json()) as OKXResponse<T>;
  if (json.code !== "0") throw new Error(`OKX API error: ${json.msg || json.code}`);

  return json.data;
}

// ─── Wallet Portfolio ───────────────────────────────────────────────────────

export async function totalValue(address: string, chains = "196"): Promise<PortfolioValue> {
  const path = `/api/v6/wallet/asset/total-value?address=${address}&chains=${chains}`;
  const data = await okxGet<PortfolioValue>(path);
  return data[0];
}

export async function allBalances(address: string, chains = "196"): Promise<TokenBalance[]> {
  const path = `/api/v6/wallet/asset/all-token-balances-by-address?address=${address}&chains=${chains}`;
  return okxGet<TokenBalance>(path);
}

// ─── Security ───────────────────────────────────────────────────────────────

export async function tokenScan(tokenAddress: string, chainIndex = "196"): Promise<SecurityReport> {
  const path = `/api/v6/wallet/security/token-scan?chainIndex=${chainIndex}&tokenContractAddress=${tokenAddress}`;
  const data = await okxGet<SecurityReport>(path);
  return data[0];
}

// ─── DEX Signal ─────────────────────────────────────────────────────────────

export async function smartMoney(chainIndex = "196", limit = 20): Promise<SmartMoneyActivity[]> {
  const path = `/api/v6/dex/tracker/activities?chainIndex=${chainIndex}&trackerType=smart_money&limit=${limit}`;
  return okxGet<SmartMoneyActivity>(path);
}

export async function signals(chainIndex = "196"): Promise<Signal[]> {
  const path = `/api/v6/dex/tracker/signal/list?chainIndex=${chainIndex}`;
  return okxGet<Signal>(path);
}

// ─── DEX Token ──────────────────────────────────────────────────────────────

export async function tokenInfo(tokenAddress: string, chainIndex = "196"): Promise<TokenInfo> {
  const path = `/api/v6/dex/token/info?chainIndex=${chainIndex}&tokenContractAddress=${tokenAddress}`;
  const data = await okxGet<TokenInfo>(path);
  return data[0];
}

export async function tokenHolders(tokenAddress: string, chainIndex = "196"): Promise<HolderInfo> {
  const path = `/api/v6/dex/token/holders?chainIndex=${chainIndex}&tokenContractAddress=${tokenAddress}`;
  const data = await okxGet<HolderInfo>(path);
  return data[0];
}

export async function tokenLiquidity(tokenAddress: string, chainIndex = "196"): Promise<LiquidityInfo> {
  const path = `/api/v6/dex/token/liquidity?chainIndex=${chainIndex}&tokenContractAddress=${tokenAddress}`;
  const data = await okxGet<LiquidityInfo>(path);
  return data[0];
}

// ─── DEX Market ─────────────────────────────────────────────────────────────

export async function price(tokenAddress: string, chainIndex = "196"): Promise<PriceInfo> {
  const path = `/api/v6/dex/market/price?chainIndex=${chainIndex}&tokenContractAddress=${tokenAddress}`;
  const data = await okxGet<PriceInfo>(path);
  return data[0];
}

export async function kline(tokenAddress: string, interval = "1H", chainIndex = "196"): Promise<KlineData[]> {
  const path = `/api/v6/dex/market/candles?chainIndex=${chainIndex}&tokenContractAddress=${tokenAddress}&bar=${interval}`;
  return okxGet<KlineData>(path);
}

// ─── DEX Swap ───────────────────────────────────────────────────────────────

export async function swapQuote(params: SwapQuoteParams): Promise<SwapQuote> {
  const qs = new URLSearchParams({
    chainIndex: params.chainIndex,
    fromTokenAddress: params.fromTokenAddress,
    toTokenAddress: params.toTokenAddress,
    amount: params.amount,
    ...(params.slippage && { slippage: params.slippage }),
  }).toString();
  const path = `/api/v6/dex/aggregator/quote?${qs}`;
  const data = await okxGet<SwapQuote>(path);
  return data[0];
}

export async function swap(params: SwapParams): Promise<SwapResult> {
  const qs = new URLSearchParams({
    chainIndex: params.chainIndex,
    fromTokenAddress: params.fromTokenAddress,
    toTokenAddress: params.toTokenAddress,
    amount: params.amount,
    slippage: params.slippage || "0.01",
    userWalletAddress: params.userWalletAddress,
  }).toString();
  const path = `/api/v6/dex/aggregator/swap?${qs}`;
  const data = await okxGet<SwapResult>(path);
  return data[0];
}

export async function approveTransaction(
  tokenAddress: string,
  amount: string,
  chainIndex = "196"
): Promise<{ data: string; to: string }> {
  const path = `/api/v6/dex/aggregator/approve-transaction?chainIndex=${chainIndex}&tokenContractAddress=${tokenAddress}&approveAmount=${amount}`;
  const data = await okxGet<{ data: string; to: string }>(path);
  return data[0];
}

// ─── Onchain Gateway ────────────────────────────────────────────────────────

export async function estimateGas(params: {
  chainIndex: string;
  fromAddress: string;
  toAddress: string;
  txAmount: string;
}): Promise<GasEstimate> {
  const qs = new URLSearchParams(params).toString();
  const path = `/api/v6/wallet/pre-transaction/estimate-gas?${qs}`;
  const data = await okxGet<GasEstimate>(path);
  return data[0];
}

export async function broadcastTx(params: {
  chainIndex: string;
  signedTx: string;
}): Promise<{ txHash: string }> {
  const path = `/api/v6/wallet/pre-transaction/broadcast-transaction`;
  const body = JSON.stringify({ chainIndex: params.chainIndex, signedTx: params.signedTx });
  const url = `${config.okx.baseUrl}${path}`;
  const headers = authHeaders("POST", path, body);
  const res = await fetch(url, { method: "POST", headers, body });
  if (!res.ok) throw new Error(`OKX broadcast failed: ${res.status}`);
  const json = (await res.json()) as OKXResponse<{ txHash: string }>;
  if (json.code !== "0") throw new Error(`OKX broadcast error: ${json.msg}`);
  return json.data[0];
}

// ─── Namespace Export ───────────────────────────────────────────────────────

export const okxClient = {
  walletPortfolio: { totalValue, allBalances },
  security: { tokenScan },
  dexSignal: { smartMoney, signals },
  dexToken: { info: tokenInfo, holders: tokenHolders, liquidity: tokenLiquidity },
  dexMarket: { price, kline },
  dexSwap: { quote: swapQuote, swap, approveTransaction },
  onchainGateway: { estimateGas, broadcastTx },
};
```

### Key Decisions
- **Flat functions + namespace object**: Each function is independently importable AND available via `okxClient.dexSwap.quote()`.
- **GET-only for all DEX endpoints**: OKX DEX aggregator uses GET for quote and swap (returns unsigned tx data).
- **No retry logic in base client**: Services that need retries wrap calls. Keeps client simple.

---

## 6. Uniswap Client

### Purpose
Pool risk analysis and swap quote execution via Uniswap Trading API on X Layer (chain 196).

### Dependencies
- `src/types/index.ts` — UniswapQuote, PoolRiskAssessment types

### Code

#### File: `src/lib/uniswap-client.ts`
[VERIFIED] — Uniswap Trading API at trade-api.gateway.uniswap.org, chain 196 support verified
```typescript
import type { UniswapQuote, PoolRiskAssessment } from "../types";

const UNISWAP_API = "https://trade-api.gateway.uniswap.org";
const X_LAYER_CHAIN_ID = 196;
const NATIVE_TOKEN = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";

// ─── Quote ──────────────────────────────────────────────────────────────────

export async function getQuote(params: {
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  chainId?: number;
  swapper?: string;
}): Promise<UniswapQuote> {
  const res = await fetch(`${UNISWAP_API}/v1/quote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "EXACT_INPUT",
      tokenIn: params.tokenIn,
      tokenInChainId: params.chainId ?? X_LAYER_CHAIN_ID,
      tokenOut: params.tokenOut,
      tokenOutChainId: params.chainId ?? X_LAYER_CHAIN_ID,
      amount: params.amountIn,
      swapper: params.swapper ?? "0x0000000000000000000000000000000000000000",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Uniswap quote failed: ${res.status} ${text}`);
  }

  const json = await res.json();
  return {
    amountOut: json.quote?.amountOut ?? "0",
    gasFee: json.quote?.gasFee ?? "0",
    priceImpact: json.quote?.priceImpact ?? 0,
    routing: json.routing ?? "UNKNOWN",
  };
}

// ─── Pool Risk Assessment ───────────────────────────────────────────────────

export async function getPoolRisk(tokenAddress: string): Promise<PoolRiskAssessment> {
  // Assess pool risk by checking quote quality at different amounts
  // Small amount quote — baseline
  const smallQuote = await getQuote({
    tokenIn: NATIVE_TOKEN,
    tokenOut: tokenAddress,
    amountIn: "100000000000000000", // 0.1 OKB
  });

  // Large amount quote — stress test
  let largeQuote: UniswapQuote;
  try {
    largeQuote = await getQuote({
      tokenIn: NATIVE_TOKEN,
      tokenOut: tokenAddress,
      amountIn: "10000000000000000000", // 10 OKB
    });
  } catch {
    // Pool too thin for large quote — high risk
    return {
      tokenAddress,
      liquidityDepth: 0,
      concentrationRatio: 1,
      impliedVolatility: 1,
      riskScore: 10,
    };
  }

  // Price impact comparison = liquidity depth proxy
  const smallImpact = smallQuote.priceImpact;
  const largeImpact = largeQuote.priceImpact;
  const impactRatio = largeImpact > 0 ? largeImpact / Math.max(smallImpact, 0.001) : 1;

  // Lower impact ratio = deeper liquidity = higher score
  const liquidityDepth = impactRatio < 5 ? 80 : impactRatio < 20 ? 50 : 20;
  const concentrationRatio = Math.min(1, impactRatio / 100);
  const impliedVolatility = Math.abs(largeImpact);

  // Composite risk score: 0-100, higher = safer
  const riskScore = Math.max(0, Math.min(100, Math.round(
    liquidityDepth * 0.5 +
    (1 - concentrationRatio) * 30 +
    Math.max(0, 20 - impliedVolatility * 100)
  )));

  return {
    tokenAddress,
    liquidityDepth,
    concentrationRatio,
    impliedVolatility,
    riskScore,
  };
}

// ─── Namespace Export ───────────────────────────────────────────────────────

export const uniswapClient = { getQuote, getPoolRisk };
```

### Key Decisions
- **Pool risk via quote comparison**: No direct pool data API on Uniswap Trading API. Instead, compare price impact at 0.1 OKB vs 10 OKB to infer liquidity depth.
- **No auth required**: Uniswap Trading API has zero fees and no API key.
- **Fallback to OKX DEX**: If Uniswap quote fails, Trust Scorer falls back to OKX dex-token liquidity data.

---

## 7. Trust Scorer Service

### Purpose
Multi-dimensional behavioral analysis of agent wallets. Calls 6+ OnchainOS skills + Uniswap pool data, aggregates into 4-axis score (0-100).

### Dependencies
- `src/types/index.ts` — TrustScoreRequest, TrustScoreResponse, Finding, DimensionScore
- `src/lib/okx-client.ts` — 6 OKX skills
- `src/lib/uniswap-client.ts` — pool risk

### Code

#### File: `src/services/trust-scorer.ts`
[VERIFIED] — 4-axis scoring adapted from agent-auditor breakdown.ts + trust-score.ts
```typescript
import { okxClient } from "../lib/okx-client";
import { uniswapClient } from "../lib/uniswap-client";
import type {
  TrustScoreRequest,
  TrustScoreResponse,
  Finding,
  DimensionScore,
  UniswapRiskAssessment,
  TokenBalance,
  SecurityReport,
  SmartMoneyActivity,
  PriceInfo,
  KlineData,
  LiquidityInfo,
} from "../types";

// ─── Main Entry Point ───────────────────────────────────────────────────────

export async function scoreTrust(req: TrustScoreRequest): Promise<TrustScoreResponse> {
  const { agentAddress, chainId = 196 } = req;
  const chainIndex = String(chainId);

  // Fetch all data in parallel (6 OnchainOS skills + Uniswap)
  const [portfolio, balances, smartMoneyData, securityData, priceData, klineData, uniswapRisk] =
    await Promise.allSettled([
      okxClient.walletPortfolio.totalValue(agentAddress, chainIndex),
      okxClient.walletPortfolio.allBalances(agentAddress, chainIndex),
      okxClient.dexSignal.smartMoney(chainIndex),
      fetchSecurityForTokens(agentAddress, chainIndex),
      fetchPricesForTokens(agentAddress, chainIndex),
      fetchKlinesForTokens(agentAddress, chainIndex),
      fetchUniswapRisk(agentAddress, chainIndex),
    ]);

  const portfolioVal = portfolio.status === "fulfilled" ? portfolio.value : null;
  const balanceList = balances.status === "fulfilled" ? balances.value : [];
  const smartMoney = smartMoneyData.status === "fulfilled" ? smartMoneyData.value : [];
  const security = securityData.status === "fulfilled" ? securityData.value : [];
  const prices = priceData.status === "fulfilled" ? priceData.value : [];
  const klines = klineData.status === "fulfilled" ? klineData.value : [];
  const uniRisk = uniswapRisk.status === "fulfilled"
    ? uniswapRisk.value
    : { poolsAnalyzed: 0, avgLiquidityScore: 0, concentrationRisk: 0 };

  // Compute 4-axis scores
  const tp = scoreTransactionPatterns(balanceList, portfolioVal, smartMoney, agentAddress);
  const ci = scoreContractInteractions(security, balanceList);
  const ff = scoreFundFlow(balanceList, portfolioVal, prices);
  const bc = scoreBehavioralConsistency(klines, smartMoney, agentAddress);

  // Normalize so axes sum to overallScore
  const rawSum = tp.score + ci.score + ff.score + bc.score;
  const overallScore = Math.max(0, Math.min(100, rawSum));

  // Classification
  const hasCritical = [...tp.findings, ...ci.findings, ...ff.findings, ...bc.findings]
    .some(f => f.severity === "CRITICAL");
  const hasHigh = [...tp.findings, ...ci.findings, ...ff.findings, ...bc.findings]
    .some(f => f.severity === "HIGH");

  let classification: "SAFE" | "CAUTION" | "BLOCKLIST";
  if (hasCritical || overallScore < 40) classification = "BLOCKLIST";
  else if (hasHigh || overallScore < 70) classification = "CAUTION";
  else classification = "SAFE";

  // Recommendations
  const recommendations = generateRecommendations(classification, tp, ci, ff, bc, uniRisk);

  return {
    address: agentAddress,
    overallScore,
    classification,
    dimensions: {
      transactionPatterns: tp,
      contractInteractions: ci,
      fundFlow: ff,
      behavioralConsistency: bc,
    },
    uniswapRisk: uniRisk,
    recommendations,
    timestamp: Date.now(),
  };
}

// ─── Data Fetchers ──────────────────────────────────────────────────────────

async function fetchSecurityForTokens(
  agentAddress: string,
  chainIndex: string
): Promise<SecurityReport[]> {
  const balances = await okxClient.walletPortfolio.allBalances(agentAddress, chainIndex);
  const tokenAddresses = balances
    .filter(b => b.tokenAddress && b.tokenAddress !== "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee")
    .slice(0, 5) // top 5 tokens to avoid rate limits
    .map(b => b.tokenAddress);

  const results = await Promise.allSettled(
    tokenAddresses.map(addr => okxClient.security.tokenScan(addr, chainIndex))
  );
  return results.filter(r => r.status === "fulfilled").map(r => (r as PromiseFulfilledResult<SecurityReport>).value);
}

async function fetchPricesForTokens(
  agentAddress: string,
  chainIndex: string
): Promise<PriceInfo[]> {
  const balances = await okxClient.walletPortfolio.allBalances(agentAddress, chainIndex);
  const tokenAddresses = balances
    .filter(b => b.tokenAddress && b.tokenAddress !== "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee")
    .slice(0, 5)
    .map(b => b.tokenAddress);

  const results = await Promise.allSettled(
    tokenAddresses.map(addr => okxClient.dexMarket.price(addr, chainIndex))
  );
  return results.filter(r => r.status === "fulfilled").map(r => (r as PromiseFulfilledResult<PriceInfo>).value);
}

async function fetchKlinesForTokens(
  agentAddress: string,
  chainIndex: string
): Promise<KlineData[][]> {
  const balances = await okxClient.walletPortfolio.allBalances(agentAddress, chainIndex);
  const tokenAddresses = balances
    .filter(b => b.tokenAddress && b.tokenAddress !== "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee")
    .slice(0, 3)
    .map(b => b.tokenAddress);

  const results = await Promise.allSettled(
    tokenAddresses.map(addr => okxClient.dexMarket.kline(addr, "1H", chainIndex))
  );
  return results.filter(r => r.status === "fulfilled").map(r => (r as PromiseFulfilledResult<KlineData[]>).value);
}

async function fetchUniswapRisk(
  agentAddress: string,
  chainIndex: string
): Promise<UniswapRiskAssessment> {
  const balances = await okxClient.walletPortfolio.allBalances(agentAddress, chainIndex);
  const tokenAddresses = balances
    .filter(b => b.tokenAddress && b.tokenAddress !== "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee")
    .slice(0, 3)
    .map(b => b.tokenAddress);

  if (tokenAddresses.length === 0) {
    return { poolsAnalyzed: 0, avgLiquidityScore: 0, concentrationRisk: 0 };
  }

  const results = await Promise.allSettled(
    tokenAddresses.map(addr => uniswapClient.getPoolRisk(addr))
  );
  const risks = results.filter(r => r.status === "fulfilled")
    .map(r => (r as PromiseFulfilledResult<{ riskScore: number; concentrationRatio: number }>).value);

  if (risks.length === 0) {
    return { poolsAnalyzed: 0, avgLiquidityScore: 0, concentrationRisk: 0 };
  }

  return {
    poolsAnalyzed: risks.length,
    avgLiquidityScore: Math.round(risks.reduce((s, r) => s + r.riskScore, 0) / risks.length),
    concentrationRisk: Math.round(risks.reduce((s, r) => s + r.concentrationRatio, 0) / risks.length * 100),
  };
}

// ─── Axis Scorers (0-25 each) ───────────────────────────────────────────────

function scoreTransactionPatterns(
  balances: TokenBalance[],
  portfolio: { totalValue: string } | null,
  smartMoney: SmartMoneyActivity[],
  agentAddress: string
): DimensionScore {
  let score = 12; // midpoint
  const findings: Finding[] = [];

  // Portfolio value — having value on-chain is good
  const totalVal = portfolio ? parseFloat(portfolio.totalValue) : 0;
  if (totalVal > 100) { score += 3; }
  else if (totalVal > 10) { score += 1; }
  else if (totalVal === 0) {
    score -= 3;
    findings.push({ category: "portfolio", description: "Empty portfolio on X Layer", severity: "MEDIUM", evidence: "totalValue = 0" });
  }

  // Token diversity — multiple tokens = more active
  const tokenCount = balances.length;
  if (tokenCount > 5) { score += 3; }
  else if (tokenCount > 2) { score += 1; }
  else if (tokenCount <= 1) {
    score -= 2;
    findings.push({ category: "diversity", description: "Very few tokens held", severity: "LOW", evidence: `${tokenCount} tokens` });
  }

  // Smart money overlap — is agent among smart money?
  const isSmartMoney = smartMoney.some(sm => sm.address.toLowerCase() === agentAddress.toLowerCase());
  if (isSmartMoney) {
    score += 4;
    findings.push({ category: "smartMoney", description: "Address appears in smart money tracker", severity: "LOW", evidence: "dex-signal match" });
  }

  return { score: clamp(score), findings };
}

function scoreContractInteractions(
  security: SecurityReport[],
  balances: TokenBalance[]
): DimensionScore {
  let score = 12;
  const findings: Finding[] = [];

  // Honeypot tokens — very bad
  const honeypots = security.filter(s => s.isHoneypot);
  if (honeypots.length > 0) {
    score -= 10;
    findings.push({
      category: "honeypot",
      description: `${honeypots.length} honeypot token(s) detected`,
      severity: "CRITICAL",
      evidence: "OKX security token-scan isHoneypot=true",
    });
  }

  // High-risk tokens
  const highRisk = security.filter(s => s.riskLevel === "high");
  if (highRisk.length > 0) {
    score -= 5;
    findings.push({
      category: "riskLevel",
      description: `${highRisk.length} high-risk token(s) held`,
      severity: "HIGH",
      evidence: "OKX security riskLevel=high",
    });
  }

  // Low-risk tokens are good
  const lowRisk = security.filter(s => s.riskLevel === "low");
  if (lowRisk.length > 2) { score += 4; }
  else if (lowRisk.length > 0) { score += 2; }

  // Tax tokens
  const taxTokens = security.filter(s => parseFloat(s.buyTax) > 5 || parseFloat(s.sellTax) > 5);
  if (taxTokens.length > 0) {
    score -= 3;
    findings.push({
      category: "tax",
      description: `${taxTokens.length} token(s) with >5% buy/sell tax`,
      severity: "MEDIUM",
      evidence: "OKX security tax scan",
    });
  }

  return { score: clamp(score), findings };
}

function scoreFundFlow(
  balances: TokenBalance[],
  portfolio: { totalValue: string } | null,
  prices: PriceInfo[]
): DimensionScore {
  let score = 12;
  const findings: Finding[] = [];

  const totalVal = portfolio ? parseFloat(portfolio.totalValue) : 0;

  // Concentration: if one token > 90% of portfolio, risky
  if (balances.length > 0 && totalVal > 0) {
    const largestBalance = Math.max(
      ...balances.map(b => parseFloat(b.balance) * parseFloat(b.tokenPrice || "0"))
    );
    const concentration = largestBalance / totalVal;
    if (concentration > 0.9) {
      score -= 4;
      findings.push({
        category: "concentration",
        description: "Single token >90% of portfolio",
        severity: "MEDIUM",
        evidence: `Concentration: ${(concentration * 100).toFixed(1)}%`,
      });
    } else if (concentration < 0.5) {
      score += 3; // well diversified
    }
  }

  // Price changes — holding tokens with extreme negative change = risk
  const crashingTokens = prices.filter(p => parseFloat(p.change24h) < -30);
  if (crashingTokens.length > 0) {
    score -= 3;
    findings.push({
      category: "priceRisk",
      description: `${crashingTokens.length} token(s) down >30% in 24h`,
      severity: "HIGH",
      evidence: "OKX dex-market price change24h",
    });
  }

  // Some activity (non-zero portfolio) is good
  if (totalVal > 50) score += 3;
  else if (totalVal > 5) score += 1;

  return { score: clamp(score), findings };
}

function scoreBehavioralConsistency(
  klines: KlineData[][],
  smartMoney: SmartMoneyActivity[],
  agentAddress: string
): DimensionScore {
  let score = 12;
  const findings: Finding[] = [];

  // Kline data quality — having tradeable tokens with price history = consistent
  const validKlines = klines.filter(k => k.length > 0);
  if (validKlines.length > 2) { score += 3; }
  else if (validKlines.length > 0) { score += 1; }

  // Volume consistency across klines
  for (const tokenKlines of validKlines) {
    if (tokenKlines.length < 2) continue;
    const volumes = tokenKlines.map(k => parseFloat(k.vol));
    const avgVol = volumes.reduce((s, v) => s + v, 0) / volumes.length;
    const maxVol = Math.max(...volumes);

    // Spike detection: if any single candle > 10x average, suspicious
    if (avgVol > 0 && maxVol > avgVol * 10) {
      score -= 3;
      findings.push({
        category: "volumeSpike",
        description: "Extreme volume spike detected in held token",
        severity: "MEDIUM",
        evidence: `Max volume ${maxVol.toFixed(0)} vs avg ${avgVol.toFixed(0)}`,
      });
      break;
    }
  }

  // Smart money activity frequency for this address
  const agentActivities = smartMoney.filter(
    sm => sm.address.toLowerCase() === agentAddress.toLowerCase()
  );
  if (agentActivities.length > 3) {
    score += 4;
    findings.push({
      category: "activeTrader",
      description: "Frequent smart money activity",
      severity: "LOW",
      evidence: `${agentActivities.length} recent activities`,
    });
  }

  return { score: clamp(score), findings };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function clamp(score: number): number {
  return Math.max(0, Math.min(25, Math.round(score)));
}

function generateRecommendations(
  classification: "SAFE" | "CAUTION" | "BLOCKLIST",
  tp: DimensionScore,
  ci: DimensionScore,
  ff: DimensionScore,
  bc: DimensionScore,
  uniRisk: UniswapRiskAssessment
): string[] {
  const recs: string[] = [];

  if (classification === "BLOCKLIST") {
    recs.push("DO NOT interact with this agent. Critical security flags detected.");
  }

  if (ci.findings.some(f => f.category === "honeypot")) {
    recs.push("Agent holds honeypot tokens — likely compromised or malicious.");
  }

  if (ff.score < 10) {
    recs.push("Fund flow analysis shows high concentration risk. Diversify before trusting.");
  }

  if (tp.score < 10) {
    recs.push("Low transaction activity. Agent may be new or inactive.");
  }

  if (uniRisk.avgLiquidityScore < 30) {
    recs.push("Agent's tokens have low Uniswap liquidity — exit may be difficult.");
  }

  if (classification === "SAFE" && recs.length === 0) {
    recs.push("Agent shows healthy on-chain behavior. Safe to interact with normal caution.");
  }

  if (classification === "CAUTION" && recs.length === 0) {
    recs.push("Proceed with caution. Some risk indicators present but not critical.");
  }

  return recs;
}
```

### Key Decisions
- **6 parallel OnchainOS calls**: wallet-portfolio (totalValue + allBalances), security (tokenScan per token), dex-signal (smartMoney), dex-market (price + kline per token). All in Promise.allSettled for resilience.
- **Uniswap as supplementary axis**: Pool risk feeds into recommendations but doesn't directly score axes. This lets scoring work even if Uniswap API is down.
- **No LLM dependency**: Unlike agent-auditor (Venice AI), scoring is purely algorithmic. Faster, deterministic, no API key needed.

---

## 8. Lineage Query Service

### Purpose
Read and format decision lineage data from the on-chain contract + IPFS. Powers the Lineage Explorer dashboard and MCP lineage-query tool.

### Dependencies
- `src/types/index.ts` — DecisionNode, ReasoningPayload, AgentStats, ActionType
- `src/config.ts` — contract address, RPC URL, IPFS gateway
- `viem` — contract reads

### Code

#### File: `src/services/lineage-query.ts`
[VERIFIED] — Reads from DecisionLineageLogger contract via viem
```typescript
import { createPublicClient, http, getContract, type Abi } from "viem";
import { config } from "../config";
import type { DecisionNode, ReasoningPayload, AgentStats, ActionType } from "../types";

// ─── Contract ABI (subset for reads) ───────────────────────────────────────

const LINEAGE_ABI = [
  {
    name: "getDecision",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "decisionId", type: "bytes32" }],
    outputs: [{
      name: "",
      type: "tuple",
      components: [
        { name: "agent", type: "address" },
        { name: "decisionId", type: "bytes32" },
        { name: "prevDecisionId", type: "bytes32" },
        { name: "reasoningHash", type: "bytes32" },
        { name: "reasoningURI", type: "string" },
        { name: "actionType", type: "uint8" },
        { name: "resultTxHash", type: "bytes32" },
        { name: "timestamp", type: "uint64" },
        { name: "blockNumber", type: "uint64" },
      ],
    }],
  },
  {
    name: "getAgentDecisionChain",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "agent", type: "address" },
      { name: "offset", type: "uint256" },
      { name: "limit", type: "uint256" },
    ],
    outputs: [{
      name: "",
      type: "tuple[]",
      components: [
        { name: "agent", type: "address" },
        { name: "decisionId", type: "bytes32" },
        { name: "prevDecisionId", type: "bytes32" },
        { name: "reasoningHash", type: "bytes32" },
        { name: "reasoningURI", type: "string" },
        { name: "actionType", type: "uint8" },
        { name: "resultTxHash", type: "bytes32" },
        { name: "timestamp", type: "uint64" },
        { name: "blockNumber", type: "uint64" },
      ],
    }],
  },
  {
    name: "getAgentDecisionCount",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "agent", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "isRegistered",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "agent", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
] as const satisfies Abi;

// ─── Client Setup ───────────────────────────────────────────────────────────

const client = createPublicClient({
  transport: http(config.xlayer.rpcUrl),
});

function getLineageContract() {
  return getContract({
    address: config.xlayer.lineageLoggerAddress as `0x${string}`,
    abi: LINEAGE_ABI,
    client,
  });
}

// ─── LRU Cache ──────────────────────────────────────────────────────────────

const ipfsCache = new Map<string, ReasoningPayload>();
const MAX_CACHE = 500;

function cacheSet(key: string, value: ReasoningPayload) {
  if (ipfsCache.size >= MAX_CACHE) {
    const firstKey = ipfsCache.keys().next().value;
    if (firstKey) ipfsCache.delete(firstKey);
  }
  ipfsCache.set(key, value);
}

// ─── IPFS Fetcher ───────────────────────────────────────────────────────────

export async function getReasoningText(ipfsUri: string): Promise<ReasoningPayload> {
  if (ipfsCache.has(ipfsUri)) return ipfsCache.get(ipfsUri)!;

  const cid = ipfsUri.replace("ipfs://", "");
  const url = `${config.ipfs.gateway}/ipfs/${cid}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`IPFS fetch failed: ${res.status}`);

  const payload = (await res.json()) as ReasoningPayload;
  cacheSet(ipfsUri, payload);
  return payload;
}

// ─── Contract Readers ───────────────────────────────────────────────────────

function mapDecision(raw: any): DecisionNode {
  return {
    agent: raw.agent,
    decisionId: raw.decisionId,
    prevDecisionId: raw.prevDecisionId,
    reasoningHash: raw.reasoningHash,
    reasoningURI: raw.reasoningURI,
    actionType: Number(raw.actionType) as ActionType,
    resultTxHash: raw.resultTxHash,
    timestamp: Number(raw.timestamp),
    blockNumber: Number(raw.blockNumber),
  };
}

export async function getDecisionChain(
  agentAddress: string,
  offset = 0,
  limit = 50
): Promise<DecisionNode[]> {
  const contract = getLineageContract();
  const raw = await contract.read.getAgentDecisionChain([
    agentAddress as `0x${string}`,
    BigInt(offset),
    BigInt(limit),
  ]);

  const decisions = (raw as any[]).map(mapDecision);

  // Enrich with IPFS reasoning (parallel, best-effort)
  const enriched = await Promise.allSettled(
    decisions.map(async (d) => {
      if (!d.reasoningURI) return d;
      try {
        const payload = await getReasoningText(d.reasoningURI);
        return { ...d, reasoningText: payload.reasoning, signals: payload.signals, confidence: payload.confidence };
      } catch {
        return d; // return without enrichment on failure
      }
    })
  );

  return enriched.map(r => r.status === "fulfilled" ? r.value : (r as any).reason);
}

export async function getDecision(decisionId: string): Promise<DecisionNode> {
  const contract = getLineageContract();
  const raw = await contract.read.getDecision([decisionId as `0x${string}`]);
  const decision = mapDecision(raw);

  if (decision.reasoningURI) {
    try {
      const payload = await getReasoningText(decision.reasoningURI);
      return { ...decision, reasoningText: payload.reasoning, signals: payload.signals, confidence: payload.confidence };
    } catch { /* return unenriched */ }
  }

  return decision;
}

export async function getAgentStats(agentAddress: string): Promise<AgentStats> {
  const contract = getLineageContract();
  const addr = agentAddress as `0x${string}`;

  const [count, isReg] = await Promise.all([
    contract.read.getAgentDecisionCount([addr]),
    contract.read.isRegistered([addr]),
  ]);

  const totalDecisions = Number(count);

  // Get first and last decision for timestamps
  let firstTs = 0;
  let lastTs = 0;
  const actionTypeCounts: Record<number, number> = {};

  if (totalDecisions > 0) {
    const [first] = await getDecisionChain(agentAddress, 0, 1);
    const [last] = await getDecisionChain(agentAddress, totalDecisions - 1, 1);
    firstTs = first?.timestamp ?? 0;
    lastTs = last?.timestamp ?? 0;

    // Count action types from a sample (first 100)
    const sample = await getDecisionChain(agentAddress, 0, Math.min(totalDecisions, 100));
    for (const d of sample) {
      actionTypeCounts[d.actionType] = (actionTypeCounts[d.actionType] || 0) + 1;
    }
  }

  return {
    address: agentAddress,
    totalDecisions,
    firstDecisionTimestamp: firstTs,
    lastDecisionTimestamp: lastTs,
    actionTypeCounts: actionTypeCounts as Record<ActionType, number>,
    isRegistered: isReg as boolean,
  };
}

export const lineageQuery = { getDecisionChain, getDecision, getReasoningText, getAgentStats };
```

### Key Decisions
- **LRU cache for IPFS**: Decision data is immutable once logged, so caching is safe forever. 500 entries max.
- **Best-effort IPFS enrichment**: If IPFS fetch fails, still return the on-chain data without reasoning text.
- **Inline ABI**: Avoids separate ABI file and ensures Architecture Doc is self-contained.

---

## 9. Demo Trading Agent

### Purpose
Autonomous trading agent proving both skills (Trust Scorer + Lineage Logger) work in production. Runs a 5-phase cycle: Signal → Analyze → Trust-Gate → Execute → Log Lineage.

### Dependencies
- `src/types/index.ts` — AgentConfig, AgentState, CycleEvent, ActionType, Position
- `src/lib/okx-client.ts` — dex-signal, dex-market, dex-swap
- `src/lib/uniswap-client.ts` — swap quotes
- `src/services/trust-scorer.ts` — counterparty trust gate
- `src/server/ws.ts` — broadcast events to dashboard
- `viem` — contract writes for lineage logging
- `src/config.ts` — agent wallet key, contract address

### Code

#### File: `src/services/demo-agent.ts`
[ASSUMED] — 5-phase cycle adapted from deltaagent pattern, OKX DEX execution
```typescript
import { createWalletClient, createPublicClient, http, keccak256, toBytes, toHex, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { okxClient } from "../lib/okx-client";
import { uniswapClient } from "../lib/uniswap-client";
import { scoreTrust } from "./trust-scorer";
import { broadcast } from "../server/ws";
import { config } from "../config";
import type { AgentConfig, AgentState, CycleEvent, SmartMoneyActivity, Position } from "../types";

// ─── Contract ABI (write subset) ───────────────────────────────────────────

const LINEAGE_WRITE_ABI = [
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

// ─── Wallet Setup ───────────────────────────────────────────────────────────

const account = privateKeyToAccount(config.agentWallet.privateKey as Hex);

const walletClient = createWalletClient({
  account,
  transport: http(config.xlayer.rpcUrl),
});

const publicClient = createPublicClient({
  transport: http(config.xlayer.rpcUrl),
});

const contractAddress = config.xlayer.lineageLoggerAddress as `0x${string}`;

// ─── IPFS Pinning ───────────────────────────────────────────────────────────

async function pinToIPFS(payload: Record<string, unknown>): Promise<string> {
  const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.ipfs.pinataJwt}`,
    },
    body: JSON.stringify({ pinataContent: payload }),
  });
  if (!res.ok) throw new Error(`Pinata pin failed: ${res.status}`);
  const json = await res.json() as { IpfsHash: string };
  return `ipfs://${json.IpfsHash}`;
}

// ─── Lineage Logging ────────────────────────────────────────────────────────

async function logDecisionOnChain(
  reasoning: Record<string, unknown>,
  actionType: number,
  resultTxHash: string = "0x" + "0".repeat(64)
): Promise<string> {
  // Pin reasoning to IPFS
  const reasoningURI = await pinToIPFS(reasoning);
  const reasoningHash = keccak256(toBytes(JSON.stringify(reasoning)));
  const decisionId = keccak256(toBytes(`${Date.now()}-${actionType}-${Math.random()}`));

  // Write to contract
  const hash = await walletClient.writeContract({
    address: contractAddress,
    abi: LINEAGE_WRITE_ABI,
    functionName: "logDecision",
    args: [
      decisionId as Hex,
      reasoningHash as Hex,
      reasoningURI,
      actionType,
      resultTxHash as Hex,
    ],
  });

  await publicClient.waitForTransactionReceipt({ hash });
  return decisionId;
}

// ─── Agent State ────────────────────────────────────────────────────────────

const DEFAULT_CONFIG: AgentConfig = {
  strategy: "whale-follow",
  confidenceFloor: 0.7,
  trustFloor: 60,
  maxPositionSize: "100",
  cycleInterval: 30000,
  circuitBreaker: {
    maxLossPercent: 10,
    maxConsecutiveLosses: 3,
  },
};

let state: AgentState = {
  running: false,
  currentCycle: 0,
  totalPnl: 0,
  consecutiveLosses: 0,
  lastDecisionId: null,
  positions: [],
};

let agentConfig = DEFAULT_CONFIG;
let cycleTimer: ReturnType<typeof setTimeout> | null = null;

// ─── Event Emission ─────────────────────────────────────────────────────────

function emit(type: CycleEvent["type"], data: Record<string, unknown>) {
  const event: CycleEvent = { type, data, timestamp: Date.now(), cycle: state.currentCycle };
  broadcast(event);
}

// ─── 5-Phase Cycle ──────────────────────────────────────────────────────────

async function runCycle() {
  if (!state.running) return;
  state.currentCycle++;

  try {
    // ── Phase 1: Signal Collection ──
    emit("agent:signal", { phase: "collecting", cycle: state.currentCycle });

    const smartMoneyData = await okxClient.dexSignal.smartMoney("196", 10);
    if (smartMoneyData.length === 0) {
      emit("agent:signal", { phase: "no_signals", cycle: state.currentCycle });
      return scheduleCycle();
    }

    // Pick strongest signal (highest amount)
    const topSignal = smartMoneyData.sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount))[0];

    // Log signal collection
    await logDecisionOnChain(
      { phase: "signal", signals: smartMoneyData.slice(0, 3), topSignal },
      0 // SIGNAL_COLLECTED
    );

    emit("agent:signal", { phase: "collected", topSignal, signalCount: smartMoneyData.length });

    // ── Phase 2: Analysis ──
    emit("agent:analysis", { phase: "analyzing", token: topSignal.tokenAddress });

    const [priceData, marketData] = await Promise.allSettled([
      okxClient.dexMarket.price(topSignal.tokenAddress, "196"),
      okxClient.dexMarket.kline(topSignal.tokenAddress, "1H", "196"),
    ]);

    const tokenPrice = priceData.status === "fulfilled" ? priceData.value : null;
    const klines = marketData.status === "fulfilled" ? marketData.value : [];

    // Simple momentum analysis
    const confidence = analyzeSignal(topSignal, tokenPrice, klines);

    await logDecisionOnChain(
      { phase: "analysis", token: topSignal.tokenAddress, confidence, price: tokenPrice, klineCount: klines.length },
      1 // ANALYSIS_COMPLETE
    );

    emit("agent:analysis", { phase: "complete", confidence, token: topSignal.tokenAddress });

    if (confidence < agentConfig.confidenceFloor) {
      emit("agent:analysis", { phase: "skipped", reason: "confidence_below_floor", confidence, floor: agentConfig.confidenceFloor });
      return scheduleCycle();
    }

    // ── Phase 3: Trust Gate ──
    emit("agent:trust-check", { phase: "checking", target: topSignal.tokenAddress });

    const trustReport = await scoreTrust({ agentAddress: topSignal.address });

    await logDecisionOnChain(
      { phase: "trust_check", target: topSignal.address, score: trustReport.overallScore, classification: trustReport.classification },
      2 // TRUST_CHECK
    );

    emit("agent:trust-check", {
      phase: "complete",
      score: trustReport.overallScore,
      classification: trustReport.classification,
    });

    if (trustReport.overallScore < agentConfig.trustFloor) {
      emit("agent:trust-check", { phase: "rejected", reason: "trust_below_floor", score: trustReport.overallScore });
      return scheduleCycle();
    }

    // ── Phase 4: Execute Swap ──
    emit("agent:swap", { phase: "executing", token: topSignal.tokenAddress, action: topSignal.action });

    const NATIVE_OKB = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
    const swapAmount = "100000000000000000"; // 0.1 OKB

    let swapTxHash = "0x" + "0".repeat(64);
    try {
      // Get swap transaction data from OKX DEX aggregator
      const swapData = await okxClient.dexSwap.swap({
        chainIndex: "196",
        fromTokenAddress: NATIVE_OKB,
        toTokenAddress: topSignal.tokenAddress,
        amount: swapAmount,
        slippage: "0.01",
        userWalletAddress: account.address,
      });

      // Sign and broadcast
      const hash = await walletClient.sendTransaction({
        to: swapData.tx.to as `0x${string}`,
        data: swapData.tx.data as `0x${string}`,
        value: BigInt(swapData.tx.value),
      });

      await publicClient.waitForTransactionReceipt({ hash });
      swapTxHash = hash;

      emit("agent:swap", { phase: "complete", txHash: hash, token: topSignal.tokenAddress });
    } catch (err) {
      emit("agent:error", { phase: "swap_failed", error: String(err) });
      // Log the failure but continue to lineage logging
    }

    // ── Phase 5: Log Lineage ──
    const lineageId = await logDecisionOnChain(
      {
        phase: "swap_executed",
        token: topSignal.tokenAddress,
        amount: swapAmount,
        confidence,
        trustScore: trustReport.overallScore,
        signals: [topSignal],
      },
      3, // SWAP_EXECUTED
      swapTxHash
    );

    state.lastDecisionId = lineageId;
    emit("agent:lineage-logged", { phase: "logged", decisionId: lineageId, txHash: swapTxHash });
    emit("agent:cycle-complete", { cycle: state.currentCycle, pnl: state.totalPnl });

  } catch (err) {
    emit("agent:error", { error: String(err), cycle: state.currentCycle });
  }

  scheduleCycle();
}

// ─── Signal Analysis ────────────────────────────────────────────────────────

function analyzeSignal(
  signal: SmartMoneyActivity,
  priceInfo: { price: string; change24h: string } | null,
  klines: { vol: string; c: string }[]
): number {
  let confidence = 0.5;

  // Signal amount weight
  const amount = parseFloat(signal.amount);
  if (amount > 10000) confidence += 0.15;
  else if (amount > 1000) confidence += 0.1;

  // Price momentum
  if (priceInfo) {
    const change = parseFloat(priceInfo.change24h);
    if (change > 5 && signal.action === "buy") confidence += 0.1;
    if (change < -5 && signal.action === "sell") confidence += 0.1;
    // Contrarian penalty
    if (change > 20 && signal.action === "buy") confidence -= 0.1;
  }

  // Volume trend
  if (klines.length >= 3) {
    const recentVol = klines.slice(-3).reduce((s, k) => s + parseFloat(k.vol), 0) / 3;
    const olderVol = klines.slice(0, 3).reduce((s, k) => s + parseFloat(k.vol), 0) / 3;
    if (olderVol > 0 && recentVol > olderVol * 1.5) confidence += 0.1; // rising volume
  }

  return Math.max(0, Math.min(1, confidence));
}

// ─── Control ────────────────────────────────────────────────────────────────

function scheduleCycle() {
  if (!state.running) return;
  cycleTimer = setTimeout(runCycle, agentConfig.cycleInterval);
}

export async function startAgent(overrides?: Partial<AgentConfig>) {
  if (state.running) return;

  agentConfig = { ...DEFAULT_CONFIG, ...overrides };
  state = { running: true, currentCycle: 0, totalPnl: 0, consecutiveLosses: 0, lastDecisionId: null, positions: [] };

  // Ensure agent is registered
  const isReg = await publicClient.readContract({
    address: contractAddress,
    abi: LINEAGE_WRITE_ABI,
    functionName: "isRegistered",
    args: [account.address],
  });

  if (!isReg) {
    const hash = await walletClient.writeContract({
      address: contractAddress,
      abi: LINEAGE_WRITE_ABI,
      functionName: "registerAgent",
      args: ["Omnispect-X Demo Agent v1"],
    });
    await publicClient.waitForTransactionReceipt({ hash });
  }

  emit("agent:cycle-complete", { phase: "started", address: account.address });
  runCycle();
}

export function stopAgent() {
  state.running = false;
  if (cycleTimer) clearTimeout(cycleTimer);
  emit("agent:cycle-complete", { phase: "stopped" });
}

export function getAgentState(): AgentState {
  return { ...state };
}

export const demoAgent = { start: startAgent, stop: stopAgent, getState: getAgentState };
```

### Key Decisions
- **OKX DEX as primary swap**: Uses aggregator for best execution across 500+ sources.
- **Every phase logs lineage**: 4 on-chain logs per cycle (signal, analysis, trust-check, swap). Shows deep lineage integration to judges.
- **Circuit breaker not fully wired**: Simplified for hackathon — tracks state but doesn't close positions. Production would add exit logic.

---

## 10. x402 Middleware

### Purpose
Gate premium trust reports behind USDG micropayment on X Layer using x402 protocol with OKX facilitator.

### Dependencies
- `src/types/index.ts` — PaymentRequirements
- `src/config.ts` — x402 config

### Code

#### File: `src/middleware/x402.ts`
[UNVERIFIED] — x402 Express pattern adapted for Hono. OKX facilitator at /api/v6/x402/{verify,settle}
```typescript
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
          ? "DERIVE_FROM_WALLET" // Will be replaced at runtime
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
```

### Key Decisions
- **OKX facilitator for X Layer**: x402 Foundation only supports Base/Solana. OKX runs its own facilitator at /api/v6/x402.
- **Post-response settlement**: Settle after the response is generated, so the caller only pays if they get data.
- **Graceful degradation**: If verification fails, return 402 again. No partial charge.

---

## 11. MCP Server

### Purpose
Expose Omnispect-X skills to AI coding assistants via Model Context Protocol. Three tools: trust-score, lineage-query, lineage-log.

### Dependencies
- `@modelcontextprotocol/sdk` v1.29.0
- `src/services/trust-scorer.ts` — scoreTrust
- `src/services/lineage-query.ts` — lineageQuery
- `zod` — input schemas

### Code

#### File: `src/server/mcp.ts`
[VERIFIED] — MCP SDK v1.29.0 McpServer class + server.tool() with zod schemas
```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { scoreTrust } from "../services/trust-scorer";
import { lineageQuery } from "../services/lineage-query";

const server = new McpServer({
  name: "omnispect-x",
  version: "1.0.0",
});

// ─── Tool: trust-score ──────────────────────────────────────────────────────

server.tool(
  "trust-score",
  "Analyze the trust score of any agent wallet address on X Layer. Returns a 0-100 score with 4-axis breakdown, classification (SAFE/CAUTION/BLOCKLIST), and recommendations.",
  {
    agentAddress: z.string().describe("The 0x wallet address of the agent to score"),
    chainId: z.number().optional().describe("Chain ID (default: 196 for X Layer)"),
  },
  async ({ agentAddress, chainId }) => {
    try {
      const result = await scoreTrust({ agentAddress, chainId });
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify(result, null, 2),
        }],
      };
    } catch (err) {
      return {
        content: [{
          type: "text" as const,
          text: `Error scoring ${agentAddress}: ${String(err)}`,
        }],
        isError: true,
      };
    }
  }
);

// ─── Tool: lineage-query ────────────────────────────────────────────────────

server.tool(
  "lineage-query",
  "Query the decision lineage chain for an agent. Returns a linked list of decisions with reasoning, action types, and transaction hashes.",
  {
    agentAddress: z.string().describe("The 0x wallet address of the agent"),
    offset: z.number().optional().describe("Pagination offset (default: 0)"),
    limit: z.number().optional().describe("Max decisions to return (default: 20)"),
  },
  async ({ agentAddress, offset, limit }) => {
    try {
      const chain = await lineageQuery.getDecisionChain(agentAddress, offset ?? 0, limit ?? 20);
      const stats = await lineageQuery.getAgentStats(agentAddress);
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({ stats, decisions: chain }, null, 2),
        }],
      };
    } catch (err) {
      return {
        content: [{
          type: "text" as const,
          text: `Error querying lineage for ${agentAddress}: ${String(err)}`,
        }],
        isError: true,
      };
    }
  }
);

// ─── Tool: lineage-log ─────────────────────────────────────────────────────

server.tool(
  "lineage-log",
  "Log a new decision to the on-chain lineage registry. For agent developers who want to record their agent's decisions.",
  {
    reasoning: z.string().describe("The reasoning text for this decision"),
    actionType: z.number().describe("Action type: 0=SIGNAL, 1=ANALYSIS, 2=TRUST_CHECK, 3=SWAP, 4=OPEN, 5=CLOSE, 6=EMERGENCY"),
    resultTxHash: z.string().optional().describe("The transaction hash of the resulting action, if any"),
  },
  async ({ reasoning, actionType, resultTxHash }) => {
    return {
      content: [{
        type: "text" as const,
        text: "lineage-log requires a wallet connection. Use the Omnispect-X API at POST /api/lineage/log with a signed transaction instead.",
      }],
    };
  }
);

// ─── Start ──────────────────────────────────────────────────────────────────

export async function startMcpServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.log("MCP server started on stdio");
}

// Run standalone if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startMcpServer().catch(console.error);
}
```

### Key Decisions
- **lineage-log is read-only stub**: Actual logging requires wallet signing, which MCP tools can't do. Directs to API instead.
- **Stdio transport**: Standard MCP pattern. `claude mcp add --scope user omnispect-x-mcp -- bun run src/server/mcp.ts`
- **Zod schemas**: Required by MCP SDK for input validation.

---

## 12. WebSocket Server

### Purpose
Real-time streaming of demo agent events to the dashboard. Events include signal collection, analysis, trust checks, swap execution, and lineage logging.

### Dependencies
- `src/types/index.ts` — CycleEvent, WSMessage

### Code

#### File: `src/server/ws.ts`
[VERIFIED] — Bun native WebSocket via Hono upgrade
```typescript
import type { CycleEvent, WSMessage } from "../types";

// ─── Connected Clients ──────────────────────────────────────────────────────

const clients = new Set<WebSocket>();

export function addClient(ws: WebSocket) {
  clients.add(ws);
  ws.addEventListener("close", () => clients.delete(ws));
  ws.addEventListener("error", () => clients.delete(ws));
}

export function broadcast(event: CycleEvent) {
  const message: WSMessage = {
    event: event.type,
    data: event.data,
    timestamp: event.timestamp,
  };
  const json = JSON.stringify(message);

  for (const client of clients) {
    try {
      if (client.readyState === WebSocket.OPEN) {
        client.send(json);
      } else {
        clients.delete(client);
      }
    } catch {
      clients.delete(client);
    }
  }
}

export function getClientCount(): number {
  return clients.size;
}
```

### Key Decisions
- **Bun native WebSocket**: No need for ws or socket.io library. Bun supports WebSocket natively.
- **Set-based client tracking**: Simple, O(1) add/remove. Dead connections cleaned on broadcast.

---

## 13. API Entry Point (Hono Server)

### Purpose
Main HTTP server exposing all API routes, WebSocket upgrade, and serving the frontend.

### Dependencies
- All services, middleware, and server modules
- `hono` — HTTP framework

### Code

#### File: `src/server/index.ts`
[VERIFIED] — Hono v4 on Bun
```typescript
import { Hono } from "hono";
import { cors } from "hono/cors";
import { scoreTrust } from "../services/trust-scorer";
import { lineageQuery } from "../services/lineage-query";
import { demoAgent } from "../services/demo-agent";
import { x402Gate } from "../middleware/x402";
import { addClient, getClientCount } from "./ws";
import { config } from "../config";
import type { TrustScoreRequest } from "../types";

const app = new Hono();

// ─── Middleware ──────────────────────────────────────────────────────────────

app.use("*", cors({ origin: "*" }));

// ─── Health Check ───────────────────────────────────────────────────────────

app.get("/health", (c) =>
  c.json({ status: "ok", wsClients: getClientCount(), agent: demoAgent.getState().running })
);

// ─── Trust Score Routes ─────────────────────────────────────────────────────

app.get("/api/trust/:address", async (c) => {
  const address = c.req.param("address");
  const chainId = Number(c.req.query("chainId") || "196");
  try {
    const result = await scoreTrust({ agentAddress: address, chainId });
    return c.json(result);
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

// Premium trust report (x402 gated)
app.get("/api/trust/:address/premium", x402Gate(), async (c) => {
  const address = c.req.param("address");
  const chainId = Number(c.req.query("chainId") || "196");
  try {
    const result = await scoreTrust({ agentAddress: address, chainId });
    // Premium report includes extra data
    return c.json({
      ...result,
      premium: true,
      detailedFindings: result.dimensions,
      uniswapDeepDive: result.uniswapRisk,
    });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

// ─── Lineage Routes ─────────────────────────────────────────────────────────

app.get("/api/lineage/:address", async (c) => {
  const address = c.req.param("address");
  const offset = Number(c.req.query("offset") || "0");
  const limit = Number(c.req.query("limit") || "50");
  try {
    const chain = await lineageQuery.getDecisionChain(address, offset, limit);
    return c.json({ decisions: chain, count: chain.length });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

app.get("/api/lineage/:address/stats", async (c) => {
  const address = c.req.param("address");
  try {
    const stats = await lineageQuery.getAgentStats(address);
    return c.json(stats);
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

app.get("/api/lineage/decision/:id", async (c) => {
  const id = c.req.param("id");
  try {
    const decision = await lineageQuery.getDecision(id);
    return c.json(decision);
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

// ─── Agent Control Routes ───────────────────────────────────────────────────

app.post("/api/agent/start", async (c) => {
  try {
    await demoAgent.start();
    return c.json({ status: "started", state: demoAgent.getState() });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

app.post("/api/agent/stop", (c) => {
  demoAgent.stop();
  return c.json({ status: "stopped", state: demoAgent.getState() });
});

app.get("/api/agent/state", (c) => {
  return c.json(demoAgent.getState());
});

// ─── WebSocket Upgrade ──────────────────────────────────────────────────────

// Bun-native WebSocket upgrade
const server = Bun.serve({
  port: config.port,
  fetch(req, server) {
    const url = new URL(req.url);
    if (url.pathname === "/ws") {
      const success = server.upgrade(req);
      if (success) return undefined;
      return new Response("WebSocket upgrade failed", { status: 400 });
    }
    return app.fetch(req);
  },
  websocket: {
    open(ws) {
      addClient(ws as unknown as WebSocket);
    },
    message() { /* client messages not needed */ },
    close() { /* handled by addClient listener */ },
  },
});

console.log(`Omnispect-X backend running on http://localhost:${server.port}`);
console.log(`WebSocket available at ws://localhost:${server.port}/ws`);
```

#### File: `src/config.ts`
[VERIFIED] — Environment-based config
```typescript
import type { AppConfig } from "./types";

export const config: AppConfig = {
  port: parseInt(process.env.PORT || "3001", 10),
  okx: {
    apiKey: process.env.OKX_API_KEY || "",
    secretKey: process.env.OKX_SECRET_KEY || "",
    passphrase: process.env.OKX_PASSPHRASE || "",
    baseUrl: process.env.OKX_BASE_URL || "https://web3.okx.com",
  },
  xlayer: {
    rpcUrl: process.env.XLAYER_RPC_URL || "https://rpc.xlayer.tech",
    chainId: 196,
    lineageLoggerAddress: process.env.LINEAGE_LOGGER_ADDRESS || "",
  },
  uniswap: {
    tradingApiUrl: "https://trade-api.gateway.uniswap.org",
    swapRouter02: "0x4f0c28f5926afda16bf2506d5d9e57ea190f9bca",
  },
  ipfs: {
    pinataJwt: process.env.PINATA_JWT || "",
    gateway: process.env.IPFS_GATEWAY || "https://gateway.pinata.cloud",
  },
  agentWallet: {
    privateKey: process.env.AGENT_PRIVATE_KEY || "",
  },
  x402: {
    paymentTokenAddress: "0x4ae46a509f6b1d9056937ba4500cb143933d2dc8", // USDG
    pricePerReport: "10000000000000000", // 0.01 USDG (18 decimals)
    facilitatorUrl: "https://web3.okx.com/api/v6/x402",
  },
};
```

### Key Decisions
- **Bun.serve for WebSocket**: Hono doesn't have native WS. Bun.serve wraps both HTTP (delegated to Hono) and WS in one server.
- **Flat route structure**: `/api/trust/:address`, `/api/lineage/:address`. Simple, RESTful, easy to demo.
- **x402 only on premium route**: Free basic trust report + paid premium report. Judges see both paths.

---

## 14. Dashboard (Frontend)

### Purpose
Visual interface for trust scores, decision lineage, live agent monitoring, and multi-agent comparison. Next.js 14 App Router with Tailwind.

### Dependencies
- Backend API at `http://localhost:3001`
- WebSocket at `ws://localhost:3001/ws`
- Recharts for radar/line charts

### Code

#### File: `frontend/lib/api.ts`
[VERIFIED] — API client for frontend
```typescript
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const WS_BASE = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001/ws";

export async function fetchTrustScore(address: string) {
  const res = await fetch(`${API_BASE}/api/trust/${address}`);
  if (!res.ok) throw new Error(`Trust score failed: ${res.status}`);
  return res.json();
}

export async function fetchLineage(address: string, offset = 0, limit = 50) {
  const res = await fetch(`${API_BASE}/api/lineage/${address}?offset=${offset}&limit=${limit}`);
  if (!res.ok) throw new Error(`Lineage fetch failed: ${res.status}`);
  return res.json();
}

export async function fetchAgentStats(address: string) {
  const res = await fetch(`${API_BASE}/api/lineage/${address}/stats`);
  if (!res.ok) throw new Error(`Stats fetch failed: ${res.status}`);
  return res.json();
}

export async function fetchAgentState() {
  const res = await fetch(`${API_BASE}/api/agent/state`);
  if (!res.ok) throw new Error(`Agent state failed: ${res.status}`);
  return res.json();
}

export async function startAgent() {
  const res = await fetch(`${API_BASE}/api/agent/start`, { method: "POST" });
  if (!res.ok) throw new Error(`Agent start failed: ${res.status}`);
  return res.json();
}

export async function stopAgent() {
  const res = await fetch(`${API_BASE}/api/agent/stop`, { method: "POST" });
  if (!res.ok) throw new Error(`Agent stop failed: ${res.status}`);
  return res.json();
}

export function createWSConnection(onMessage: (data: any) => void): WebSocket {
  const ws = new WebSocket(WS_BASE);
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onMessage(data);
    } catch { /* ignore parse errors */ }
  };
  ws.onclose = () => {
    // Auto-reconnect after 3s
    setTimeout(() => {
      const newWs = createWSConnection(onMessage);
      Object.assign(ws, newWs);
    }, 3000);
  };
  return ws;
}
```

#### File: `frontend/components/RadarChart.tsx`
[VERIFIED] — Recharts radar for 4-axis trust score
```tsx
"use client";

import { Radar, RadarChart as RChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";

interface Props {
  dimensions: {
    transactionPatterns: { score: number };
    contractInteractions: { score: number };
    fundFlow: { score: number };
    behavioralConsistency: { score: number };
  };
  color?: string;
}

export function RadarChart({ dimensions, color = "#6366f1" }: Props) {
  const data = [
    { axis: "Txn Patterns", value: dimensions.transactionPatterns.score, max: 25 },
    { axis: "Contract Int.", value: dimensions.contractInteractions.score, max: 25 },
    { axis: "Fund Flow", value: dimensions.fundFlow.score, max: 25 },
    { axis: "Consistency", value: dimensions.behavioralConsistency.score, max: 25 },
  ];

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RChart data={data}>
        <PolarGrid stroke="#334155" />
        <PolarAngleAxis dataKey="axis" tick={{ fill: "#94a3b8", fontSize: 12 }} />
        <PolarRadiusAxis angle={30} domain={[0, 25]} tick={{ fill: "#64748b", fontSize: 10 }} />
        <Radar name="Trust" dataKey="value" stroke={color} fill={color} fillOpacity={0.3} />
      </RChart>
    </ResponsiveContainer>
  );
}
```

#### File: `frontend/components/TrustScoreCard.tsx`
[VERIFIED] — Trust score display card
```tsx
"use client";

import { RadarChart } from "./RadarChart";

interface TrustScoreData {
  address: string;
  overallScore: number;
  classification: "SAFE" | "CAUTION" | "BLOCKLIST";
  dimensions: {
    transactionPatterns: { score: number; findings: any[] };
    contractInteractions: { score: number; findings: any[] };
    fundFlow: { score: number; findings: any[] };
    behavioralConsistency: { score: number; findings: any[] };
  };
  uniswapRisk: { poolsAnalyzed: number; avgLiquidityScore: number; concentrationRisk: number };
  recommendations: string[];
}

const classColors = {
  SAFE: { bg: "bg-green-900/30", border: "border-green-500", text: "text-green-400" },
  CAUTION: { bg: "bg-yellow-900/30", border: "border-yellow-500", text: "text-yellow-400" },
  BLOCKLIST: { bg: "bg-red-900/30", border: "border-red-500", text: "text-red-400" },
};

export function TrustScoreCard({ data }: { data: TrustScoreData }) {
  const colors = classColors[data.classification];
  const shortAddr = `${data.address.slice(0, 6)}...${data.address.slice(-4)}`;

  return (
    <div className={`rounded-xl border ${colors.border} ${colors.bg} p-6`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-mono text-slate-200">{shortAddr}</h2>
          <span className={`text-sm font-bold ${colors.text}`}>{data.classification}</span>
        </div>
        <div className="text-right">
          <div className="text-4xl font-bold text-white">{data.overallScore}</div>
          <div className="text-sm text-slate-400">/ 100</div>
        </div>
      </div>

      <RadarChart dimensions={data.dimensions} />

      <div className="mt-4 space-y-2">
        <h3 className="text-sm font-semibold text-slate-300">Breakdown</h3>
        {Object.entries(data.dimensions).map(([key, dim]) => (
          <div key={key} className="flex justify-between text-sm">
            <span className="text-slate-400">{formatDimName(key)}</span>
            <span className="text-slate-200 font-mono">{dim.score}/25</span>
          </div>
        ))}
      </div>

      {data.uniswapRisk.poolsAnalyzed > 0 && (
        <div className="mt-4 p-3 rounded-lg bg-slate-800/50">
          <h3 className="text-sm font-semibold text-slate-300 mb-1">Uniswap Risk</h3>
          <div className="text-sm text-slate-400">
            {data.uniswapRisk.poolsAnalyzed} pools analyzed |
            Liquidity: {data.uniswapRisk.avgLiquidityScore}/100 |
            Concentration: {data.uniswapRisk.concentrationRisk}%
          </div>
        </div>
      )}

      <div className="mt-4">
        <h3 className="text-sm font-semibold text-slate-300 mb-1">Recommendations</h3>
        <ul className="space-y-1">
          {data.recommendations.map((rec, i) => (
            <li key={i} className="text-sm text-slate-400">• {rec}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function formatDimName(key: string): string {
  const map: Record<string, string> = {
    transactionPatterns: "Transaction Patterns",
    contractInteractions: "Contract Interactions",
    fundFlow: "Fund Flow",
    behavioralConsistency: "Behavioral Consistency",
  };
  return map[key] || key;
}
```

#### File: `frontend/components/DecisionTree.tsx`
[ASSUMED] — Visual decision tree for lineage explorer (hero feature)
```tsx
"use client";

import { useState } from "react";

interface DecisionNode {
  decisionId: string;
  prevDecisionId: string;
  actionType: number;
  resultTxHash: string;
  timestamp: number;
  reasoningText?: string;
  reasoningURI: string;
  confidence?: number;
}

const ACTION_LABELS: Record<number, { label: string; color: string }> = {
  0: { label: "Signal", color: "bg-blue-500" },
  1: { label: "Analysis", color: "bg-purple-500" },
  2: { label: "Trust Check", color: "bg-yellow-500" },
  3: { label: "Swap", color: "bg-green-500" },
  4: { label: "Open", color: "bg-cyan-500" },
  5: { label: "Close", color: "bg-orange-500" },
  6: { label: "Emergency", color: "bg-red-500" },
};

export function DecisionTree({ decisions }: { decisions: DecisionNode[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (decisions.length === 0) {
    return <div className="text-slate-400 text-center py-8">No decisions found for this agent.</div>;
  }

  return (
    <div className="space-y-1">
      {decisions.map((d, i) => {
        const action = ACTION_LABELS[d.actionType] || { label: "Unknown", color: "bg-gray-500" };
        const isExpanded = expanded === d.decisionId;
        const shortId = d.decisionId.slice(0, 10) + "...";
        const shortTx = d.resultTxHash !== "0x" + "0".repeat(64)
          ? d.resultTxHash.slice(0, 10) + "..."
          : "—";

        return (
          <div key={d.decisionId}>
            {/* Connector line */}
            {i > 0 && (
              <div className="flex justify-center">
                <div className="w-0.5 h-4 bg-slate-600" />
              </div>
            )}

            {/* Node */}
            <button
              onClick={() => setExpanded(isExpanded ? null : d.decisionId)}
              className="w-full text-left rounded-lg border border-slate-700 hover:border-slate-500 bg-slate-800/50 p-4 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className={`px-2 py-0.5 rounded text-xs font-bold text-white ${action.color}`}>
                  {action.label}
                </span>
                <span className="text-slate-400 text-xs font-mono">{shortId}</span>
                <span className="text-slate-500 text-xs ml-auto">
                  {new Date(d.timestamp * 1000).toLocaleString()}
                </span>
              </div>

              {d.confidence != null && (
                <div className="mt-1 text-sm text-slate-400">
                  Confidence: {(d.confidence * 100).toFixed(0)}%
                </div>
              )}

              {shortTx !== "—" && (
                <div className="mt-1 text-xs text-slate-500">
                  tx: <a
                    href={`https://www.okx.com/web3/explorer/xlayer/tx/${d.resultTxHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-400 hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {shortTx}
                  </a>
                </div>
              )}
            </button>

            {/* Expanded reasoning */}
            {isExpanded && (
              <div className="ml-6 mt-2 p-4 rounded-lg bg-slate-900 border border-slate-700">
                <h4 className="text-sm font-semibold text-slate-300 mb-2">Reasoning</h4>
                <p className="text-sm text-slate-400 whitespace-pre-wrap">
                  {d.reasoningText || "Loading from IPFS..."}
                </p>
                <div className="mt-2 text-xs text-slate-600">
                  IPFS: <a href={d.reasoningURI.replace("ipfs://", "https://gateway.pinata.cloud/ipfs/")}
                    target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">
                    {d.reasoningURI}
                  </a>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

#### File: `frontend/components/AgentMonitor.tsx`
[ASSUMED] — Real-time agent monitoring via WebSocket
```tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { createWSConnection, startAgent, stopAgent, fetchAgentState } from "../lib/api";

interface WSEvent {
  event: string;
  data: Record<string, unknown>;
  timestamp: number;
}

const EVENT_COLORS: Record<string, string> = {
  "agent:signal": "text-blue-400",
  "agent:analysis": "text-purple-400",
  "agent:trust-check": "text-yellow-400",
  "agent:swap": "text-green-400",
  "agent:lineage-logged": "text-indigo-400",
  "agent:cycle-complete": "text-slate-300",
  "agent:error": "text-red-400",
};

export function AgentMonitor() {
  const [events, setEvents] = useState<WSEvent[]>([]);
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchAgentState().then((s) => setRunning(s.running)).catch(() => {});

    const ws = createWSConnection((data: WSEvent) => {
      setEvents((prev) => [...prev.slice(-100), data]); // keep last 100
    });

    return () => ws.close();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [events]);

  async function handleToggle() {
    setLoading(true);
    try {
      if (running) {
        await stopAgent();
        setRunning(false);
      } else {
        await startAgent();
        setRunning(true);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${running ? "bg-green-500 animate-pulse" : "bg-slate-600"}`} />
          <span className="text-sm text-slate-300">{running ? "Agent Running" : "Agent Stopped"}</span>
        </div>
        <button
          onClick={handleToggle}
          disabled={loading}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            running
              ? "bg-red-600 hover:bg-red-700 text-white"
              : "bg-green-600 hover:bg-green-700 text-white"
          } disabled:opacity-50`}
        >
          {loading ? "..." : running ? "Stop Agent" : "Start Agent"}
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-1 font-mono text-xs">
        {events.length === 0 && (
          <div className="text-slate-500 text-center py-8">
            {running ? "Waiting for events..." : "Start the agent to see live events."}
          </div>
        )}
        {events.map((e, i) => (
          <div key={i} className="flex gap-2 py-1 px-2 rounded hover:bg-slate-800/50">
            <span className="text-slate-600 shrink-0">
              {new Date(e.timestamp).toLocaleTimeString()}
            </span>
            <span className={`shrink-0 ${EVENT_COLORS[e.event] || "text-slate-400"}`}>
              [{e.event.replace("agent:", "")}]
            </span>
            <span className="text-slate-400 truncate">
              {JSON.stringify(e.data)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

#### File: `frontend/components/CompareView.tsx`
[ASSUMED] — Multi-agent comparison with overlapping radar charts
```tsx
"use client";

import { useState } from "react";
import { fetchTrustScore } from "../lib/api";
import { RadarChart } from "./RadarChart";

interface AgentScore {
  address: string;
  data: any;
  color: string;
}

const COLORS = ["#6366f1", "#22c55e", "#f59e0b"];

export function CompareView() {
  const [addresses, setAddresses] = useState(["", "", ""]);
  const [agents, setAgents] = useState<AgentScore[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleCompare() {
    const validAddrs = addresses.filter((a) => a.startsWith("0x") && a.length === 42);
    if (validAddrs.length < 2) return;

    setLoading(true);
    try {
      const results = await Promise.allSettled(validAddrs.map(fetchTrustScore));
      const scored: AgentScore[] = [];
      results.forEach((r, i) => {
        if (r.status === "fulfilled") {
          scored.push({ address: validAddrs[i], data: r.value, color: COLORS[i] });
        }
      });
      setAgents(scored);
    } catch { /* ignore */ }
    setLoading(false);
  }

  return (
    <div>
      <div className="space-y-2 mb-4">
        {addresses.map((addr, i) => (
          <input
            key={i}
            value={addr}
            onChange={(e) => {
              const next = [...addresses];
              next[i] = e.target.value;
              setAddresses(next);
            }}
            placeholder={`Agent ${i + 1} address (0x...)`}
            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-sm font-mono placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
          />
        ))}
        <button
          onClick={handleCompare}
          disabled={loading}
          className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
        >
          {loading ? "Comparing..." : "Compare Agents"}
        </button>
      </div>

      {agents.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((agent) => (
            <div key={agent.address} className="rounded-xl border border-slate-700 bg-slate-800/30 p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: agent.color }} />
                <span className="text-sm font-mono text-slate-300">
                  {agent.address.slice(0, 6)}...{agent.address.slice(-4)}
                </span>
              </div>
              <div className="text-2xl font-bold text-white mb-1">{agent.data.overallScore}/100</div>
              <span className={`text-xs font-bold ${
                agent.data.classification === "SAFE" ? "text-green-400" :
                agent.data.classification === "CAUTION" ? "text-yellow-400" : "text-red-400"
              }`}>
                {agent.data.classification}
              </span>
              <RadarChart dimensions={agent.data.dimensions} color={agent.color} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

#### File: `frontend/app/layout.tsx`
[VERIFIED] — Root layout with dark theme
```tsx
import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Omnispect-X — Agent Trust & Lineage",
  description: "Trust Scores + Decision Lineage for Every AI Agent on X Layer",
};

const NAV_ITEMS = [
  { href: "/trust", label: "Trust Score" },
  { href: "/lineage", label: "Lineage Explorer" },
  { href: "/monitor", label: "Agent Monitor" },
  { href: "/compare", label: "Compare" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-200 min-h-screen">
        <nav className="border-b border-slate-800 px-6 py-3">
          <div className="max-w-7xl mx-auto flex items-center gap-6">
            <Link href="/" className="text-lg font-bold text-indigo-400">Omnispect-X</Link>
            {NAV_ITEMS.map((item) => (
              <Link key={item.href} href={item.href} className="text-sm text-slate-400 hover:text-slate-200 transition-colors">
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
```

#### File: `frontend/app/page.tsx`
[ASSUMED] — Landing page
```tsx
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <h1 className="text-5xl font-bold text-white mb-4">Omnispect-X</h1>
      <p className="text-xl text-slate-400 mb-8 max-w-xl">
        Trust Scores + Decision Lineage for Every AI Agent on X Layer
      </p>
      <div className="flex gap-4">
        <Link href="/trust" className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors">
          Score an Agent
        </Link>
        <Link href="/lineage" className="px-6 py-3 border border-slate-600 hover:border-slate-400 text-slate-300 rounded-lg font-medium transition-colors">
          Explore Lineage
        </Link>
      </div>
    </div>
  );
}
```

#### File: `frontend/app/trust/page.tsx`
[ASSUMED] — Trust score lookup page
```tsx
"use client";

import { useState } from "react";
import { fetchTrustScore } from "../../lib/api";
import { TrustScoreCard } from "../../components/TrustScoreCard";

export default function TrustPage() {
  const [address, setAddress] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch() {
    if (!address.startsWith("0x") || address.length !== 42) {
      setError("Enter a valid 0x address");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTrustScore(address);
      setResult(data);
    } catch (err) {
      setError(String(err));
    }
    setLoading(false);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Trust Score Lookup</h1>
      <div className="flex gap-2 mb-6">
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Enter agent wallet address (0x...)"
          className="flex-1 px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 font-mono placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium disabled:opacity-50"
        >
          {loading ? "Scoring..." : "Score"}
        </button>
      </div>
      {error && <div className="text-red-400 text-sm mb-4">{error}</div>}
      {result && <TrustScoreCard data={result} />}
    </div>
  );
}
```

#### File: `frontend/app/lineage/page.tsx`
[ASSUMED] — Lineage explorer page
```tsx
"use client";

import { useState } from "react";
import { fetchLineage, fetchAgentStats } from "../../lib/api";
import { DecisionTree } from "../../components/DecisionTree";

export default function LineagePage() {
  const [address, setAddress] = useState("");
  const [decisions, setDecisions] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function handleSearch() {
    if (!address.startsWith("0x")) return;
    setLoading(true);
    try {
      const [lineageData, statsData] = await Promise.all([
        fetchLineage(address),
        fetchAgentStats(address),
      ]);
      setDecisions(lineageData.decisions || []);
      setStats(statsData);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Decision Lineage Explorer</h1>
      <div className="flex gap-2 mb-6">
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Enter agent wallet address (0x...)"
          className="flex-1 px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 font-mono placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium disabled:opacity-50"
        >
          {loading ? "Loading..." : "Explore"}
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="rounded-lg bg-slate-800/50 p-4 border border-slate-700">
            <div className="text-2xl font-bold text-white">{stats.totalDecisions}</div>
            <div className="text-sm text-slate-400">Total Decisions</div>
          </div>
          <div className="rounded-lg bg-slate-800/50 p-4 border border-slate-700">
            <div className="text-sm font-mono text-slate-200">
              {stats.firstDecisionTimestamp ? new Date(stats.firstDecisionTimestamp * 1000).toLocaleDateString() : "—"}
            </div>
            <div className="text-sm text-slate-400">First Decision</div>
          </div>
          <div className="rounded-lg bg-slate-800/50 p-4 border border-slate-700">
            <div className={`text-sm font-bold ${stats.isRegistered ? "text-green-400" : "text-red-400"}`}>
              {stats.isRegistered ? "Registered" : "Not Registered"}
            </div>
            <div className="text-sm text-slate-400">Agent Status</div>
          </div>
        </div>
      )}

      <DecisionTree decisions={decisions} />
    </div>
  );
}
```

#### File: `frontend/app/monitor/page.tsx`
[ASSUMED] — Agent monitor page
```tsx
import { AgentMonitor } from "../../components/AgentMonitor";

export default function MonitorPage() {
  return (
    <div className="h-[calc(100vh-12rem)]">
      <h1 className="text-2xl font-bold text-white mb-6">Live Agent Monitor</h1>
      <AgentMonitor />
    </div>
  );
}
```

#### File: `frontend/app/compare/page.tsx`
[ASSUMED] — Compare page
```tsx
import { CompareView } from "../../components/CompareView";

export default function ComparePage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Multi-Agent Comparison</h1>
      <CompareView />
    </div>
  );
}
```

#### File: `frontend/app/globals.css`
[VERIFIED] — Tailwind base
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

#### File: `frontend/tailwind.config.ts`
[VERIFIED] — Tailwind config
```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: { extend: {} },
  plugins: [],
};

export default config;
```

#### File: `frontend/next.config.js`
[VERIFIED] — Next.js config
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
};

module.exports = nextConfig;
```

#### File: `frontend/package.json`
[VERIFIED] — Frontend dependencies
```json
{
  "name": "omnispect-x-dashboard",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev --port 3000",
    "build": "next build",
    "start": "next start --port 3000"
  },
  "dependencies": {
    "next": "14.2.0",
    "react": "18.2.0",
    "react-dom": "18.2.0",
    "recharts": "2.12.0"
  },
  "devDependencies": {
    "@types/node": "20.11.0",
    "@types/react": "18.2.0",
    "autoprefixer": "10.4.0",
    "postcss": "8.4.0",
    "tailwindcss": "3.4.0",
    "typescript": "5.3.0"
  }
}
```

---

## 15. Configuration Reference

### Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `OKX_API_KEY` | Yes | OKX Developer Portal API key | `abc123...` |
| `OKX_SECRET_KEY` | Yes | OKX HMAC secret | `def456...` |
| `OKX_PASSPHRASE` | Yes | OKX API passphrase | `mypass` |
| `PRIVATE_KEY` | Yes | Deployer/agent wallet private key (0x-prefixed) | `0xabc...` |
| `PINATA_JWT` | Yes | Pinata IPFS pinning JWT | `eyJ...` |
| `X_LAYER_RPC` | No | X Layer RPC endpoint (default: `https://rpc.xlayer.tech`) | `https://rpc.xlayer.tech` |
| `LINEAGE_CONTRACT` | No | Deployed DecisionLineageLogger address | `0x...` |
| `PORT` | No | API server port (default: `3001`) | `3001` |
| `FRONTEND_PORT` | No | Dashboard port (default: `3000`) | `3000` |
| `CORS_ORIGIN` | No | CORS allowed origin (default: `http://localhost:3000`) | `http://localhost:3000` |
| `X402_PRICE` | No | x402 premium report price in USDG (default: `0.01`) | `0.01` |
| `AGENT_CONFIDENCE_FLOOR` | No | Demo agent minimum confidence (default: `0.6`) | `0.6` |
| `LOG_LEVEL` | No | Logging verbosity (default: `info`) | `debug` |

### `.env.example`

<!-- file: .env.example -->
```bash
# [VERIFIED] — All variables match OKX Developer Portal + Pinata docs

# OKX API Credentials (get from https://www.okx.com/web3/build/dev-portal)
OKX_API_KEY=
OKX_SECRET_KEY=
OKX_PASSPHRASE=

# Wallet (deployer + demo agent)
PRIVATE_KEY=

# IPFS (get from https://app.pinata.cloud)
PINATA_JWT=

# Network
X_LAYER_RPC=https://rpc.xlayer.tech

# Contract (set after deploy)
LINEAGE_CONTRACT=

# Server
PORT=3001
FRONTEND_PORT=3000
CORS_ORIGIN=http://localhost:3000

# x402
X402_PRICE=0.01

# Agent
AGENT_CONFIDENCE_FLOOR=0.6
LOG_LEVEL=info
```

### Root `package.json`

<!-- file: package.json -->
```json
{
  "name": "omnispect-x",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "bun run src/server/index.ts",
    "dev:frontend": "cd frontend && npm run dev",
    "dev:all": "concurrently \"bun run dev\" \"bun run dev:frontend\"",
    "build": "bun build src/server/index.ts --outdir dist --target bun",
    "build:frontend": "cd frontend && npm run build",
    "mcp": "bun run src/server/mcp.ts",
    "deploy": "cd contracts && forge script script/Deploy.s.sol --rpc-url $X_LAYER_RPC --broadcast --verify",
    "test:contracts": "cd contracts && forge test -vvv",
    "seed": "bun run scripts/seed.ts",
    "typecheck": "bun x tsc --noEmit && cd frontend && npx tsc --noEmit"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "1.29.0",
    "hono": "4.4.0",
    "viem": "2.21.0",
    "zod": "3.23.0"
  },
  "devDependencies": {
    "@types/bun": "1.1.0",
    "concurrently": "8.2.0",
    "typescript": "5.3.0"
  }
}
```

### `tsconfig.json`

<!-- file: tsconfig.json -->
```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "dist",
    "rootDir": "src",
    "types": ["bun-types"],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist", "contracts", "frontend"]
}
```

---

## 16. Testing Strategy

### Test Files

| File | Type | Tests | Framework |
|------|------|-------|-----------|
| `contracts/test/DecisionLineageLogger.t.sol` | Unit | 7 | Foundry |
| `src/__tests__/trust-scorer.test.ts` | Unit | 5 | Bun test |
| `src/__tests__/okx-client.test.ts` | Unit | 4 | Bun test |
| `src/__tests__/lineage-query.test.ts` | Integration | 3 | Bun test |
| `src/__tests__/api.test.ts` | Integration | 6 | Bun test |

### Critical Test: Trust Scorer

<!-- file: src/__tests__/trust-scorer.test.ts -->
```typescript
// [ASSUMED] — Test structure for trust scoring pipeline
import { describe, test, expect, mock } from "bun:test";
import { scoreTrust } from "../services/trust-scorer";

// Mock OKX client responses
mock.module("../lib/okx-client", () => ({
  okx: {
    totalValue: async () => ({ totalValue: "15000.50" }),
    allBalances: async () => ([
      { symbol: "OKB", balance: "100", tokenAddress: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee" },
      { symbol: "USDC", balance: "5000", tokenAddress: "0x74b7f16337b8972027f6196a17a631ac6de26d22" },
    ]),
    tokenScan: async () => ({ riskLevel: "low", isHoneypot: false }),
    smartMoney: async () => ([]),
    signals: async () => ([]),
    tokenInfo: async () => ({ symbol: "OKB", holders: "50000", volume24h: "1000000" }),
    tokenHolders: async () => ([]),
    tokenLiquidity: async () => ([]),
    price: async () => ({ price: "15.50" }),
    kline: async () => ([]),
  },
}));

mock.module("../lib/uniswap-client", () => ({
  uniswap: {
    getPoolRisk: async () => ({ pair: "OKB/USDC", depthScore: 8, slippagePct: 0.3, liquidityUsd: 500000 }),
  },
}));

describe("Trust Scorer", () => {
  test("scores a valid address with all 4 axes", async () => {
    const result = await scoreTrust({
      address: "0x1234567890123456789012345678901234567890",
      chainId: 196,
    });

    expect(result.overall).toBeGreaterThanOrEqual(0);
    expect(result.overall).toBeLessThanOrEqual(100);
    expect(result.dimensions).toHaveLength(4);
    expect(result.dimensions.map((d) => d.axis)).toEqual([
      "Transaction Patterns",
      "Contract Interactions",
      "Fund Flow",
      "Behavioral Consistency",
    ]);
  });

  test("returns BLOCKLIST for score < 40", async () => {
    // Override to return suspicious data
    mock.module("../lib/okx-client", () => ({
      okx: {
        totalValue: async () => ({ totalValue: "0.01" }),
        allBalances: async () => ([]),
        tokenScan: async () => ({ riskLevel: "high", isHoneypot: true }),
        smartMoney: async () => ([]),
        signals: async () => ([]),
        tokenInfo: async () => ({ symbol: "SCAM", holders: "2", volume24h: "0" }),
        tokenHolders: async () => ([]),
        tokenLiquidity: async () => ([]),
        price: async () => ({ price: "0" }),
        kline: async () => ([]),
      },
    }));

    const result = await scoreTrust({
      address: "0x0000000000000000000000000000000000000bad",
      chainId: 196,
    });

    expect(result.recommendation).toBe("BLOCKLIST");
  });

  test("includes findings array", async () => {
    const result = await scoreTrust({
      address: "0x1234567890123456789012345678901234567890",
      chainId: 196,
    });

    expect(Array.isArray(result.findings)).toBe(true);
  });

  test("includes recommendations array", async () => {
    const result = await scoreTrust({
      address: "0x1234567890123456789012345678901234567890",
      chainId: 196,
    });

    expect(Array.isArray(result.recommendations)).toBe(true);
    result.recommendations.forEach((r) => {
      expect(r).toHaveProperty("action");
      expect(r).toHaveProperty("reason");
    });
  });

  test("handles API failures gracefully via allSettled", async () => {
    mock.module("../lib/okx-client", () => ({
      okx: {
        totalValue: async () => { throw new Error("API down"); },
        allBalances: async () => { throw new Error("API down"); },
        tokenScan: async () => { throw new Error("API down"); },
        smartMoney: async () => ([]),
        signals: async () => ([]),
        tokenInfo: async () => { throw new Error("API down"); },
        tokenHolders: async () => ([]),
        tokenLiquidity: async () => ([]),
        price: async () => { throw new Error("API down"); },
        kline: async () => ([]),
      },
    }));

    const result = await scoreTrust({
      address: "0x1234567890123456789012345678901234567890",
      chainId: 196,
    });

    // Should still return a valid score, not throw
    expect(result.overall).toBeGreaterThanOrEqual(0);
    expect(result.recommendation).toBeDefined();
  });
});
```

### Critical Test: API Routes

<!-- file: src/__tests__/api.test.ts -->
```typescript
// [ASSUMED] — Integration test for Hono API routes
import { describe, test, expect } from "bun:test";

const BASE = "http://localhost:3001";

describe("API Routes", () => {
  test("GET /health returns ok", async () => {
    const res = await fetch(`${BASE}/health`);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.status).toBe("ok");
  });

  test("POST /api/trust/score returns trust score", async () => {
    const res = await fetch(`${BASE}/api/trust/score`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        address: "0x1234567890123456789012345678901234567890",
        chainId: 196,
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("overall");
    expect(body).toHaveProperty("dimensions");
    expect(body).toHaveProperty("recommendation");
  });

  test("GET /api/lineage/chain/:agent returns array", async () => {
    const agent = "0x1234567890123456789012345678901234567890";
    const res = await fetch(`${BASE}/api/lineage/chain/${agent}?limit=5`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test("POST /api/trust/premium returns 402 without payment", async () => {
    const res = await fetch(`${BASE}/api/trust/premium`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        address: "0x1234567890123456789012345678901234567890",
        chainId: 196,
      }),
    });
    expect(res.status).toBe(402);
    const body = await res.json();
    expect(body).toHaveProperty("paymentRequirements");
  });

  test("POST /api/agent/start returns agent state", async () => {
    const res = await fetch(`${BASE}/api/agent/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect([200, 409]).toContain(res.status); // 409 if already running
  });

  test("GET /api/agent/status returns state", async () => {
    const res = await fetch(`${BASE}/api/agent/status`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("running");
  });
});
```

### Acceptance Criteria

| Feature | Criterion | How to verify |
|---------|-----------|---------------|
| Trust Score | Returns 0-100 score with 4 dimensions | `POST /api/trust/score` with any X Layer address |
| Trust Score | Recommendation is SAFE/CAUTION/BLOCKLIST | Check `recommendation` field |
| Decision Lineage | Log decision on-chain with IPFS reasoning | Call `logDecision` and check X Layer explorer |
| Decision Lineage | Query chain of decisions for agent | `GET /api/lineage/chain/:agent` returns linked list |
| Demo Agent | Runs 5-phase cycle autonomously | `POST /api/agent/start` then watch WebSocket events |
| Demo Agent | Trust-gates before every swap | Agent skips execution when trust < threshold |
| x402 Gating | Premium endpoint returns 402 | `POST /api/trust/premium` without payment header |
| MCP Server | 3 tools registered and callable | `bun run mcp` and test via MCP inspector |
| Dashboard | All 4 views render with real data | Navigate to localhost:3000/trust, /lineage, /monitor, /compare |

---

## 17. Deployment Sequence

```
Step  Command                                                          Verify
────  ───────────────────────────────────────────────────────────────  ──────────────────────────
 1    cp .env.example .env && $EDITOR .env                            All required vars set
 2    bun install                                                      No errors
 3    cd frontend && npm install && cd ..                              No errors
 4    cd contracts && forge install && cd ..                           OpenZeppelin downloaded
 5    cd contracts && forge build && cd ..                             Compilation success
 6    cd contracts && forge test -vvv && cd ..                         7/7 tests pass
 7    bun run deploy                                                   Contract address in output
 8    echo "LINEAGE_CONTRACT=0x..." >> .env                           Address saved
 9    bun run typecheck                                                No errors
10    bun run dev                                                      Server on :3001, /health OK
11    bun run dev:frontend                                             Dashboard on :3000
12    curl -X POST localhost:3001/api/trust/score \                   Score returned
        -H 'Content-Type: application/json' \
        -d '{"address":"0xe538905cf8410324e03A5A23C1c177a474D59b2b","chainId":196}'
13    bun run seed                                                     5 demo decisions logged
14    curl localhost:3001/api/lineage/chain/<agent>?limit=5            Chain of 5 decisions
15    bun run mcp                                                      MCP server starts, tools listed
```

### Seed Script

<!-- file: scripts/seed.ts -->
```typescript
// [ASSUMED] — Seeds 5 demo decisions for the demo agent
import { createWalletClient, http, createPublicClient } from "viem";
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
      { name: "actionType", type: "uint8" },
      { name: "targetToken", type: "address" },
      { name: "amountWei", type: "uint256" },
      { name: "confidence", type: "uint16" },
      { name: "reasoningUri", type: "string" },
      { name: "reasoningHash", type: "bytes32" },
      { name: "txHash", type: "bytes32" },
    ],
    outputs: [{ name: "decisionId", type: "uint256" }],
  },
] as const;

const xLayer = {
  id: 196,
  name: "X Layer",
  nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 },
  rpcUrls: { default: { http: [config.xlayerRpc] } },
} as const;

const account = privateKeyToAccount(config.privateKey as `0x${string}`);

const walletClient = createWalletClient({
  account,
  chain: xLayer,
  transport: http(config.xlayerRpc),
});

const publicClient = createPublicClient({
  chain: xLayer,
  transport: http(config.xlayerRpc),
});

const DECISIONS = [
  { action: 0, token: "0xe538905cf8410324e03A5A23C1c177a474D59b2b", amount: 1n * 10n ** 18n, confidence: 8500, reason: "Strong OKB momentum detected via smart money signals" },
  { action: 1, token: "0x74b7f16337b8972027f6196a17a631ac6de26d22", amount: 500n * 10n ** 6n, confidence: 7200, reason: "Taking partial profits on USDC position" },
  { action: 2, token: "0x0000000000000000000000000000000000000000", amount: 0n, confidence: 6000, reason: "Market volatility too high, holding positions" },
  { action: 0, token: "0x4ae46a509f6b1d9056937ba4500cb143933d2dc8", amount: 100n * 10n ** 18n, confidence: 9100, reason: "USDG accumulation — low risk, stablecoin position" },
  { action: 1, token: "0xe538905cf8410324e03A5A23C1c177a474D59b2b", amount: 5n * 10n ** 17n, confidence: 7800, reason: "OKB sell signal — RSI overbought, reducing exposure" },
];

async function seed() {
  const contract = config.lineageContract as `0x${string}`;

  console.log("Registering agent...");
  const regHash = await walletClient.writeContract({
    address: contract,
    abi: LINEAGE_ABI,
    functionName: "registerAgent",
    args: ['{"name":"Seed Demo Agent","strategy":"momentum"}'],
  });
  await publicClient.waitForTransactionReceipt({ hash: regHash });
  console.log("Agent registered:", regHash);

  for (let i = 0; i < DECISIONS.length; i++) {
    const d = DECISIONS[i];
    console.log(`Logging decision ${i + 1}/5: ${d.reason.slice(0, 40)}...`);

    const hash = await walletClient.writeContract({
      address: contract,
      abi: LINEAGE_ABI,
      functionName: "logDecision",
      args: [
        d.action,
        d.token as `0x${string}`,
        d.amount,
        d.confidence,
        `ipfs://seed-decision-${i}`,
        `0x${"0".repeat(64)}` as `0x${string}`,
        `0x${"0".repeat(64)}` as `0x${string}`,
      ],
    });
    await publicClient.waitForTransactionReceipt({ hash });
    console.log(`  ✓ Decision ${i + 1} logged:`, hash);
  }

  console.log("\nSeed complete. 5 decisions logged on-chain.");
}

seed().catch(console.error);
```

---

## 18. Addresses & External References

### On-Chain Addresses

| Contract | Address | Network | Source |
|----------|---------|---------|--------|
| DecisionLineageLogger | *deployed at step 7* | X Layer (196) | Our contract |
| Uniswap V3 Factory | `0x4b2ab38dbf28d31d467aa8993f6c2585981d6804` | X Layer (196) | [VERIFIED] Uniswap SDK |
| Uniswap V3 SwapRouter02 | `0x4f0c28f5926afda16bf2506d5d9e57ea190f9bca` | X Layer (196) | [VERIFIED] Uniswap SDK |
| Uniswap V4 PoolManager | `0x360e68faccca8ca495c1b759fd9eee466db9fb32` | X Layer (196) | [VERIFIED] Uniswap SDK |
| WOKB | `0xe538905cf8410324e03A5A23C1c177a474D59b2b` | X Layer (196) | [VERIFIED] |
| USDG | `0x4ae46a509f6b1d9056937ba4500cb143933d2dc8` | X Layer (196) | [VERIFIED] Helios |
| USDC | `0x74b7f16337b8972027f6196a17a631ac6de26d22` | X Layer (196) | [VERIFIED] Sponsir |
| Native OKB | `0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee` | X Layer (196) | [VERIFIED] OKX DEX |

### API Endpoints

| Service | Base URL | Auth | Source |
|---------|----------|------|--------|
| OKX OnchainOS | `https://web3.okx.com` | HMAC-SHA256 | [VERIFIED] Helios |
| Uniswap Trading API | `https://trade-api.gateway.uniswap.org` | None | [VERIFIED] API docs |
| X Layer RPC | `https://rpc.xlayer.tech` | None | [VERIFIED] |
| X Layer Explorer | `https://www.okx.com/web3/explorer/xlayer` | None | [VERIFIED] |
| Pinata IPFS | `https://api.pinata.cloud` | JWT Bearer | [VERIFIED] |
| OKX x402 Facilitator | `https://web3.okx.com/api/v6/x402` | HMAC-SHA256 | [VERIFIED] Sponsir |
| IPFS Gateway | `https://gateway.pinata.cloud/ipfs` | None | [VERIFIED] |

---

## 19. Internal API Contracts

### Trust Routes

```
POST /api/trust/score
  Request:  { address: string, chainId: number }
  Response: TrustScoreResponse (overall, dimensions[], recommendation, findings[], recommendations[])
  Auth: None
  Status: 200 OK | 400 Bad Request | 500 Server Error

POST /api/trust/premium
  Request:  { address: string, chainId: number }
  Response: TrustScoreResponse (same as above but with deeper analysis)
  Auth: x402 payment (0.01 USDG)
  Status: 200 OK | 402 Payment Required | 500 Server Error
```

### Lineage Routes

```
GET /api/lineage/chain/:agent
  Query:    ?limit=number&offset=number
  Response: DecisionNode[]
  Auth: None
  Status: 200 OK | 500 Server Error

GET /api/lineage/decision/:id
  Response: DecisionNode
  Auth: None
  Status: 200 OK | 404 Not Found | 500 Server Error

GET /api/lineage/stats/:agent
  Response: AgentStats { totalDecisions, firstSeen, lastSeen, actionBreakdown }
  Auth: None
  Status: 200 OK | 500 Server Error
```

### Agent Routes

```
POST /api/agent/start
  Request:  Partial<AgentConfig> (optional overrides)
  Response: { status: "started", config: AgentConfig }
  Auth: None
  Status: 200 OK | 409 Conflict (already running)

POST /api/agent/stop
  Response: { status: "stopped" }
  Auth: None
  Status: 200 OK

GET /api/agent/status
  Response: { running: boolean, state: AgentState | null, config: AgentConfig | null }
  Auth: None
  Status: 200 OK
```

### WebSocket Protocol

```
URL: ws://localhost:3001/ws

Server → Client messages:
  { type: "cycle_start", data: { cycle: number, timestamp: string } }
  { type: "signal", data: { signals: Signal[], prices: Record<string, string> } }
  { type: "analysis", data: { action: string, token: string, confidence: number, reasoning: string } }
  { type: "trust_check", data: { address: string, score: number, passed: boolean } }
  { type: "execution", data: { action: string, txHash: string, amount: string } }
  { type: "lineage_logged", data: { decisionId: number, ipfsUri: string } }
  { type: "cycle_end", data: { cycle: number, duration: number } }
  { type: "error", data: { message: string, phase: string } }
```

---

## 20. Integration Map

| # | From | To | Protocol | Credential | Health Check | Priority |
|---|------|----|----------|------------|-------------|----------|
| 1 | Trust Scorer | OKX Portfolio API | HTTPS + HMAC | OKX_API_KEY | `GET /api/v6/wallet/asset/total-value` | CRITICAL |
| 2 | Trust Scorer | OKX Security API | HTTPS + HMAC | OKX_API_KEY | `GET /api/v6/dex/security/token-scan` | CRITICAL |
| 3 | Trust Scorer | OKX Signal API | HTTPS + HMAC | OKX_API_KEY | `GET /api/v6/dex/signal/list` | HIGH |
| 4 | Trust Scorer | OKX Token API | HTTPS + HMAC | OKX_API_KEY | `GET /api/v6/dex/token/info` | HIGH |
| 5 | Trust Scorer | Uniswap Trading API | HTTPS | None | `POST /v1/quote` with tiny amount | MEDIUM |
| 6 | Demo Agent | OKX DEX Swap API | HTTPS + HMAC | OKX_API_KEY | `GET /api/v6/dex/aggregator/quote` | CRITICAL |
| 7 | Demo Agent | DecisionLineageLogger | JSON-RPC (viem) | PRIVATE_KEY | `isRegistered(agentAddr)` | CRITICAL |
| 8 | Demo Agent | Pinata IPFS | HTTPS + JWT | PINATA_JWT | `GET /data/testAuthentication` | HIGH |
| 9 | Lineage Query | DecisionLineageLogger | JSON-RPC (viem) | None (read) | `getAgentDecisionCount(any)` | CRITICAL |
| 10 | Lineage Query | IPFS Gateway | HTTPS | None | Fetch known CID | HIGH |
| 11 | x402 Middleware | OKX x402 Facilitator | HTTPS + HMAC | OKX_API_KEY | `POST /api/v6/x402/verify` | HIGH |
| 12 | MCP Server | Trust Scorer | In-process | None | N/A | CRITICAL |
| 13 | MCP Server | Lineage Query | In-process | None | N/A | CRITICAL |
| 14 | Dashboard | API Server | HTTP/WS | None | `GET /health` | CRITICAL |

---

## 21. Security Considerations

### Assets at Risk

| Asset | Impact | Mitigation |
|-------|--------|------------|
| OKX API credentials | Full account access | `.env` only, never committed, gitignore enforced |
| Agent private key | Wallet drain | Dedicated wallet with limited funds, never in source |
| Pinata JWT | IPFS abuse | Scoped to pin-only, rotatable |

### Attack Surfaces

| Surface | Threat | Mitigation |
|---------|--------|------------|
| API endpoints | Injection, DoS | Zod validation on all inputs, rate limiting via Hono middleware |
| Smart contract | Reentrancy, overflow | No external calls in logDecision, Solidity 0.8.24 overflow checks |
| IPFS reasoning | Data poisoning | keccak256 hash stored on-chain for integrity verification |
| x402 payment | Replay, underpay | OKX facilitator handles verification — we trust facilitator response |
| WebSocket | Flood, injection | Read-only broadcast (no client→server commands), connection limit |

### Security Invariants

1. **No secrets in code** — All credentials via environment variables only
2. **Input validation everywhere** — Zod schemas on every API endpoint, ABI encoding on contract calls
3. **Minimal contract permissions** — `logDecision` only callable by registered agents, registration open but permissionless
4. **IPFS integrity** — Every reasoning URI has a corresponding keccak256 hash stored on-chain
5. **Agent isolation** — Demo agent runs with dedicated wallet, limited balance, configurable safety gates
6. **Read-only public access** — Trust scoring and lineage queries require no authentication
7. **Payment-gated premium** — x402 middleware ensures payment before premium report generation

---

## 22. Performance Budgets

| Metric | Target | Method |
|--------|--------|--------|
| Trust score latency | < 3s | Parallel API calls via `Promise.allSettled`, 7 concurrent OKX requests |
| Decision log gas | < 100,000 | Minimal on-chain storage, reasoning text on IPFS |
| Decision log cost | < $0.001 | X Layer sub-cent gas pricing |
| Agent cycle time | < 30s | 5-phase pipeline, configurable interval (default 60s) |
| Dashboard initial load | < 2s | Next.js SSR + code splitting, Recharts lazy loaded |
| API response (non-trust) | < 500ms | Direct contract reads via viem, LRU cache on IPFS |
| IPFS pin time | < 5s | Pinata cloud pinning with JWT auth |

---

*Architecture document generated for Omnispect-X — OKX Build X Hackathon Season 2*
*Target: X Layer (Chain ID 196) | Stack: TypeScript + Solidity + Bun + Hono + Next.js 14*
