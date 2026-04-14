# Omnispect-X Implementation Plan

**Project:** Omnispect-X
**Hackathon:** OKX Build X Hackathon Season 2
**Deadline:** April 15, 2026 23:59 UTC (~1.5 build days remaining)
**Stack:** TypeScript, Solidity, Bun, Hono, Next.js 14, Foundry
**Architecture Doc:** `/Users/MAC/okx-buildx/omnispect-x/ARCHITECTURE.md` (THE source of truth for all code)

---

## How to Use This Plan

1. Read in order. Do not skip phases. Do not reorder tasks.
2. Every phase has a GATE checklist. Verify every item before proceeding.
3. When you see 🔀 (decision point), test BOTH paths and follow the one that matches.
4. Copy code from ARCHITECTURE.md — do not improvise.
5. Commit after every task using the specified commit messages.
6. Save deployed addresses / credentials to .env immediately.
7. If something fails and isn't covered by a decision tree: STOP. Report the error. Do not guess.
8. **VERIFY-MILESTONE tasks are mandatory** — they appear at phase boundaries and cannot be skipped. Failure stops the plan.
9. **seed-demo.ts** must be implemented before any demo-related phase. Run it before every E2E test.
10. **forge snapshot** must be run after initial contract deployment. This establishes the gas baseline for `forge snapshot --check` in debug.

---

## Phase Overview

| Phase | Purpose | Est. Time | Depends On |
|:---:|---------|-----------|-----------|
| 0 | Project scaffolding, dependencies, environment | 30 min | — |
| 1 | Foundation: Shared types + Smart contract + Deploy + Test | 1.5 hr | Phase 0 |
| 2 | Clients + Core Services: OKX client, Uniswap client, Trust Scorer, Lineage Query, x402 | 2 hr | Phase 1 |
| 3 | Agent + Server: Demo Agent, MCP, WebSocket, API entry point | 1.5 hr | Phase 2 |
| 4 | Dashboard: All frontend pages + components | 2 hr | Phase 3 |
| 5 | Integration, Seed, Polish, Submission | 1.5 hr | Phase 4 |
| **Total** | | **9 hr** | |

---

## Phase 0: Project Scaffolding

**Purpose:** Create project structure, install all dependencies, configure environment.
**Estimated time:** 30 minutes

### Task 0.1: Initialize Project Directory & Root Package

**Files:**
- Create: `package.json` (from ARCHITECTURE.md Section 15)
- Create: `tsconfig.json` (from ARCHITECTURE.md Section 15)
- Create: `.env.example` (from ARCHITECTURE.md Section 15)
- Create: `.env` (copy from .env.example, fill real values)

**Steps:**

1. Create root directory and initialize:
   ```bash
   cd /Users/MAC/okx-buildx/omnispect-x
   mkdir -p src/{types,lib,services,middleware,server} contracts/{src,script,test} frontend scripts
   ```

2. Copy `package.json` from ARCHITECTURE.md Section 15 exactly:
   ```bash
   # Write package.json from ARCHITECTURE.md Section 15
   ```
   Expected: `package.json` with all dependencies listed (hono, viem, zod, @modelcontextprotocol/sdk, recharts, etc.)

3. Copy `tsconfig.json` from ARCHITECTURE.md Section 15 exactly.

4. Copy `.env.example` from ARCHITECTURE.md Section 15 exactly.

5. Create `.env` from `.env.example` and fill in real credentials:
   ```bash
   cp .env.example .env
   # Fill in: OKX_API_KEY, OKX_SECRET_KEY, OKX_PASSPHRASE, PINATA_JWT, AGENT_PRIVATE_KEY
   ```

6. Install dependencies:
   ```bash
   bun install
   ```
   Expected: `bun.lockb` created, no errors.

**Commit:**
```bash
git init
git add package.json tsconfig.json .env.example .gitignore
git commit -m "chore: scaffold omnispect-x project structure"
```

---

### Task 0.2: Initialize Foundry Project

**Files:**
- Create: `contracts/foundry.toml` (from ARCHITECTURE.md Section 4)

**Steps:**

1. Initialize Foundry inside `contracts/`:
   ```bash
   cd contracts
   forge init --no-git --no-commit
   ```
   Expected: `foundry.toml`, `src/`, `script/`, `test/` directories created.

2. Replace the default `foundry.toml` with the one from ARCHITECTURE.md Section 4:
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
   xlayer = { key = "${ETHERSCAN_API_KEY}", url = "https://www.okx.com/explorer/xlayer/api" }
   ```

3. Remove default Counter.sol files:
   ```bash
   rm -f src/Counter.sol test/Counter.t.sol script/Counter.s.sol
   ```

4. Install OpenZeppelin (needed for contract patterns):
   ```bash
   forge install OpenZeppelin/openzeppelin-contracts --no-git --no-commit
   ```

**Commit:**
```bash
cd /Users/MAC/okx-buildx/omnispect-x
git add contracts/foundry.toml
git commit -m "chore: initialize foundry project for DecisionLineageLogger"
```

---

### Task 0.3: Initialize Frontend (Next.js)

**Files:**
- Create: `frontend/package.json` (from ARCHITECTURE.md Section 14)
- Create: `frontend/next.config.js` (from ARCHITECTURE.md Section 14)
- Create: `frontend/tailwind.config.ts` (from ARCHITECTURE.md Section 14)

**Steps:**

1. Copy `frontend/package.json` from ARCHITECTURE.md Section 14 exactly.

2. Copy `frontend/next.config.js` from ARCHITECTURE.md Section 14 exactly.

3. Copy `frontend/tailwind.config.ts` from ARCHITECTURE.md Section 14 exactly.

4. Create frontend app directory structure:
   ```bash
   mkdir -p frontend/app/{trust,lineage,monitor,compare} frontend/components frontend/lib
   ```

5. Install frontend dependencies:
   ```bash
   cd frontend && bun install && cd ..
   ```
   Expected: `bun.lockb` created in frontend/, no errors.

**Commit:**
```bash
git add frontend/package.json frontend/next.config.js frontend/tailwind.config.ts
git commit -m "chore: initialize next.js 14 frontend with tailwind"
```

---

### Phase 0 Gate

Before proceeding to Phase 1, verify:
- [ ] `bun install` completes without errors in root
- [ ] `bun install` completes without errors in `frontend/`
- [ ] `forge build` runs without errors in `contracts/` (empty project)
- [ ] `.env` file exists with OKX_API_KEY, OKX_SECRET_KEY, OKX_PASSPHRASE filled
- [ ] Directory structure matches ARCHITECTURE.md Section 1 file tree
- [ ] All commits made for Phase 0

**If any check fails: DO NOT proceed. Fix the failing check first.**

---

## Phase 1: Foundation — Types + Smart Contract

**Purpose:** Write shared types, deploy the lineage contract, establish on-chain foundation.
**Estimated time:** 1.5 hours

### Task 1.1: Write Shared Types

**Files:**
- Create: `src/types/index.ts` (from ARCHITECTURE.md Section 3)

**Steps:**

1. Copy the COMPLETE `src/types/index.ts` from ARCHITECTURE.md Section 3. This includes all types:
   - `ActionType` enum (7 values: SWAP, TRANSFER, APPROVE, STAKE, UNSTAKE, BRIDGE, OTHER)
   - `Finding`, `DimensionScore`, `UniswapRiskAssessment`, `TrustScoreRequest`, `TrustScoreResponse`
   - `DecisionNode`, `ReasoningPayload`, `AgentStats`
   - `OKXResponse<T>`, `PortfolioValue`, `TokenBalance`, `SecurityReport`, `SmartMoneyActivity`, `Signal`
   - `TokenInfo`, `HolderInfo`, `LiquidityInfo`, `PriceInfo`, `KlineData`
   - `SwapQuoteParams`, `SwapQuote`, `SwapParams`, `SwapResult`, `GasEstimate`
   - `UniswapQuote`, `PoolRiskAssessment`
   - `AgentConfig`, `AgentState`, `Position`, `CycleEvent`
   - `WSMessage`, `PaymentRequirements`, `AppConfig`

2. Verify the file compiles:
   ```bash
   bunx tsc --noEmit src/types/index.ts
   ```
   Expected: No errors.

**Commit:**
```bash
git add src/types/index.ts
git commit -m "feat(types): add all shared TypeScript interfaces and enums"
```

---

### Task 1.2: Write Config Module

**Files:**
- Create: `src/config.ts` (from ARCHITECTURE.md Section 13)

**Steps:**

1. Copy `src/config.ts` from ARCHITECTURE.md Section 13 exactly. This reads all env vars and exports the `AppConfig` object.

2. Verify it compiles:
   ```bash
   bunx tsc --noEmit src/config.ts
   ```
   Expected: No errors.

**Commit:**
```bash
git add src/config.ts
git commit -m "feat(config): add environment config loader"
```

---

### Task 1.3: Write Smart Contract

**Files:**
- Create: `contracts/src/DecisionLineageLogger.sol` (from ARCHITECTURE.md Section 4)

**Steps:**

1. Copy the COMPLETE `contracts/src/DecisionLineageLogger.sol` from ARCHITECTURE.md Section 4. Key contents:
   - `Decision` struct: `decisionId`, `agentAddress`, `prevDecisionId`, `reasoningHash`, `actionType`, `resultingTxHash`, `timestamp`, `blockNumber`
   - Mappings: `decisions`, `agentDecisionIds`, `registeredAgents`, `agentMetadata`
   - Events: `AgentRegistered`, `DecisionLogged`
   - Errors: `NotRegistered`, `DecisionAlreadyExists`, `AlreadyRegistered`, `InvalidDecisionId`
   - Functions: `registerAgent`, `logDecision` (auto-links prevDecisionId), `getDecision`, `getAgentDecisionChain` (paginated), `getAgentDecisionCount`, `isRegistered`

2. Compile the contract:
   ```bash
   cd contracts && forge build
   ```
   Expected: `Compiler run successful!` with no errors.

#### 🔀 Decision Point: Contract Compilation

Run: `cd contracts && forge build`
Expected: `Compiler run successful!`

✅ **If it works:** Continue to Task 1.4.

🔀 **If you get `Error: Solc ...` or import errors:**
1. Check Solidity version matches `0.8.24` in foundry.toml
2. If OpenZeppelin imports fail: `forge install OpenZeppelin/openzeppelin-contracts --no-git --no-commit`
3. Re-run: `forge build`

⛔ **If nothing works:**
1. Remove any OpenZeppelin imports — the contract doesn't actually need them
2. The contract is standalone (no inheritance)
3. Re-compile with `forge build`

**Commit:**
```bash
cd /Users/MAC/okx-buildx/omnispect-x
git add contracts/src/DecisionLineageLogger.sol
git commit -m "feat(contract): add DecisionLineageLogger with linked-list lineage"
```

---

### Task 1.4: Write Contract Tests

**Files:**
- Create: `contracts/test/DecisionLineageLogger.t.sol` (from ARCHITECTURE.md Section 4)

**Steps:**

1. Copy the COMPLETE test file from ARCHITECTURE.md Section 4. Tests cover:
   - `testRegisterAgent` — agent registration
   - `testLogDecision` — single decision logging
   - `testLogMultipleDecisions` — linked chain verification
   - `testGetAgentDecisionChain` — paginated retrieval
   - `testRevertNotRegistered` — access control
   - `testRevertDuplicateRegistration` — double-register prevention
   - `testRevertDuplicateDecision` — duplicate decision ID prevention

2. Run the tests:
   ```bash
   cd contracts && forge test -vvv
   ```
   Expected: All 7 tests pass. `Test result: ok. 7 passed;`

#### 🔀 Decision Point: Contract Tests

Run: `cd contracts && forge test -vvv`
Expected: `Test result: ok. 7 passed;`

✅ **If all pass:** Continue to Task 1.5.

🔀 **If tests fail with `setUp` errors:**
1. Check that the test contract inherits from `Test`
2. Ensure `vm.startPrank(agent)` is used for agent impersonation
3. Fix specific failing assertion and re-run

⛔ **If contract logic is wrong:**
1. Compare contract code byte-by-byte with ARCHITECTURE.md Section 4
2. The contract uses a linked-list pattern — `agentDecisionIds[msg.sender]` is an array
3. `logDecision` auto-sets `prevDecisionId` from the last entry in the agent's array

**Commit:**
```bash
cd /Users/MAC/okx-buildx/omnispect-x
git add contracts/test/DecisionLineageLogger.t.sol
git commit -m "test(contract): add 7 tests for DecisionLineageLogger"
```

---

### Task 1.5: Write Deploy Script

**Files:**
- Create: `contracts/script/Deploy.s.sol` (from ARCHITECTURE.md Section 4)

**Steps:**

1. Copy `contracts/script/Deploy.s.sol` from ARCHITECTURE.md Section 4 exactly.

2. Dry-run the deploy to verify script compiles:
   ```bash
   cd contracts && forge script script/Deploy.s.sol --rpc-url https://rpc.xlayer.tech
   ```
   Expected: Script compiles and simulates (will fail without broadcast key — that's expected).

**Commit:**
```bash
cd /Users/MAC/okx-buildx/omnispect-x
git add contracts/script/Deploy.s.sol
git commit -m "feat(deploy): add DecisionLineageLogger deploy script for X Layer"
```

---

### Task 1.6: Deploy Contract to X Layer

**Steps:**

1. Deploy using the agent's private key:
   ```bash
   cd contracts && forge script script/Deploy.s.sol \
     --rpc-url https://rpc.xlayer.tech \
     --private-key $AGENT_PRIVATE_KEY \
     --broadcast \
     -vvv
   ```
   Expected: Contract deployed. Output shows `Contract Address: 0x...`

2. **IMMEDIATELY** save the deployed address to `.env`:
   ```bash
   # Add to .env:
   LINEAGE_CONTRACT_ADDRESS=0x<deployed-address>
   ```

3. Verify the deployment:
   ```bash
   cast call $LINEAGE_CONTRACT_ADDRESS "getAgentDecisionCount(address)" $AGENT_ADDRESS --rpc-url https://rpc.xlayer.tech
   ```
   Expected: Returns `0` (no decisions logged yet).

#### 🔀 Decision Point: Contract Deployment

Run: Deploy command above
Expected: `Contract Address: 0x...` in output

✅ **If it works:** Save address to `.env`, continue to Task 1.7.

🔀 **If you get `insufficient funds`:**
1. Check agent wallet has OKB for gas: `cast balance $AGENT_ADDRESS --rpc-url https://rpc.xlayer.tech`
2. If zero: fund the agent wallet with OKB from your main wallet
3. X Layer gas is sub-cent — 0.01 OKB is plenty for deployment
4. Re-run deploy

🔀 **If you get `nonce too low`:**
1. Add `--slow` flag to the forge script command
2. Or: `cast nonce $AGENT_ADDRESS --rpc-url https://rpc.xlayer.tech` and pass `--nonce <value>`

⛔ **If RPC is down:**
1. Try alternative RPC: `https://xlayerrpc.okx.com`
2. If both fail: deploy locally with `anvil` for development, deploy to X Layer later
3. Use anvil fork: `anvil --fork-url https://rpc.xlayer.tech`

**Commit:**
```bash
cd /Users/MAC/okx-buildx/omnispect-x
git add .env.example
git commit -m "deploy(contract): DecisionLineageLogger live on X Layer"
```

---

### Task 1.7: Establish Gas Baseline

**Files:**
- Run: `forge snapshot` in contracts/

**Steps:**

1. Run gas snapshot:
   ```bash
   cd contracts && forge snapshot
   ```

2. Verify `.gas-snapshot` file created:
   ```bash
   cat .gas-snapshot
   ```
   Expected: Gas costs listed for each test function.

3. Commit the snapshot:
   ```bash
   cd /Users/MAC/okx-buildx/omnispect-x
   git add contracts/.gas-snapshot
   git commit -m "test(gas): establish gas baseline with forge snapshot"
   ```

**Gate:** `.gas-snapshot` file exists and is non-empty.

---

### Phase 1 Gate

Before proceeding to Phase 2, verify:
- [ ] `bunx tsc --noEmit src/types/index.ts` — no errors
- [ ] `bunx tsc --noEmit src/config.ts` — no errors
- [ ] `cd contracts && forge test -vvv` — all 7 tests pass
- [ ] Contract deployed to X Layer — address saved in `.env` as `LINEAGE_CONTRACT_ADDRESS`
- [ ] `cast call $LINEAGE_CONTRACT_ADDRESS "isRegistered(address)" $AGENT_ADDRESS --rpc-url https://rpc.xlayer.tech` returns `false`
- [ ] `.gas-snapshot` exists and is non-empty
- [ ] All commits made for Phase 1

**If any check fails: DO NOT proceed. Fix the failing check first.**

---

## Phase 2: Clients + Core Services

**Purpose:** Build the OKX client, Uniswap client, Trust Scorer, Lineage Query service, and x402 middleware.
**Estimated time:** 2 hours

### Task 2.1: Write OnchainOS HTTP Client

**Files:**
- Create: `src/lib/okx-client.ts` (from ARCHITECTURE.md Section 5)

**Steps:**

1. Copy the COMPLETE `src/lib/okx-client.ts` from ARCHITECTURE.md Section 5. Key contents:
   - `sign(timestamp, method, path, body)` — HMAC-SHA256 signing
   - `authHeaders(method, path, body)` — returns OKX auth headers
   - `okxGet<T>(path)` — base GET helper
   - 15 endpoint functions organized by skill:
     - wallet-portfolio: `getPortfolio`, `getTokenBalances`
     - security: `getTokenSecurity`
     - dex-signal: `getSmartMoneyActivities`
     - dex-token: `getTokenInfo`, `getTokenHolders`, `getTokenLiquidity`
     - dex-market: `getTokenPrice`, `getKlines`
     - dex-swap: `getSwapQuote`, `executeSwap`
     - onchain-gateway: `getGasEstimate`
   - Namespace export as `okxClient`

2. Verify compilation:
   ```bash
   bunx tsc --noEmit src/lib/okx-client.ts
   ```
   Expected: No errors.

3. Quick smoke test — hit a read-only endpoint:
   ```bash
   bun -e "
   import { okxClient } from './src/lib/okx-client';
   const result = await okxClient.getTokenPrice('196', '0xe538905cf8410324e03A5A23C1c177a474D59b2b');
   console.log(JSON.stringify(result, null, 2));
   "
   ```
   Expected: JSON response with OKB price data from OKX API.

#### 🔀 Decision Point: OKX API Connection

Run: Smoke test above
Expected: JSON with `code: "0"` and data array

✅ **If it works:** Continue to Task 2.2.

🔀 **If you get `401` or `Invalid signature`:**
1. Verify HMAC signing uses the exact format: `timestamp + method + path + body`
2. Check `OKX_API_KEY`, `OKX_SECRET_KEY`, `OKX_PASSPHRASE` in `.env` are correct
3. The timestamp must be ISO format: `new Date().toISOString()`
4. Ensure the API key has Web3 API permissions enabled in OKX Developer Portal
5. Re-run smoke test

🔀 **If you get `429` (rate limit):**
1. Add a 200ms delay between calls
2. OKX rate limit is typically 10 req/s per skill
3. Implement retry with exponential backoff in `okxGet`

⛔ **If OKX API is completely unreachable:**
1. Check network connectivity: `curl -I https://web3.okx.com/api/v6/dex/market/prices`
2. If down: create a mock response file `src/lib/__mocks__/okx-responses.json` with sample data
3. Continue building — replace with real calls when API recovers

**Commit:**
```bash
git add src/lib/okx-client.ts
git commit -m "feat(okx): add OnchainOS HTTP client with HMAC auth and 15 endpoints"
```

---

### Task 2.2: Write Uniswap Client

**Files:**
- Create: `src/lib/uniswap-client.ts` (from ARCHITECTURE.md Section 6)

**Steps:**

1. Copy the COMPLETE `src/lib/uniswap-client.ts` from ARCHITECTURE.md Section 6. Key contents:
   - `getQuote(params)` — POST to Uniswap Trading API `/v1/quote`
   - `getPoolRisk(tokenAddress, chainId)` — liquidity depth proxy via small vs large quote comparison
   - Namespace export as `uniswapClient`

2. Verify compilation:
   ```bash
   bunx tsc --noEmit src/lib/uniswap-client.ts
   ```

3. Smoke test the Uniswap API:
   ```bash
   bun -e "
   import { uniswapClient } from './src/lib/uniswap-client';
   const quote = await uniswapClient.getQuote({
     type: 'EXACT_INPUT',
     tokenIn: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
     tokenInChainId: 196,
     tokenOut: '0x4ae46a509f6b1d9056937ba4500cb143933d2dc8',
     tokenOutChainId: 196,
     amount: '1000000000000000',
     swapper: '0x0000000000000000000000000000000000000001'
   });
   console.log(JSON.stringify(quote, null, 2));
   "
   ```
   Expected: Uniswap quote response or error indicating no route.

#### 🔀 Decision Point: Uniswap Pool Availability on X Layer

Run: Uniswap smoke test above
Expected: Quote with `amountOut` value

✅ **If it returns a valid quote:** Uniswap pool exists for OKB/USDG. Continue to Task 2.3.

🔀 **If you get `No route found` or empty quote:**
1. Try different token pairs:
   - OKB → USDC: tokenOut = `0x74b7f16337b8972027f6196a17a631ac6de26d22`
   - WOKB → USDG: tokenIn = `0xe538905cf8410324e03A5A23C1c177a474D59b2b`
2. Try smaller amount: `100000000000000` (0.0001 OKB)
3. If no Uniswap pools have liquidity on X Layer: use OKX DEX aggregator as PRIMARY swap path
4. Update `uniswap-client.ts` to wrap OKX DEX swap as fallback
5. Keep `getPoolRisk` — it still works as liquidity analysis even if swaps go through OKX

⛔ **If Uniswap Trading API is unreachable:**
1. Verify URL: `curl -X POST https://trade-api.gateway.uniswap.org/v1/quote -H "Content-Type: application/json" -d '{"type":"EXACT_INPUT","tokenIn":"0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee","tokenInChainId":196,"tokenOut":"0x4ae46a509f6b1d9056937ba4500cb143933d2dc8","tokenOutChainId":196,"amount":"1000000000000000","swapper":"0x0000000000000000000000000000000000000001"}'`
2. If API is down: use OKX DEX aggregator exclusively for swaps
3. Stub `getPoolRisk` to return a default medium-risk assessment
4. Note in README: "Uniswap pool analysis available when Uniswap Trading API supports X Layer pools"

**Commit:**
```bash
git add src/lib/uniswap-client.ts
git commit -m "feat(uniswap): add Uniswap Trading API client with pool risk analysis"
```

---

### Task 2.3: Write Trust Scorer Service

**Files:**
- Create: `src/services/trust-scorer.ts` (from ARCHITECTURE.md Section 7)

**Steps:**

1. Copy the COMPLETE `src/services/trust-scorer.ts` from ARCHITECTURE.md Section 7. Key contents:
   - `scoreTrust(request)` — main entry point
   - 7 parallel `Promise.allSettled` calls for resilience
   - 4 data fetchers: `fetchSecurityForTokens`, `fetchPricesForTokens`, `fetchKlinesForTokens`, `fetchUniswapRisk`
   - 4 axis scorers (each 0-25, total 0-100):
     - `scoreTransactionPatterns` — portfolio diversity + activity recency
     - `scoreContractInteractions` — security report analysis
     - `scoreFundFlow` — price stability + liquidity
     - `scoreBehavioralConsistency` — kline pattern analysis
   - `clamp(val, min, max)` helper
   - `generateRecommendations(scores)` — SAFE/CAUTION/BLOCKLIST classification

2. Verify compilation:
   ```bash
   bunx tsc --noEmit src/services/trust-scorer.ts
   ```

3. Integration test — score a real address:
   ```bash
   bun -e "
   import { scoreTrust } from './src/services/trust-scorer';
   const result = await scoreTrust({
     targetAddress: '0xe538905cf8410324e03A5A23C1c177a474D59b2b',
     chainId: '196',
     requestedBy: 'test'
   });
   console.log('Total:', result.totalScore, '/', 100);
   console.log('Classification:', result.classification);
   console.log('Dimensions:', result.dimensions.map(d => d.name + ': ' + d.score + '/' + d.maxScore));
   "
   ```
   Expected: A trust score object with 4 dimension scores, total 0-100, and SAFE/CAUTION/BLOCKLIST classification.

#### 🔀 Decision Point: Trust Scorer Returns Meaningful Scores

Run: Integration test above
Expected: Non-zero scores across all 4 dimensions

✅ **If scores are differentiated (not all zero or all max):** Continue to Task 2.4.

🔀 **If all dimensions return 0:**
1. Check that `Promise.allSettled` results are being read correctly — extract `.value` from fulfilled results
2. If OKX API returns empty data for WOKB address, try a known active address on X Layer
3. The scorer uses `clamp()` — ensure it's `Math.min(max, Math.max(min, val))`

🔀 **If all dimensions return the same score:**
1. Verify each axis scorer reads DIFFERENT data (portfolio vs security vs prices vs klines)
2. Ensure the 4 fetchers are calling different OKX endpoints
3. This is PRD Risk #8 — pre-select agents with diverse behavior for demo

**Commit:**
```bash
git add src/services/trust-scorer.ts
git commit -m "feat(trust): add 4-axis trust scorer with OnchainOS + Uniswap data"
```

---

### Task 2.4: Write Lineage Query Service

**Files:**
- Create: `src/services/lineage-query.ts` (from ARCHITECTURE.md Section 8)

**Steps:**

1. Copy the COMPLETE `src/services/lineage-query.ts` from ARCHITECTURE.md Section 8. Key contents:
   - `LINEAGE_ABI` — read-only ABI subset (getDecision, getAgentDecisionChain, getAgentDecisionCount, isRegistered)
   - `publicClient` — viem client for X Layer RPC
   - `reasoningCache` — LRU Map (500 max entries)
   - `getReasoningText(ipfsHash)` — fetch reasoning from IPFS gateway with caching
   - `mapDecision(raw)` — transform contract struct to TypeScript type
   - `getDecisionChain(agentAddress, offset, limit)` — paginated chain with IPFS enrichment
   - `getDecision(decisionId)` — single decision lookup
   - `getAgentStats(agentAddress)` — aggregated statistics

2. Verify compilation:
   ```bash
   bunx tsc --noEmit src/services/lineage-query.ts
   ```

3. Test against deployed contract:
   ```bash
   bun -e "
   import { getAgentStats } from './src/services/lineage-query';
   const stats = await getAgentStats('$AGENT_ADDRESS');
   console.log(stats);
   "
   ```
   Expected: `{ totalDecisions: 0, ... }` (no decisions logged yet).

**Commit:**
```bash
git add src/services/lineage-query.ts
git commit -m "feat(lineage): add lineage query service with IPFS enrichment and LRU cache"
```

---

### Task 2.5: Write x402 Middleware

**Files:**
- Create: `src/middleware/x402.ts` (from ARCHITECTURE.md Section 10)

**Steps:**

1. Copy the COMPLETE `src/middleware/x402.ts` from ARCHITECTURE.md Section 10. This is tagged **[UNVERIFIED]**. Key contents:
   - `okxFacilitatorHeaders()` — HMAC auth for x402 verify/settle endpoints
   - `verifyPayment(paymentHeader)` — POST to `/api/v6/x402/verify`
   - `settlePayment(paymentHeader)` — POST to `/api/v6/x402/settle`
   - `x402Gate(priceUsdg, resourceUrl)` — Hono middleware factory that:
     - Checks for `X-Payment` header
     - Returns 402 with `PaymentRequirements` if missing
     - Verifies and settles payment if present
     - Continues to handler if payment valid

2. Verify compilation:
   ```bash
   bunx tsc --noEmit src/middleware/x402.ts
   ```

#### 🔀 Decision Point: x402 Pattern Validity (PRD Risk #4)

This is the key decision point for x402. The pattern is **[UNVERIFIED]**.

Run:
```bash
bun -e "
import { verifyPayment } from './src/middleware/x402';
try {
  const result = await verifyPayment('test-header');
  console.log('x402 verify response:', result);
} catch (e) {
  console.log('x402 verify error:', e.message);
}
"
```

Expected: Either a valid API response or a structured error.

✅ **If OKX x402 endpoints respond (even with error code):** The pattern works. Adjust based on actual response format.

🔀 **If you get `404 Not Found` or connection refused on /api/v6/x402/verify:**
1. x402 facilitator might not be at that path. Search OKX docs:
   ```bash
   curl -s https://web3.okx.com/api/v6/x402/verify -I
   ```
2. If endpoint doesn't exist: switch to **simple API key gating** as fallback:
   - Replace x402Gate with: check `Authorization: Bearer <key>` header
   - Return 402 response body as informational (tells the caller they WOULD need to pay)
   - This still demonstrates the x402 CONCEPT for judges
3. Update middleware code to use the fallback pattern
4. Note in README: "x402 gating ready — awaiting OKX facilitator endpoint activation"

⛔ **If nothing works:**
1. Make premium reports FREE for demo (remove middleware entirely from the premium route)
2. Keep the middleware code in the repo (shows intent)
3. Add a flag in `.env`: `X402_ENABLED=false`
4. Gate logic: `if (config.x402Enabled) { apply x402 } else { pass through }`

**Commit:**
```bash
git add src/middleware/x402.ts
git commit -m "feat(x402): add x402 micropayment middleware [UNVERIFIED]"
```

---

### Task 2.6: VERIFY-MILESTONE Checkpoint — Core Services

**Purpose:** Mid-build quality gate. Build cannot advance past this point until criteria pass.

**Steps:**

1. Verify all services compile:
   ```bash
   bunx tsc --noEmit src/types/index.ts src/config.ts src/lib/okx-client.ts src/lib/uniswap-client.ts src/services/trust-scorer.ts src/services/lineage-query.ts src/middleware/x402.ts
   ```

2. Verify contract tests pass:
   ```bash
   cd contracts && forge test -vvv
   ```

3. Verify trust scorer returns real data:
   ```bash
   bun -e "import { scoreTrust } from './src/services/trust-scorer'; const r = await scoreTrust({targetAddress:'0xe538905cf8410324e03A5A23C1c177a474D59b2b',chainId:'196',requestedBy:'test'}); console.log(r.totalScore, r.classification);"
   ```

**Gate (MANDATORY — cannot be skipped):**
- [ ] All TypeScript files compile without errors
- [ ] All 7 contract tests pass
- [ ] Trust scorer returns a non-error response with real dimension scores
- [ ] Lineage query service can read from deployed contract
- [ ] Contract deployed on X Layer and address in `.env`

**If gate fails:** STOP. Do not proceed to Phase 3. Fix the failing component.

---

### Phase 2 Gate

Before proceeding to Phase 3, verify:
- [ ] `src/lib/okx-client.ts` — compiles, smoke test returns OKX data
- [ ] `src/lib/uniswap-client.ts` — compiles, quote test runs (may return no-route for some pairs)
- [ ] `src/services/trust-scorer.ts` — compiles, returns 4-axis trust score
- [ ] `src/services/lineage-query.ts` — compiles, reads from deployed contract
- [ ] `src/middleware/x402.ts` — compiles (functionality may be fallback — see Decision Point)
- [ ] VERIFY-MILESTONE passed
- [ ] All commits made for Phase 2

---

## Phase 3: Agent + Server Layer

**Purpose:** Build Demo Trading Agent, MCP server, WebSocket server, and API entry point.
**Estimated time:** 1.5 hours

### Task 3.1: Write WebSocket Server

**Files:**
- Create: `src/server/ws.ts` (from ARCHITECTURE.md Section 12)

**Steps:**

1. Copy the COMPLETE `src/server/ws.ts` from ARCHITECTURE.md Section 12. Key contents:
   - `clients: Set<WebSocket>` — connected clients
   - `addClient(ws)` — add to set, remove on close
   - `broadcast(message: WSMessage)` — send to all connected clients
   - `getClientCount()` — return active count

2. Verify compilation:
   ```bash
   bunx tsc --noEmit src/server/ws.ts
   ```

**Commit:**
```bash
git add src/server/ws.ts
git commit -m "feat(ws): add WebSocket server for real-time agent event streaming"
```

---

### Task 3.2: Write Demo Trading Agent

**Files:**
- Create: `src/services/demo-agent.ts` (from ARCHITECTURE.md Section 9)

**Steps:**

1. Copy the COMPLETE `src/services/demo-agent.ts` from ARCHITECTURE.md Section 9. Key contents:
   - `LINEAGE_WRITE_ABI` — write ABI subset (registerAgent, logDecision)
   - viem `walletClient` + `publicClient` for X Layer
   - `pinToIPFS(reasoning)` — pin JSON to Pinata, return CID
   - `logDecisionOnChain(decisionId, reasoningHash, actionType, txHash)` — write to contract
   - `DEFAULT_CONFIG` — agent config defaults
   - Mutable `state: AgentState`
   - `emit(event: CycleEvent)` — broadcast via WebSocket
   - `runCycle()` — the 5-phase loop:
     1. **Signal:** call `okxClient.getSmartMoneyActivities('196')` for whale signals
     2. **Analyze:** `analyzeSignal(signal)` — confidence scoring based on amount, recency
     3. **Trust-Gate:** `scoreTrust(signal.tokenAddress)` — reject if < threshold
     4. **Execute:** `okxClient.getSwapQuote()` + `okxClient.executeSwap()` — real swap on X Layer
     5. **Log Lineage:** `pinToIPFS(reasoning)` + `logDecisionOnChain(...)` — immutable record
   - `analyzeSignal(signal)` — confidence scoring helper
   - `scheduleCycle()` — setInterval wrapper
   - `startAgent(config?)` — initialize + register agent on contract if needed
   - `stopAgent()` — clear interval
   - `getAgentState()` — return current state

2. Verify compilation:
   ```bash
   bunx tsc --noEmit src/services/demo-agent.ts
   ```

#### 🔀 Decision Point: Agent Trade Execution (PRD Risk #3)

After implementing, test a single cycle without live trading:

```bash
bun -e "
import { startAgent, stopAgent, getAgentState } from './src/services/demo-agent';
// Start with dryRun to test everything except actual swap
await startAgent({ ...getAgentState().config, dryRun: true });
// Wait for one cycle
await new Promise(r => setTimeout(r, 15000));
const state = getAgentState();
console.log('Cycles:', state.cycleCount, 'Last event:', state.lastCycleEvent);
stopAgent();
"
```

✅ **If agent completes a cycle with signal → analyze → trust-gate → log (even without real swap):** Continue.

🔀 **If no smart money signals found on X Layer:**
1. The whale tracker may not have data for chain 196 yet
2. Fallback: use `okxClient.getTokenPrice` to generate synthetic signals (price change > 5% = signal)
3. Modify `runCycle()` signal phase to use price data as fallback signal source
4. This is cosmetic for demo — the architecture still works

🔀 **If agent registration fails on contract:**
1. Check agent wallet has OKB for gas
2. Verify contract address is correct in `.env`
3. If already registered: catch `AlreadyRegistered` error and continue

**Commit:**
```bash
git add src/services/demo-agent.ts
git commit -m "feat(agent): add demo trading agent with 5-phase cycle and lineage logging"
```

---

### Task 3.3: Write MCP Server

**Files:**
- Create: `src/server/mcp.ts` (from ARCHITECTURE.md Section 11)

**Steps:**

1. Copy the COMPLETE `src/server/mcp.ts` from ARCHITECTURE.md Section 11. Key contents:
   - `McpServer` instance with name `"omnispect-x"`, version `"1.0.0"`
   - 3 tools registered:
     - `trust-score` — input: address, chainId → runs scoreTrust → returns TrustScoreResponse
     - `lineage-query` — input: agentAddress, limit → runs getDecisionChain → returns DecisionNode[]
     - `lineage-log` — stub that returns instructions (logging is demo-agent only)
   - `StdioServerTransport` for stdio communication
   - Main entry: `server.connect(transport)`

2. Verify compilation:
   ```bash
   bunx tsc --noEmit src/server/mcp.ts
   ```

3. Test MCP server starts:
   ```bash
   echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}' | timeout 5 bun run src/server/mcp.ts || true
   ```
   Expected: JSON-RPC response with server capabilities.

**Commit:**
```bash
git add src/server/mcp.ts
git commit -m "feat(mcp): add MCP server with trust-score, lineage-query, lineage-log tools"
```

---

### Task 3.4: Write API Entry Point (Hono Server)

**Files:**
- Create: `src/server/index.ts` (from ARCHITECTURE.md Section 13)

**Steps:**

1. Copy the COMPLETE `src/server/index.ts` from ARCHITECTURE.md Section 13. Key contents:
   - Hono app with CORS middleware
   - Routes:
     - `GET /health` — returns `{ status: "ok" }`
     - `GET /api/trust/:address` — calls `scoreTrust()`, returns trust report
     - `GET /api/trust/:address/premium` — x402 gated version
     - `GET /api/lineage/:address` — calls `getDecisionChain()`
     - `GET /api/lineage/:address/stats` — calls `getAgentStats()`
     - `GET /api/lineage/decision/:id` — calls `getDecision()`
     - `POST /api/agent/start` — calls `startAgent()`
     - `POST /api/agent/stop` — calls `stopAgent()`
     - `GET /api/agent/state` — calls `getAgentState()`
   - `Bun.serve` with WebSocket upgrade support

2. Start the server:
   ```bash
   bun run src/server/index.ts &
   sleep 2
   ```

3. Test health endpoint:
   ```bash
   curl http://localhost:3001/health
   ```
   Expected: `{"status":"ok"}`

4. Test trust score endpoint:
   ```bash
   curl http://localhost:3001/api/trust/0xe538905cf8410324e03A5A23C1c177a474D59b2b
   ```
   Expected: JSON trust score response with dimensions and classification.

5. Stop the server:
   ```bash
   kill %1 2>/dev/null || true
   ```

#### 🔀 Decision Point: API Server Startup

Run: `bun run src/server/index.ts`
Expected: Server starts on port 3001

✅ **If it starts and /health returns 200:** Continue to Phase 4.

🔀 **If port 3001 is in use:**
1. Kill existing process: `lsof -ti:3001 | xargs kill -9`
2. Re-run server

🔀 **If import errors:**
1. Check all file paths in imports match the actual file locations
2. Ensure `src/config.ts` exports correctly
3. Most common issue: circular imports — check demo-agent doesn't import from server

**Commit:**
```bash
git add src/server/index.ts
git commit -m "feat(api): add Hono API server with all routes and WebSocket support"
```

---

### Phase 3 Gate

Before proceeding to Phase 4, verify:
- [ ] `bun run src/server/index.ts` starts without errors
- [ ] `curl http://localhost:3001/health` returns `{"status":"ok"}`
- [ ] `curl http://localhost:3001/api/trust/0xe538905cf8410324e03A5A23C1c177a474D59b2b` returns trust score
- [ ] `curl http://localhost:3001/api/lineage/0xe538905cf8410324e03A5A23C1c177a474D59b2b` returns (empty) lineage
- [ ] All commits made for Phase 3

---

## Phase 4: Dashboard

**Purpose:** Build the Next.js frontend with all 4 views: Trust Score, Lineage Explorer, Agent Monitor, Multi-Agent Compare.
**Estimated time:** 2 hours

### Task 4.1: Write Frontend API Client

**Files:**
- Create: `frontend/lib/api.ts` (from ARCHITECTURE.md Section 14)

**Steps:**

1. Copy the COMPLETE `frontend/lib/api.ts` from ARCHITECTURE.md Section 14. Key contents:
   - `API_BASE` — `http://localhost:3001`
   - `fetchTrustScore(address)` — GET /api/trust/:address
   - `fetchLineage(address, limit?)` — GET /api/lineage/:address
   - `fetchAgentStats(address)` — GET /api/lineage/:address/stats
   - `fetchAgentState()` — GET /api/agent/state
   - `startAgent()` — POST /api/agent/start
   - `stopAgent()` — POST /api/agent/stop
   - `createWSConnection(onMessage, onClose?)` — WebSocket to ws://localhost:3001/ws with auto-reconnect

**Commit:**
```bash
git add frontend/lib/api.ts
git commit -m "feat(frontend): add API client with WebSocket auto-reconnect"
```

---

### Task 4.2: Write Global Layout + Styles

**Files:**
- Create: `frontend/app/layout.tsx` (from ARCHITECTURE.md Section 14)
- Create: `frontend/app/globals.css` (from ARCHITECTURE.md Section 14)

**Steps:**

1. Copy `frontend/app/layout.tsx` from ARCHITECTURE.md Section 14. Contains:
   - Nav bar with links: Trust Score, Lineage Explorer, Agent Monitor, Compare
   - Dark theme base styling
   - Responsive layout wrapper

2. Copy `frontend/app/globals.css` from ARCHITECTURE.md Section 14. Contains:
   - Tailwind imports
   - Custom CSS variables for dark theme
   - Animation keyframes

**Commit:**
```bash
git add frontend/app/layout.tsx frontend/app/globals.css
git commit -m "feat(frontend): add layout with navigation and dark theme"
```

---

### Task 4.3: Write Landing Page

**Files:**
- Create: `frontend/app/page.tsx` (from ARCHITECTURE.md Section 14)

**Steps:**

1. Copy `frontend/app/page.tsx` from ARCHITECTURE.md Section 14. Contains:
   - Hero section with tagline
   - Feature cards: Trust Scoring, Decision Lineage, Live Monitoring, Agent Comparison
   - CTA buttons linking to each feature page

**Commit:**
```bash
git add frontend/app/page.tsx
git commit -m "feat(frontend): add landing page with feature overview"
```

---

### Task 4.4: Write Radar Chart Component

**Files:**
- Create: `frontend/components/RadarChart.tsx` (from ARCHITECTURE.md Section 14)

**Steps:**

1. Copy the COMPLETE `RadarChart.tsx` from ARCHITECTURE.md Section 14. Uses Recharts RadarChart with:
   - 4 axes: Transaction Patterns, Contract Interactions, Fund Flow, Behavioral Consistency
   - Score out of 25 per axis
   - Custom colors and styling

**Commit:**
```bash
git add frontend/components/RadarChart.tsx
git commit -m "feat(frontend): add 4-axis radar chart component"
```

---

### Task 4.5: Write Trust Score Card + Page

**Files:**
- Create: `frontend/components/TrustScoreCard.tsx` (from ARCHITECTURE.md Section 14)
- Create: `frontend/app/trust/page.tsx` (from ARCHITECTURE.md Section 14)

**Steps:**

1. Copy `TrustScoreCard.tsx` — displays total score, classification badge (SAFE/CAUTION/BLOCKLIST), dimension breakdown, findings list.

2. Copy `frontend/app/trust/page.tsx` — address input form, triggers `fetchTrustScore`, displays `TrustScoreCard` + `RadarChart`.

3. Test:
   ```bash
   cd frontend && bun run dev &
   sleep 3
   curl http://localhost:3000/trust
   ```
   Expected: HTML response with the trust score page.

**Commit:**
```bash
git add frontend/components/TrustScoreCard.tsx frontend/app/trust/page.tsx
git commit -m "feat(frontend): add trust score lookup page with radar chart"
```

---

### Task 4.6: Write Decision Tree Component + Lineage Page (HERO FEATURE)

**Files:**
- Create: `frontend/components/DecisionTree.tsx` (from ARCHITECTURE.md Section 14)
- Create: `frontend/app/lineage/page.tsx` (from ARCHITECTURE.md Section 14)

**Steps:**

1. Copy the COMPLETE `DecisionTree.tsx` from ARCHITECTURE.md Section 14. This is the **hero feature** judges will remember. Contains:
   - Vertical linked-list visualization of decision nodes
   - Each node shows: action type (color-coded), timestamp, confidence score
   - Expandable node details: full reasoning text, signal data, tx hash with X Layer explorer link
   - Color coding by `ActionType`: SWAP=blue, TRANSFER=green, APPROVE=yellow, etc.
   - Smooth expand/collapse animations
   - Link to X Layer explorer: `https://www.okx.com/web3/explorer/xlayer/tx/{hash}`

2. Copy `frontend/app/lineage/page.tsx` — address input, triggers `fetchLineage`, displays `DecisionTree`.

3. **This is the most important UI component.** Verify it renders correctly with mock data if no real decisions exist yet.

**Commit:**
```bash
git add frontend/components/DecisionTree.tsx frontend/app/lineage/page.tsx
git commit -m "feat(frontend): add visual decision tree explorer (hero feature)"
```

---

### Task 4.7: Write Agent Monitor Component + Page

**Files:**
- Create: `frontend/components/AgentMonitor.tsx` (from ARCHITECTURE.md Section 14)
- Create: `frontend/app/monitor/page.tsx` (from ARCHITECTURE.md Section 14)

**Steps:**

1. Copy `AgentMonitor.tsx` — live event feed via WebSocket, start/stop buttons, cycle count, decision tree growing in real time.

2. Copy `frontend/app/monitor/page.tsx` — page wrapper for AgentMonitor.

**Commit:**
```bash
git add frontend/components/AgentMonitor.tsx frontend/app/monitor/page.tsx
git commit -m "feat(frontend): add live agent monitoring with WebSocket events"
```

---

### Task 4.8: Write Compare View + Page

**Files:**
- Create: `frontend/components/CompareView.tsx` (from ARCHITECTURE.md Section 14)
- Create: `frontend/app/compare/page.tsx` (from ARCHITECTURE.md Section 14)

**Steps:**

1. Copy `CompareView.tsx` — side-by-side comparison of up to 3 agents with radar chart overlay, classification badges.

2. Copy `frontend/app/compare/page.tsx` — page wrapper with 3 address input fields.

**Commit:**
```bash
git add frontend/components/CompareView.tsx frontend/app/compare/page.tsx
git commit -m "feat(frontend): add multi-agent comparison view"
```

---

### Task 4.9: Verify Dashboard End-to-End

**Steps:**

1. Start backend:
   ```bash
   cd /Users/MAC/okx-buildx/omnispect-x && bun run src/server/index.ts &
   ```

2. Start frontend:
   ```bash
   cd frontend && WATCHPACK_POLLING=true bun run dev -- --turbopack &
   ```

3. Open each page and verify rendering:
   ```bash
   curl -s http://localhost:3000 | head -20         # Landing page
   curl -s http://localhost:3000/trust | head -20    # Trust score page
   curl -s http://localhost:3000/lineage | head -20  # Lineage explorer
   curl -s http://localhost:3000/monitor | head -20  # Agent monitor
   curl -s http://localhost:3000/compare | head -20  # Compare view
   ```

4. Test trust score flow end-to-end:
   - Navigate to /trust
   - Enter address: `0xe538905cf8410324e03A5A23C1c177a474D59b2b`
   - Verify radar chart renders with real scores

5. Stop servers:
   ```bash
   kill %1 %2 2>/dev/null || true
   ```

#### 🔀 Decision Point: Frontend Rendering

✅ **If all 5 pages render:** Continue to Phase 5.

🔀 **If Recharts errors ("window is not defined"):**
1. Recharts requires client-side rendering. Ensure RadarChart.tsx has `"use client"` directive.
2. Wrap Recharts components in `dynamic(() => import(...), { ssr: false })` if needed.

🔀 **If CORS errors:**
1. Verify Hono CORS middleware is configured:
   ```typescript
   app.use('/*', cors({ origin: 'http://localhost:3000' }))
   ```
2. Check `frontend/next.config.js` has rewrite proxy if needed.

🔀 **If WebSocket connection fails:**
1. Check Bun.serve WebSocket upgrade handler in `src/server/index.ts`
2. Ensure WS URL matches: `ws://localhost:3001/ws`
3. Test raw WS: `websocat ws://localhost:3001/ws`

**Commit:**
```bash
cd /Users/MAC/okx-buildx/omnispect-x
git add frontend/
git commit -m "feat(frontend): complete dashboard with all 5 pages verified"
```

---

### Phase 4 Gate

Before proceeding to Phase 5, verify:
- [ ] `cd frontend && bun run build` completes without errors
- [ ] All 5 pages render (landing, trust, lineage, monitor, compare)
- [ ] Trust score lookup returns real data from backend
- [ ] Decision tree component renders (even with empty data)
- [ ] WebSocket connection established on /monitor page
- [ ] All commits made for Phase 4

---

## Phase 5: Integration, Seed, Polish

**Purpose:** Wire everything together, seed demo data, polish for submission.
**Estimated time:** 1.5 hours

### Task 5.1: Implement Seed Demo Script

**Files:**
- Create: `scripts/seed-demo.ts` (from ARCHITECTURE.md Section 17)

**Steps:**

1. Copy the COMPLETE `scripts/seed-demo.ts` from ARCHITECTURE.md Section 17. Implements PRD Section 6 Demo Prerequisites:
   - Register demo agent on contract
   - Log 10-15 demo decisions with varied action types
   - Pin reasoning texts to IPFS
   - Create linked decision chain
   - Pre-compute trust scores for 3-4 addresses

2. Run the seed script:
   ```bash
   bun run scripts/seed-demo.ts
   ```
   Expected: Output showing each seeded decision ID, IPFS hashes, and final summary.

3. Verify seeded data:
   ```bash
   curl http://localhost:3001/api/lineage/$AGENT_ADDRESS
   ```
   Expected: Array of 10-15 decision nodes with reasoning text.

#### 🔀 Decision Point: Seed Script Success

Run: `bun run scripts/seed-demo.ts`
Expected: 10-15 decisions logged with IPFS reasoning

✅ **If all decisions logged:** Continue.

🔀 **If IPFS pinning fails (Pinata):**
1. Check `PINATA_JWT` in `.env` is valid
2. Verify Pinata free tier hasn't exceeded: `curl -H "Authorization: Bearer $PINATA_JWT" https://api.pinata.cloud/data/userPinnedDataTotal`
3. Fallback: store reasoning in a local JSON file and use hash of content as `reasoningHash`
4. The lineage contract doesn't validate IPFS hashes — any bytes32 works

🔀 **If on-chain logging fails with "insufficient gas":**
1. Fund agent wallet with more OKB (0.1 OKB covers 100+ transactions)
2. Each `logDecision` call costs ~100K gas = ~$0.0005 on X Layer

🔀 **If `registerAgent` reverts with `AlreadyRegistered`:**
1. This is expected if you've already registered in Phase 1 testing
2. Wrap registration in try-catch, continue if already registered

**Commit:**
```bash
git add scripts/seed-demo.ts
git commit -m "seed(demo): implement seed-demo.ts from PRD §6 Demo Prerequisites"
```

---

### Task 5.2: Write Tests

**Files:**
- Create: `src/__tests__/trust-scorer.test.ts` (from ARCHITECTURE.md Section 16)
- Create: `src/__tests__/api.test.ts` (from ARCHITECTURE.md Section 16)

**Steps:**

1. Copy `trust-scorer.test.ts` from ARCHITECTURE.md Section 16. Contains 5 tests:
   - Returns valid score structure
   - All dimensions are 0-25
   - Total equals sum of dimensions
   - Classification is SAFE/CAUTION/BLOCKLIST
   - Handles invalid address gracefully

2. Copy `api.test.ts` from ARCHITECTURE.md Section 16. Contains 6 integration tests:
   - /health returns 200
   - /api/trust/:address returns trust score
   - /api/lineage/:address returns array
   - /api/lineage/:address/stats returns stats
   - /api/agent/state returns agent state
   - 404 for unknown routes

3. Run tests:
   ```bash
   bun test
   ```
   Expected: All 11 tests pass.

**Commit:**
```bash
mkdir -p src/__tests__
git add src/__tests__/
git commit -m "test: add trust scorer unit tests and API integration tests"
```

---

### Task 5.3: Write Start Script

**Files:**
- Create: `scripts/start.ts` (from ARCHITECTURE.md Section 15 — referenced in package.json scripts)

**Steps:**

1. Create a simple start script that boots both backend and frontend:
   ```typescript
   // scripts/start.ts
   import { $ } from "bun";
   console.log("Starting Omnispect-X...");
   console.log("Backend: http://localhost:3001");
   console.log("Frontend: http://localhost:3000");
   await Promise.all([
     $`bun run src/server/index.ts`,
     $`cd frontend && bun run dev`,
   ]);
   ```

**Commit:**
```bash
git add scripts/start.ts
git commit -m "chore: add combined start script for dev"
```

---

### Task 5.4: Write README.md

**Files:**
- Create: `README.md`

**Steps:**

1. Write README with:
   - Project title + one-liner
   - Problem statement (the $1.4B stat)
   - Architecture diagram (from PRD Section 2)
   - OnchainOS skills used (list all 9)
   - Uniswap integration details
   - Setup instructions (clone, install, env, deploy contract, run)
   - Demo video link (placeholder)
   - Screenshots (placeholder)
   - Tech stack table
   - License

2. **Critical for judging:** Prominently list all 9 OnchainOS skills and their usage. This directly addresses PRD Risk #11 (integration depth).

**Commit:**
```bash
git add README.md
git commit -m "docs: add comprehensive README with OnchainOS skill inventory"
```

---

### Task 5.5: End-to-End Verification

**Steps:**

1. Start everything:
   ```bash
   bun run dev:all
   ```

2. Run the full demo flow:
   ```bash
   # Trust Score
   curl http://localhost:3001/api/trust/0xe538905cf8410324e03A5A23C1c177a474D59b2b | jq '.totalScore, .classification'

   # Lineage (should have seeded data)
   curl http://localhost:3001/api/lineage/$AGENT_ADDRESS | jq 'length'

   # Agent Stats
   curl http://localhost:3001/api/lineage/$AGENT_ADDRESS/stats | jq '.totalDecisions'

   # Start Agent
   curl -X POST http://localhost:3001/api/agent/start | jq '.status'

   # Wait for a cycle
   sleep 15

   # Check Agent State
   curl http://localhost:3001/api/agent/state | jq '.cycleCount, .lastCycleEvent'

   # Stop Agent
   curl -X POST http://localhost:3001/api/agent/stop | jq '.status'
   ```

3. Verify frontend pages load with real data at `http://localhost:3000`.

4. Verify decision tree renders with seeded data at `http://localhost:3000/lineage`.

5. Verify agent monitor shows real-time events at `http://localhost:3000/monitor`.

---

### Task 5.6: VERIFY-MILESTONE Checkpoint — Pre-Demo

**Purpose:** Final quality gate before demo recording and submission.

**Steps:**

1. Run all contract tests:
   ```bash
   cd contracts && forge test -vvv && forge snapshot --check
   ```

2. Run all TypeScript tests:
   ```bash
   cd /Users/MAC/okx-buildx/omnispect-x && bun test
   ```

3. Build frontend:
   ```bash
   cd frontend && bun run build
   ```

4. Verify MCP server starts:
   ```bash
   echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}' | timeout 5 bun run src/server/mcp.ts || true
   ```

**Gate (MANDATORY — cannot be skipped):**
- [ ] All 7 contract tests pass
- [ ] All 11 TypeScript tests pass
- [ ] `forge snapshot --check` — no gas regression > 10%
- [ ] Frontend builds without errors
- [ ] All 9 API routes return expected responses
- [ ] Seeded data visible in lineage explorer
- [ ] Decision tree hero feature renders with expandable nodes
- [ ] MCP server initializes correctly

**If gate fails:** STOP. Fix failing checks before demo/submission.

---

### Phase 5 Gate

Before submission, verify:
- [ ] All tests pass (contract + TypeScript)
- [ ] Full demo flow works end-to-end
- [ ] Seeded data shows rich lineage visualization
- [ ] Trust scores differentiate between addresses (PRD Risk #8)
- [ ] README lists all 9 OnchainOS skills
- [ ] All commits made and pushed

---

## Appendix: Quick Reference

### All Addresses

| Item | Address | Network |
|------|---------|---------|
| Uniswap V3 Factory | `0x4b2ab38dbf28d31d467aa8993f6c2585981d6804` | X Layer (196) |
| Uniswap V3 SwapRouter02 | `0x4f0c28f5926afda16bf2506d5d9e57ea190f9bca` | X Layer (196) |
| Uniswap V4 PoolManager | `0x360e68faccca8ca495c1b759fd9eee466db9fb32` | X Layer (196) |
| USDG | `0x4ae46a509f6b1d9056937ba4500cb143933d2dc8` | X Layer (196) |
| USDC | `0x74b7f16337b8972027f6196a17a631ac6de26d22` | X Layer (196) |
| WOKB | `0xe538905cf8410324e03A5A23C1c177a474D59b2b` | X Layer (196) |
| Native OKB | `0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee` | X Layer (196) |
| Lineage Logger | `DEPLOY_AND_RECORD_ADDRESS_HERE` | X Layer (196) |

### All Commands

| Phase | Task | Command | Purpose |
|:---:|:---:|---------|---------|
| 0 | 0.1 | `bun install` | Install root dependencies |
| 0 | 0.2 | `cd contracts && forge init --no-git --no-commit` | Initialize Foundry |
| 0 | 0.3 | `cd frontend && bun install` | Install frontend dependencies |
| 1 | 1.3 | `cd contracts && forge build` | Compile contract |
| 1 | 1.4 | `cd contracts && forge test -vvv` | Run contract tests |
| 1 | 1.6 | `forge script script/Deploy.s.sol --rpc-url https://rpc.xlayer.tech --private-key $AGENT_PRIVATE_KEY --broadcast` | Deploy to X Layer |
| 1 | 1.7 | `cd contracts && forge snapshot` | Gas baseline |
| 2 | 2.1 | `bun -e "import { okxClient } from './src/lib/okx-client'; ..."` | Smoke test OKX API |
| 2 | 2.2 | `bun -e "import { uniswapClient } from './src/lib/uniswap-client'; ..."` | Smoke test Uniswap |
| 2 | 2.3 | `bun -e "import { scoreTrust } from './src/services/trust-scorer'; ..."` | Test trust scorer |
| 3 | 3.4 | `bun run src/server/index.ts` | Start backend |
| 4 | 4.9 | `cd frontend && bun run dev` | Start frontend |
| 5 | 5.1 | `bun run scripts/seed-demo.ts` | Seed demo data |
| 5 | 5.2 | `bun test` | Run all tests |
| 5 | 5.5 | `bun run dev:all` | Start everything |

### Troubleshooting

| Error | Likely Cause | Fix |
|-------|-------------|-----|
| `401 Unauthorized` from OKX | Wrong API keys or HMAC signing | Verify `OKX_API_KEY`, `OKX_SECRET_KEY`, `OKX_PASSPHRASE` in `.env`. Check timestamp format is ISO. |
| `No route found` from Uniswap | No liquidity pool on X Layer for that pair | Use OKX DEX aggregator (`dex-swap` skill) as primary swap path |
| `insufficient funds for gas` | Agent wallet empty | Fund with OKB via main wallet. 0.01 OKB covers 20+ txs. |
| `AlreadyRegistered` from contract | Agent already registered | Catch error and continue — this is expected on re-runs |
| `ECONNREFUSED :3001` | Backend not running | Start with `bun run src/server/index.ts` |
| `window is not defined` | Server-side rendering of Recharts | Add `"use client"` directive to chart components |
| `CORS error` in browser | Hono CORS not configured | Ensure `app.use('/*', cors({ origin: 'http://localhost:3000' }))` |
| `forge build` fails | Wrong Solidity version | Check `foundry.toml` has `solc_version = "0.8.24"` |
| Pinata 401 | Invalid JWT | Regenerate at app.pinata.cloud, update `PINATA_JWT` in `.env` |
| WebSocket disconnects | Bun WS upgrade not configured | Check `Bun.serve` has `websocket` handler in `src/server/index.ts` |

### Architecture Doc Section → File Mapping

| ARCHITECTURE.md Section | File(s) Created | Phase.Task |
|---|---|:---:|
| Section 3 | `src/types/index.ts` | 1.1 |
| Section 13 (config) | `src/config.ts` | 1.2 |
| Section 4 | `contracts/src/DecisionLineageLogger.sol`, `Deploy.s.sol`, `.t.sol`, `foundry.toml` | 1.3-1.6 |
| Section 5 | `src/lib/okx-client.ts` | 2.1 |
| Section 6 | `src/lib/uniswap-client.ts` | 2.2 |
| Section 7 | `src/services/trust-scorer.ts` | 2.3 |
| Section 8 | `src/services/lineage-query.ts` | 2.4 |
| Section 10 | `src/middleware/x402.ts` | 2.5 |
| Section 12 | `src/server/ws.ts` | 3.1 |
| Section 9 | `src/services/demo-agent.ts` | 3.2 |
| Section 11 | `src/server/mcp.ts` | 3.3 |
| Section 13 (server) | `src/server/index.ts` | 3.4 |
| Section 14 | `frontend/` (15 files) | 4.1-4.8 |
| Section 15 | `package.json`, `tsconfig.json`, `.env.example` | 0.1 |
| Section 16 | `src/__tests__/*.test.ts` | 5.2 |
| Section 17 | `scripts/seed-demo.ts` | 5.1 |
