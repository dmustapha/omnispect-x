# Omnispect-X — Product Requirements Document

**Hackathon:** OKX Build X Hackathon Season 2
**Track:** Skills Arena (primary) + X Layer Arena (secondary)
**Deadline:** April 15, 2026 23:59 UTC (~1.5 build days remaining)
**Version:** V1

---

## 1. Project Overview

### One-Liner
A reusable OnchainOS skill that gives any AI agent a trust score and an immutable decision audit trail on X Layer.

### Problem Statement
$1.4 billion lost to crypto scams in Q1 2026 alone — and autonomous AI agents are now making financial decisions with ZERO transparency or accountability. When an agent loses your money, there's no way to verify what it decided or why. Omnispect-X makes every agent decision auditable and every agent reputation verifiable.

### Solution
Omnispect-X is a dual-module OnchainOS skill for X Layer. Module 1 (Trust Scorer) analyzes any agent wallet across 4 behavioral dimensions using 6+ OnchainOS skills and Uniswap pool data. Module 2 (Decision Lineage Logger) is a smart contract registry where agents log decision→reasoning→tx_hash chains, queryable by anyone. A Demo Trading Agent uses both modules to trade transparently on X Layer via Uniswap/OKX DEX, proving the skills work in production. A dashboard makes lineage visible with a visual decision tree — the hero feature judges will remember.

### Why This Wins
| Judging Criterion | Weight | How We Excel |
|---|:---:|---|
| OnchainOS/Uniswap Integration | 25% | 9 OnchainOS skills across trust scorer + demo agent. Uniswap pool risk analysis + swap execution. Creative combo of read (trust) + write (lineage) + execute (trading). |
| X Layer Ecosystem Fit | 25% | Zero competitors in trust/accountability on X Layer. Infrastructure layer every agent needs. Sub-cent lineage logging ($0.0005/log). |
| AI Interaction Experience | 25% | Multi-dimensional AI trust breakdown. Watch AI reason → execute → log lineage in real time. Query "Why did agent X make trade Y?" → full reasoning chain. Visual decision tree rendering. |
| Product Completeness | 25% | Existing code from agent-auditor (65-70%) + deltaagent (pattern reuse). MCP server exposure. x402 gated reports. Both arenas + 4 special prizes targeted. |

---

## 2. System Architecture Overview

### System Diagram
```
┌─────────────────────────────────────────────────────────────────────┐
│                        DASHBOARD (Next.js)                         │
│  ┌──────────┐  ┌──────────────┐  ┌──────────┐  ┌──────────────┐  │
│  │  Trust    │  │  Decision    │  │  Agent   │  │  Multi-Agent │  │
│  │  Score    │  │  Lineage     │  │  Monitor │  │  Comparison  │  │
│  │  Lookup   │  │  Explorer    │  │  (Live)  │  │  View        │  │
│  └─────┬────┘  └──────┬───────┘  └────┬─────┘  └──────┬───────┘  │
└────────┼──────────────┼───────────────┼────────────────┼──────────┘
         │              │               │                │
    ┌────▼──────────────▼───────────────▼────────────────▼──────────┐
    │                    BACKEND API (Bun + Hono)                    │
    │  ┌─────────────┐  ┌──────────────┐  ┌────────────────────┐   │
    │  │ Trust Scorer │  │ Lineage      │  │ WebSocket Server   │   │
    │  │ Service      │  │ Query Service│  │ (Agent Events)     │   │
    │  └──────┬───────┘  └──────┬───────┘  └─────────┬──────────┘  │
    │         │                 │                     │              │
    │  ┌──────▼─────────────────▼─────────────────────▼──────────┐  │
    │  │              OnchainOS HTTP Client (HMAC)               │  │
    │  │  wallet-portfolio │ security │ dex-signal │ dex-token   │  │
    │  │  dex-market │ dex-swap │ onchain-gateway │ x402-payment│  │
    │  └──────┬──────────────────────────────────────┬───────────┘  │
    │         │                                      │              │
    │  ┌──────▼──────────┐  ┌────────────────────────▼───────────┐  │
    │  │ Uniswap Client  │  │ x402 Middleware (Report Gating)    │  │
    │  │ (Trading API)   │  │ EIP-3009 + USDG Settlement        │  │
    │  └─────────────────┘  └────────────────────────────────────┘  │
    └────────────────────────────────────┬──────────────────────────┘
                                         │
    ┌────────────────────────────────────▼──────────────────────────┐
    │              DEMO TRADING AGENT (Autonomous Loop)             │
    │  Signal → Analyze → Trust-Gate → Execute → Log Lineage       │
    │  Uses: dex-signal, dex-market, dex-swap, Uniswap API         │
    └────────────────────────────────────┬──────────────────────────┘
                                         │
    ┌────────────────────────────────────▼──────────────────────────┐
    │                    X LAYER (Chain ID 196)                     │
    │  ┌──────────────────────┐  ┌──────────────────────────────┐  │
    │  │ DecisionLineageLogger│  │ Uniswap V3 SwapRouter02      │  │
    │  │ (Custom Contract)    │  │ 0x4f0c28f5926afda16bf2506d.. │  │
    │  └──────────────────────┘  └──────────────────────────────┘  │
    │  Gas: OKB (~$0.0005/tx)    RPC: https://rpc.xlayer.tech     │
    └──────────────────────────────────────────────────────────────┘
```

### Component Table
| Component | Type | Purpose | Key Dependencies |
|-----------|------|---------|-----------------|
| Trust Scorer Service | Backend service | Multi-dimensional trust analysis of agent wallets | OnchainOS API (6 skills), Uniswap Trading API |
| Decision Lineage Logger | Solidity smart contract | Immutable decision→reasoning→tx_hash registry | X Layer, IPFS |
| Lineage Query Service | Backend service | Read/query lineage data from contract | Lineage Logger contract, RPC |
| Demo Trading Agent | Autonomous service | Prove skills work via real trades | Trust Scorer, Lineage Logger, OKX DEX, Uniswap |
| Dashboard | Next.js frontend | Visual trust scores, decision trees, live agent monitoring | Backend API, WebSocket |
| OnchainOS HTTP Client | Shared library | HMAC-authenticated calls to all OKX skills | OKX API keys |
| Uniswap Client | Shared library | Pool risk analysis + swap execution | Uniswap Trading API |
| x402 Middleware | Backend middleware | Gate premium trust reports behind micropayment | USDG on X Layer |
| MCP Server | MCP tool wrapper | Expose skills to AI coding assistants | OnchainOS MCP protocol |
| WebSocket Server | Backend service | Real-time agent event streaming | Demo Trading Agent |

### Data Flow
1. **Trust scoring:** User/agent requests trust report → Backend calls 6+ OnchainOS skills (wallet-portfolio, security, dex-signal, dex-token) + Uniswap pool data → Aggregates into 4-axis score (0-100) → Returns structured report with breakdown
2. **Decision logging:** Demo agent makes a decision → Computes reasoning hash → Uploads reasoning text to IPFS → Calls `logDecision()` on X Layer contract with decision ID, prev decision ID, reasoning hash, action type, resulting tx hash → Event emitted with indexed fields
3. **Lineage querying:** User queries "Why did agent X do Y?" → Backend reads contract → Returns linked chain of decisions with IPFS reasoning → Dashboard renders as visual decision tree
4. **Demo trading:** Signal collection (dex-signal smart money) → LLM analysis → Trust-gate counterparty → Execute swap (OKX DEX primary, Uniswap secondary) → Log full lineage → Broadcast via WebSocket to dashboard

---

## 3. User Flows

### Flow 1: Trust Score Lookup
1. User enters an agent wallet address in the dashboard
2. Backend calls OnchainOS skills: wallet-portfolio (holdings), security (risk scan), dex-signal (smart money activity), dex-token (token analysis), dex-market (trading patterns)
3. Backend calls Uniswap Trading API for pool risk data (liquidity depth, concentration)
4. Trust Scorer aggregates into 4-axis score:
   - Transaction Patterns (0-25): frequency, volume consistency, time patterns
   - Contract Interactions (0-25): verified vs unverified contracts, risk levels
   - Fund Flow (0-25): source diversity, concentration, suspicious patterns
   - Behavioral Consistency (0-25): deviation from historical patterns
5. Dashboard displays: overall score (0-100), per-axis breakdown, risk classification (SAFE/CAUTION/BLOCKLIST), detailed findings, recommended actions

### Flow 2: Decision Lineage Exploration
1. User enters an agent address or decision ID in the dashboard
2. Backend calls `getAgentDecisionChain()` on the Lineage Logger contract
3. For each decision in the chain, backend fetches reasoning text from IPFS URI
4. Dashboard renders a visual decision tree:
   - Each node = one decision (signal data → reasoning → action → tx hash)
   - Edges = linked-list connections (prevDecisionId)
   - Click any node → expand to see full reasoning + on-chain tx link
5. User can trace any trade back through the full reasoning chain

### Flow 3: Live Agent Monitoring
1. User opens the "Agent Monitor" tab in dashboard
2. WebSocket connection established to backend
3. Demo Trading Agent runs its 5-phase cycle:
   a. **Signal Collection:** Fetches smart money movements via okx-dex-signal
   b. **Analysis:** LLM analyzes signals against market data from okx-dex-market
   c. **Trust Gate:** Checks counterparty trust score before any trade
   d. **Execution:** Executes swap via OKX DEX (primary) or Uniswap (secondary)
   e. **Lineage Logging:** Logs decision→reasoning→tx_hash on-chain
4. Each phase broadcasts a WebSocket event → Dashboard updates in real time
5. User sees the agent "thinking" (reasoning), "deciding" (trust check), "executing" (swap), and "recording" (lineage log) — live

### Flow 4: Multi-Agent Comparison
1. User enters 2-3 agent wallet addresses
2. Backend runs trust scoring for each agent in parallel
3. Dashboard displays side-by-side comparison:
   - Radar chart overlaying all agents' 4-axis scores
   - Per-dimension comparison table
   - Risk classification for each agent
4. Highlights which agent is most trustworthy and why

### Flow 5: x402-Gated Premium Report
1. External agent/user requests a detailed trust report via API
2. x402 middleware returns HTTP 402 with payment requirements (USDG amount)
3. Caller's agent wallet auto-pays via EIP-3009 transferWithAuthorization
4. Settlement completes → Full premium report returned
5. Payment logged on X Layer as proof of service delivery

### Flow 6: MCP Tool Integration
1. Developer runs `claude mcp add --scope user omnispect-x-mcp`
2. AI assistant (Claude, etc.) gains access to Omnispect-X tools:
   - `trust-score` — score any wallet address
   - `lineage-query` — query decision chain for any agent
   - `lineage-log` — log a decision (for agent developers)
3. Developer asks: "Is this agent safe to interact with?" → Claude calls `trust-score` → Returns formatted analysis

### Sequence Diagram: Demo Agent Trade Cycle
```
Agent -> dex-signal API: GET smart money activities (X Layer)
dex-signal API -> Agent: whale movements + signals
Agent -> dex-market API: GET token prices + klines
dex-market API -> Agent: market data
Agent -> LLM: Analyze signals + market data
LLM -> Agent: Trade recommendation (token, direction, size, confidence)
Agent -> Trust Scorer: Score counterparty token/pool
Trust Scorer -> Agent: Trust report (SAFE/CAUTION/BLOCKLIST)
Agent -> Agent: Safety gate check (confidence > 0.7, trust > 60, within position limits)
Agent -> dex-swap API: Execute swap (OKX DEX aggregator)
dex-swap API -> Agent: tx hash
Agent -> IPFS: Upload reasoning text
IPFS -> Agent: reasoning URI
Agent -> Lineage Contract: logDecision(decisionId, reasoningHash, reasoningURI, actionType, txHash)
Lineage Contract -> Agent: DecisionLogged event
Agent -> WebSocket: Broadcast cycle complete event
WebSocket -> Dashboard: Update UI in real time
```

---

## 4. Technical Specifications

### Trust Scorer Service
- **Purpose:** Multi-dimensional behavioral analysis of agent wallets
- **Interface:**
  ```typescript
  interface TrustScoreRequest {
    agentAddress: string;  // 0x... wallet address
    chainId?: number;      // default 196 (X Layer)
  }

  interface TrustScoreResponse {
    address: string;
    overallScore: number;  // 0-100
    classification: "SAFE" | "CAUTION" | "BLOCKLIST";
    dimensions: {
      transactionPatterns: { score: number; findings: Finding[] };
      contractInteractions: { score: number; findings: Finding[] };
      fundFlow: { score: number; findings: Finding[] };
      behavioralConsistency: { score: number; findings: Finding[] };
    };
    uniswapRisk: {
      poolsAnalyzed: number;
      avgLiquidityScore: number;
      concentrationRisk: number;
    };
    recommendations: string[];
    timestamp: number;
  }
  ```
- **Dependencies:** OnchainOS HTTP Client (6 skills), Uniswap Client
- **Events:** Emits WebSocket event on completion for live dashboard updates
- **Constraints:** Each scoring call makes 6-8 API calls; rate-limit aware with retry logic

### Decision Lineage Logger Contract
- **Purpose:** Immutable on-chain registry of agent decision chains
- **Interface (Solidity):**
  ```solidity
  interface IDecisionLineageLogger {
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

    event DecisionLogged(
      address indexed agent,
      bytes32 indexed decisionId,
      bytes32 indexed prevDecisionId,
      uint8 actionType,
      bytes32 resultTxHash,
      string reasoningURI,
      uint64 timestamp
    );

    function registerAgent(string calldata metadata) external;
    function logDecision(
      bytes32 decisionId,
      bytes32 reasoningHash,
      string calldata reasoningURI,
      uint8 actionType,
      bytes32 resultTxHash
    ) external;
    function getDecision(bytes32 decisionId) external view returns (Decision memory);
    function getAgentDecisionChain(address agent, uint256 offset, uint256 limit) external view returns (Decision[] memory);
    function getAgentDecisionCount(address agent) external view returns (uint256);
    function isRegistered(address agent) external view returns (bool);
  }
  ```
- **Dependencies:** X Layer RPC, IPFS for reasoning text storage
- **Gas:** ~80,000-100,000 per `logDecision()` call = ~$0.0005 on X Layer
- **Action Types:** 0=SIGNAL_COLLECTED, 1=ANALYSIS_COMPLETE, 2=TRUST_CHECK, 3=SWAP_EXECUTED, 4=POSITION_OPENED, 5=POSITION_CLOSED, 6=EMERGENCY_STOP

### Demo Trading Agent
- **Purpose:** Autonomous trading agent proving both skills work in production
- **Interface:**
  ```typescript
  interface AgentConfig {
    strategy: "whale-follow";
    confidenceFloor: number;    // minimum 0.7
    trustFloor: number;         // minimum 60
    maxPositionSize: string;    // e.g., "100" USDT
    cycleInterval: number;      // ms between cycles, default 30000
    circuitBreaker: {
      maxLossPercent: number;   // stop if portfolio drops > X%
      maxConsecutiveLosses: number;
    };
  }
  ```
- **5-Phase Cycle:** Signal → Analyze → Trust-Gate → Execute → Log Lineage
- **Dependencies:** Trust Scorer, Lineage Logger, OKX DEX API, Uniswap Trading API, dex-signal, dex-market
- **Strategy:** Whale-following via okx-dex-signal smart money tracking

### Dashboard
- **Purpose:** Visual interface for trust scores, decision lineage, live monitoring
- **Key Views:**
  - Trust Score Lookup: search bar + 4-axis radar chart + detailed breakdown
  - Decision Lineage Explorer: visual decision tree with expandable nodes
  - Agent Monitor: real-time feed of demo agent's decision cycle
  - Multi-Agent Comparison: side-by-side radar charts for 2-3 agents
- **Dependencies:** Backend API, WebSocket connection
- **Tech:** Next.js 14 App Router, Tailwind CSS, Recharts (radar/charts), D3.js (decision tree)

### OnchainOS HTTP Client
- **Purpose:** Shared HMAC-authenticated client for all OKX skill API calls
- **Interface:**
  ```typescript
  interface OKXClient {
    walletPortfolio: {
      totalValue(address: string, chains?: string[]): Promise<PortfolioValue>;
      allBalances(address: string, chains?: string[]): Promise<TokenBalance[]>;
    };
    security: {
      tokenScan(address: string, chainIndex: string): Promise<SecurityReport>;
    };
    dexSignal: {
      smartMoney(chainIndex: string, limit?: number): Promise<SmartMoneyActivity[]>;
      signals(chainIndex: string): Promise<Signal[]>;
    };
    dexToken: {
      info(address: string): Promise<TokenInfo>;
      holders(address: string): Promise<HolderInfo>;
      liquidity(address: string): Promise<LiquidityInfo>;
    };
    dexMarket: {
      price(address: string): Promise<PriceInfo>;
      kline(address: string, interval: string): Promise<KlineData[]>;
    };
    dexSwap: {
      quote(params: SwapQuoteParams): Promise<SwapQuote>;
      swap(params: SwapParams): Promise<SwapResult>;
      approveTransaction(params: ApproveParams): Promise<ApproveTx>;
    };
    onchainGateway: {
      estimateGas(params: GasParams): Promise<GasEstimate>;
      simulate(params: SimulateParams): Promise<SimulateResult>;
      broadcast(params: BroadcastParams): Promise<BroadcastResult>;
    };
  }
  ```
- **Authentication:** HMAC-SHA256(SECRET_KEY, timestamp+METHOD+path+body) → base64
- **Headers:** OK-ACCESS-KEY, OK-ACCESS-SIGN, OK-ACCESS-TIMESTAMP, OK-ACCESS-PASSPHRASE

### Lineage Query Service
- **Purpose:** Read and format decision lineage data from on-chain contract + IPFS
- **Interface:**
  ```typescript
  interface LineageQueryService {
    getDecisionChain(agentAddress: string, offset?: number, limit?: number): Promise<DecisionNode[]>;
    getDecision(decisionId: string): Promise<DecisionNode>;
    getReasoningText(ipfsUri: string): Promise<ReasoningPayload>;
    getAgentStats(agentAddress: string): Promise<AgentStats>;
  }
  ```
- **Dependencies:** Lineage Logger contract (via ethers/viem), IPFS gateway
- **Caching:** LRU cache for recently fetched decisions and IPFS content (immutable data, safe to cache forever)

### Uniswap Client
- **Purpose:** Pool risk analysis and swap execution via Uniswap Trading API on X Layer
- **Interface:**
  ```typescript
  interface UniswapClient {
    getQuote(params: { tokenIn: string; tokenOut: string; amountIn: string; chainId: number }): Promise<UniswapQuote>;
    getPoolRisk(tokenAddress: string): Promise<PoolRiskAssessment>;
  }
  ```
- **Dependencies:** Uniswap Trading API (`https://trade-api.gateway.uniswap.org`)
- **Pool Risk Metrics:** Liquidity depth, concentration ratio, implied volatility from price impact

### x402 Middleware
- **Purpose:** Gate premium trust reports behind USDG micropayment
- **Flow:** Request → Check x402 header → If none, return 402 with paymentRequirements → Caller pays → Verify payment → Return premium report
- **Payment Token:** USDG at `0x4ae46a509f6b1d9056937ba4500cb143933d2dc8` on X Layer
- **Settlement:** EIP-3009 transferWithAuthorization

### MCP Server
- **Purpose:** Expose Omnispect-X skills to AI coding assistants
- **Tools Exposed:** `trust-score`, `lineage-query`, `lineage-log`, `agent-register`
- **Protocol:** MCP (Model Context Protocol) via stdin/stdout

### WebSocket Server
- **Purpose:** Real-time streaming of demo agent events to dashboard
- **Events:** `agent:signal`, `agent:analysis`, `agent:trust-check`, `agent:swap`, `agent:lineage-logged`, `agent:cycle-complete`, `agent:error`
- **Protocol:** WebSocket on `/ws`

---

## 5. API Contracts

### External API: OKX OnchainOS (All Skills)
- **Base URL:** `https://web3.okx.com`
- **Authentication:** HMAC-SHA256 (see OnchainOS HTTP Client spec)
- **Rate Limits:** 5 requests/second per endpoint group [ASSUMED]

#### Endpoint: GET /api/v6/wallet/asset/total-value
- **Request:** `?address={addr}&chains=196`
- **Response (success):**
  ```json
  { "code": "0", "data": [{ "totalValue": "1234.56" }] }
  ```

#### Endpoint: GET /api/v6/wallet/asset/all-token-balances-by-address
- **Request:** `?address={addr}&chains=196`
- **Response (success):**
  ```json
  { "code": "0", "data": [{ "tokenAddress": "0x...", "symbol": "OKB", "balance": "10.5", "tokenPrice": "45.2" }] }
  ```

#### Endpoint: GET /api/v6/wallet/security/token-scan
- **Request:** `?chainIndex=196&tokenContractAddress={addr}`
- **Response (success):**
  ```json
  { "code": "0", "data": [{ "riskLevel": "low", "isHoneypot": false, "buyTax": "0", "sellTax": "0" }] }
  ```

#### Endpoint: GET /api/v6/dex/aggregator/quote
- **Request:** `?chainIndex=196&fromTokenAddress=0xeee...&toTokenAddress={addr}&amount={amount}`
- **Response (success):**
  ```json
  { "code": "0", "data": [{ "routerResult": { "toTokenAmount": "100.5", "estimateGasFee": "0.001" } }] }
  ```

#### Endpoint: GET /api/v6/dex/aggregator/swap
- **Request:** `?chainIndex=196&fromTokenAddress=...&toTokenAddress=...&amount=...&slippage=0.01&userWalletAddress=...`
- **Response (success):**
  ```json
  { "code": "0", "data": [{ "tx": { "to": "0x...", "data": "0x...", "value": "0x...", "gasPrice": "0x..." } }] }
  ```

#### Endpoint: GET /api/v6/dex/market/candles
- **Request:** `?chainIndex=196&tokenContractAddress={addr}&bar=1H`
- **Response (success):**
  ```json
  { "code": "0", "data": [{ "ts": 1700000000, "o": "1.0", "h": "1.1", "l": "0.9", "c": "1.05", "vol": "10000" }] }
  ```

#### Endpoint: GET /api/v6/dex/tracker/activities
- **Request:** `?chainIndex=196&trackerType=smart_money`
- **Response (success):**
  ```json
  { "code": "0", "data": [{ "address": "0x...", "tokenAddress": "0x...", "action": "buy", "amount": "50000", "ts": 1700000000 }] }
  ```

### External API: Uniswap Trading API
- **Base URL:** `https://trade-api.gateway.uniswap.org`
- **Authentication:** None required (zero Uniswap Labs fees)
- **Rate Limits:** Unknown — implement exponential backoff

#### Endpoint: POST /v1/quote
- **Request:**
  ```json
  {
    "type": "EXACT_INPUT",
    "tokenIn": "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    "tokenInChainId": 196,
    "tokenOut": "0x4ae46a509f6b1d9056937ba4500cb143933d2dc8",
    "tokenOutChainId": 196,
    "amount": "1000000000000000000",
    "swapper": "0x..."
  }
  ```
- **Response (success):**
  ```json
  {
    "quote": { "amountOut": "...", "gasFee": "...", "priceImpact": 0.01 },
    "routing": "CLASSIC"
  }
  ```

### External API: IPFS (Pinning)
- **Base URL:** `https://api.pinata.cloud` or local IPFS node
- **Authentication:** JWT or API key
- **Rate Limits:** 200 req/min (Pinata free tier)

#### Endpoint: POST /pinning/pinJSONToIPFS
- **Request:**
  ```json
  { "pinataContent": { "reasoning": "...", "signals": [...], "confidence": 0.85 } }
  ```
- **Response (success):**
  ```json
  { "IpfsHash": "Qm...", "PinSize": 1234 }
  ```

### External API: X Layer RPC
- **Base URL:** `https://rpc.xlayer.tech`
- **Authentication:** None
- **Rate Limits:** Public RPC — use ethers/viem with retry

---

## 6. Demo Script

**Total Duration:** 3 minutes
**Format:** Screen recording with voiceover

### Scene 1: The Problem (20s)
**Screen:** Dark slide with "$1.4B lost to crypto scams in Q1 2026" headline, animated counter
**Voiceover:** "AI agents are making financial decisions on-chain. But when they lose your money, there is no way to know what they decided or why. No trust scores. No audit trail. Nothing."
**Action:** Counter animates up, then text fades to Omnispect-X logo

### Scene 2: Introducing Omnispect-X (15s)
**Screen:** Dashboard landing page with the tagline "Trust Scores + Decision Lineage for Every AI Agent"
**Voiceover:** "Omnispect-X is a reusable OnchainOS skill that makes any AI agent trustworthy and auditable. Two modules, one mission: agent accountability."
**Action:** Camera pans across the dashboard, highlighting Trust Scorer and Lineage Explorer tabs

### Scene 3: Trust Score in Action (30s)
**Screen:** Dashboard Trust Score lookup page
**Voiceover:** "Paste any agent's wallet address. Omnispect-X calls six OnchainOS skills and the Uniswap Trading API to build a multi-dimensional trust profile."
**Action:**
1. Paste a demo agent address
2. Loading animation shows each skill being called (wallet-portfolio, security, dex-signal, dex-token, dex-market, Uniswap)
3. 4-axis radar chart renders with scores: Transaction Patterns 22/25, Contract Interactions 19/25, Fund Flow 21/25, Behavioral Consistency 18/25 → Total: 80/100 SAFE
4. Scroll through detailed findings

### Scene 4: Decision Lineage Explorer (40s)
**Screen:** Dashboard Lineage Explorer page — this is the HERO MOMENT
**Voiceover:** "Now, the breakthrough. Every decision this agent ever made is logged on X Layer. Click any trade, and you get the full reasoning chain: what data it saw, what it concluded, and the exact transaction hash."
**Action:**
1. Enter demo agent address
2. Visual decision tree renders — 10-15 nodes in a linked chain
3. Click a node → expands to show: signal data (whale bought $50K of token X), reasoning ("High confidence whale-follow signal, counterparty trust score 82/100, pool liquidity sufficient"), action (swap 0.5 OKB → token X), tx hash (links to X Layer explorer)
4. Trace back 3 nodes to show the full chain of decisions

### Scene 5: Live Agent Monitoring (30s)
**Screen:** Dashboard Agent Monitor tab — split view with decision tree growing in real time
**Voiceover:** "Watch it happen live. Our demo trading agent collects signals, runs analysis, checks counterparty trust, executes trades, and logs everything — all in real time."
**Action:**
1. Demo agent starts a new cycle
2. "Signal Collected" event appears — whale tracker data
3. "Analysis Complete" — AI reasoning with confidence score
4. "Trust Check PASSED" — counterparty score 75/100
5. "Swap Executed" — tx hash appears, links to explorer
6. "Lineage Logged" — new node appears in the decision tree

### Scene 6: Multi-Agent Comparison (15s)
**Screen:** Dashboard comparison view with 2-3 agents side by side
**Voiceover:** "Compare multiple agents at once. See which ones are trustworthy and which ones are not — before you give them your money."
**Action:** Radar charts overlay for 3 agents, one clearly has a low Fund Flow score (flagged CAUTION)

### Scene 7: x402 Gated Access (15s)
**Screen:** Terminal or API client showing a trust report request returning HTTP 402, then auto-paying with USDG, then receiving the premium report
**Voiceover:** "Other agents can pay for premium trust reports using x402 micropayments. Request a report, auto-pay in USDG, get the full analysis. Agent-to-agent commerce on X Layer."
**Action:** Show 402 response → payment → full report returned

### Scene 8: MCP + Architecture (15s)
**Screen:** Split — left: Claude Code terminal using `trust-score` MCP tool; right: architecture diagram
**Voiceover:** "Any AI assistant can use Omnispect-X via MCP. Nine OnchainOS skills, Uniswap pool analysis, a lineage contract at sub-cent gas, all exposed as reusable tools."
**Action:** Claude asks "is this agent safe?" → calls trust-score → gets answer. Architecture diagram lights up.

### Scene 9: Why Omnispect-X Wins (15s)
**Screen:** Closing slide with key stats
**Voiceover:** "Zero competitors in agent accountability on X Layer. Nine OnchainOS skills. Full Uniswap integration. Every decision verifiable on-chain. Omnispect-X — trust, verified."
**Action:** Logo, GitHub link, project stats fade in

### Demo Prerequisites

**Seed State Table** — exact state that must exist before recording begins.

| Item | Value | Network / Location | Created By |
|------|-------|-------------------|------------|
| Demo agent wallet | Funded with 1 OKB + some test tokens | X Layer mainnet | seed-demo.ts |
| Lineage Logger contract | Deployed, demo agent registered | X Layer mainnet | deploy script + seed-demo.ts |
| Demo agent registered | `registerAgent("Omnispect-X Demo Agent v1")` called | X Layer mainnet | seed-demo.ts |
| Pre-seeded decisions | 10-15 decision lineage entries from demo agent | X Layer mainnet | seed-demo.ts |
| Trust score cache | Pre-computed scores for 3-4 agent addresses | Backend cache | seed-demo.ts |
| IPFS reasoning texts | 10-15 pinned reasoning JSONs | Pinata IPFS | seed-demo.ts |

**Invariant:** Running `npx ts-node scripts/seed-demo.ts` from project root must produce this exact state from scratch. The script must be idempotent.

---

## 7. Risk Register

| # | Risk | Severity | Likelihood | Impact | Mitigation | Decision Tree |
|---|------|----------|-----------|--------|------------|:---:|
| 1 | Lineage module invisible in demo | CRITICAL | MEDIUM | Judges miss the key differentiator | Visual decision tree as hero feature (Scene 4). Pre-seed 10+ decisions for rich visualization. | Plan Phase 3 |
| 2 | OnchainOS API rate limits or downtime | CRITICAL | MEDIUM | Trust scoring fails during demo | Cache recent results, implement fallback stale responses, retry with exponential backoff | Plan Phase 1 |
| 3 | Demo agent trade fails during recording | CRITICAL | LOW | No live execution to show | Pre-seed successful trades + record live cycle separately. Seed script creates reliable demo state. | Plan Phase 4 |
| 4 | x402 server-side settlement pattern wrong | HIGH | MEDIUM | x402 gating doesn't work | Pattern is [UNVERIFIED]. Decision tree: try Helios pattern first → fallback to simple API key gating → worst case: make reports free for demo | Plan Phase 2 |
| 5 | Uniswap pools too thin on X Layer | HIGH | MEDIUM | Swaps fail or high slippage | Use OKX DEX aggregator as primary (500+ sources). Uniswap as secondary for pool analysis. | Plan Phase 2 |
| 6 | IPFS pinning latency slows lineage logging | HIGH | LOW | Agent cycle takes too long | Pin asynchronously, log on-chain first with hash, backfill URI. Use Pinata for reliability. | Plan Phase 2 |
| 7 | Gas spikes on X Layer during demo | MEDIUM | LOW | Lineage logging costs more than expected | Sub-cent baseline ($0.0005). Even 10x spike = $0.005. Pre-fund agent wallet with extra OKB. | Plan Phase 1 |
| 8 | Trust scorer returns identical scores for different agents | MEDIUM | MEDIUM | Demo looks unconvincing | Pre-select agents with diverse on-chain behavior. Verify scoring differentiation before recording. | Plan Phase 3 |
| 9 | WebSocket connection drops during live demo | MEDIUM | LOW | Live monitoring stops updating | Auto-reconnect with missed event replay. Fallback: polling every 5s. | Plan Phase 3 |
| 10 | Dual-arena narrative dilution | HIGH | MEDIUM | Judges confused about what it is | Lead with "reusable skill" (Skills Arena), demo agent is proof-of-concept. README and video consistent. | Plan Phase 4 |
| 11 | Integration depth gap vs Genesis Protocol (13 skills) | HIGH | HIGH | Score lower on OnchainOS integration | Maximize to 9 skills. Log every skill call prominently in code + README. | Plan Phase 1 |
| 12 | "Who uses this today?" question from judges | HIGH | HIGH | No real adoption story | Pre-seed with real X Layer agent data. Position hackathon agents as day-1 users. | Plan Phase 4 |
| 13 | X Layer RPC downtime or rate limiting | MEDIUM | LOW | Contract reads/writes fail | Use public RPC with retry. Fallback: secondary RPC endpoint. Pre-cache lineage data for demo. | Plan Phase 1 |

### Risk Categories Covered
- [x] Technical risks (#2, #4, #5, #6, #7)
- [x] Competitive risks (#11)
- [x] Time risks (full scope achievable with Claude — not a risk at this speed)
- [x] Demo risks (#1, #3, #8, #9)
- [x] Judging risks (#10, #12)
- [x] Scope risks (full scope, no cuts — Claude handles velocity)

---

## 8. Day-by-Day Build Plan

| Day | Date | Primary Objective | Secondary Objective | Deliverable |
|:---:|------|------------------|--------------------|-----------  |
| 1 (AM) | Apr 14 | Smart contracts + OnchainOS client + Trust Scorer service | Project scaffolding, env setup | Lineage Logger deployed on X Layer, Trust Scorer returning real scores |
| 1 (PM) | Apr 14 | Demo Trading Agent + Lineage integration | Backend API routes, WebSocket server | Working agent cycle: signal → analyze → trade → log lineage |
| 2 (AM) | Apr 15 | Dashboard: Trust Score UI + Lineage Explorer + Visual Decision Tree | x402 middleware, MCP server | Full dashboard with hero decision tree visualization |
| 2 (PM) | Apr 15 | Polish, demo recording, multi-agent comparison, submission | Live monitoring view, seeding, README | Submission package: video, GitHub repo, Google Form + Moltbook |

### Buffer Allocation
- 2 hours buffer built into Apr 15 PM for unexpected issues
- Demo recording: 1 hour (multiple takes)
- Submission: 30 min (Google Form + Moltbook + X post)

---

## 9. Dependencies & Prerequisites

### External Services
| Service | URL | Auth Required | Status |
|---------|-----|:---:|---|
| OKX OnchainOS API | https://web3.okx.com/api/v6/ | HMAC-SHA256 | [VERIFIED] |
| Uniswap Trading API | https://trade-api.gateway.uniswap.org | None | [VERIFIED] |
| X Layer RPC | https://rpc.xlayer.tech | None | [VERIFIED] |
| IPFS (Pinata) | https://api.pinata.cloud | JWT | [VERIFIED] |
| X Layer Explorer | https://www.okx.com/web3/explorer/xlayer | None | [VERIFIED] |

### Development Tools
| Tool | Version | Purpose | Install Command |
|------|---------|---------|----------------|
| Bun | 1.1+ | Runtime + package manager | `curl -fsSL https://bun.sh/install \| bash` |
| Foundry | latest | Solidity development | `curl -L https://foundry.paradigm.xyz \| bash && foundryup` |
| Node.js | 20+ | Compatibility | `nvm install 20` |
| Next.js | 14 | Dashboard frontend | `bunx create-next-app` |
| OnchainOS Skills | latest | OKX integration | `npx skills add okx/onchainos-skills` |
| Uniswap AI Skills | latest | Uniswap integration | `npx skills add Uniswap/uniswap-ai` |

### Accounts & Credentials
| Account | Purpose | How to Get |
|---------|---------|-----------|
| OKX Developer Portal | API keys (KEY, SECRET, PASSPHRASE) | https://www.okx.com/web3/build/dev-portal |
| Pinata | IPFS pinning | https://app.pinata.cloud (free tier) |
| X Layer wallet | Agent identity + gas | Any EVM wallet with OKB |

### On-Chain Addresses
| Item | Address | Network | Source |
|------|---------|---------|--------|
| Uniswap V3 Factory | `0x4b2ab38dbf28d31d467aa8993f6c2585981d6804` | X Layer (196) | [VERIFIED] Uniswap SDK |
| Uniswap V3 SwapRouter02 | `0x4f0c28f5926afda16bf2506d5d9e57ea190f9bca` | X Layer (196) | [VERIFIED] Uniswap SDK |
| Uniswap V4 PoolManager | `0x360e68faccca8ca495c1b759fd9eee466db9fb32` | X Layer (196) | [VERIFIED] Uniswap SDK |
| USDG | `0x4ae46a509f6b1d9056937ba4500cb143933d2dc8` | X Layer (196) | [VERIFIED] Helios code |
| WOKB (wrapped native) | `0xe538905cf8410324e03A5A23C1c177a474D59b2b` | X Layer (196) | [VERIFIED] Uniswap SDK |
| Native OKB placeholder | `0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee` | X Layer (196) | [VERIFIED] OKX DEX docs |
| Lineage Logger | DEPLOY_AND_RECORD_ADDRESS_HERE | X Layer (196) | Custom contract |

---

## 10. Concerns Compliance

| # | Severity | Concern | How PRD Addresses It |
|---|:---:|---------|----------------------|
| 1 | C | Decision-to-action lineage must be core, not afterthought | Lineage Logger is Module 2 of the dual-module skill. Every agent decision links to a tx hash via the smart contract. Visual decision tree is the hero demo feature (Scene 4). |
| 2 | C | Uniqueness is non-negotiable | Zero competitors in trust/accountability on X Layer. Verified in competitive research — Genesis Protocol, Helios, Leigent are all DeFi/trading. |
| 3 | C | Demo must show lineage visually | Visual decision tree rendering is the centerpiece of the dashboard. Scene 4 of demo script (40s) dedicated to walking through lineage. |
| 4 | C | Demo agent must execute real trades | Demo agent executes real swaps via OKX DEX/Uniswap on X Layer mainnet. Pre-seeded + live cycle in demo. |
| 5 | C | Must solve a significant, real problem | $1.4B lost to crypto scams in Q1 2026. Problem statement quantified. Solution directly addresses root cause (agent opacity). |
| 6 | I | Deep OnchainOS multi-skill usage (8+ skills) | 9 skills integrated: agentic-wallet, wallet-portfolio, security, dex-signal, dex-token, dex-market, dex-swap, onchain-gateway, x402-payment. |
| 7 | I | Must submit to BOTH tracks | Submission Strategy section covers Human Track (Google Form) + Agent Track (Moltbook m/buildx). |
| 8 | I | Leverage agent-auditor + deltaagent existing code | Trust Scorer adapted from agent-auditor (4-axis scoring, 65-70% reuse). Demo Agent adapted from deltaagent (5-phase cycle, pattern reuse). |
| 9 | I | Agentic Wallet as single identity | Agent wallet ties trust scores + decision logs + trades together. All operations use same wallet address. |
| 10 | I | Uniswap integration as CORE architecture | Trust Scorer uses Uniswap pool data for risk analysis. Demo Agent executes swaps via Uniswap Trading API. Both are core, not bolted on. |
| 11 | I | x402 gated trust reports | x402 middleware gates premium reports. USDG payment on X Layer. EIP-3009 settlement. |
| 12 | I | Skills Arena is primary submission | PRD Track field: Skills Arena (primary). Demo script leads with skills, demo agent is proof-of-concept. |
| 13 | I | Dual-arena narrative must not dilute | Risk #10 in register. Clear framing: skills first, agent second. |
| 14 | I | Demo must feel like the real product | Dashboard is a full web app, not a prototype. Real-time data, real trades, real on-chain logs. |
| 15 | I | Target 4+ special prizes | Best MCP (MCP server), Best Data Analyst (trust scoring), Most Innovative (zero competitors), Best Uniswap (pool analysis + swaps). |
| 16 | A | Agent Track voting requirement | Build script includes: agent votes on 5 other m/buildx projects. |
| 17 | A | Post on X with #onchainos @XLayerOfficial | Submission checklist includes X post. |
| 18 | A | Pre-seed with real X Layer agent data | Seed script creates realistic agent data. Demo Prerequisites table specifies exact state. |
