# Technical Spike — Omnispect-X

## Verified Patterns (copy these into Architecture Doc)

| # | Component | Pattern | Source | Confidence |
|---|-----------|---------|--------|:---:|
| 1 | OnchainOS Install | `npx skills add okx/onchainos-skills` or `onchainos` CLI | github.com/okx/onchainos-skills | HIGH |
| 2 | OKX Auth (HMAC) | `HMAC-SHA256(SECRET_KEY, timestamp+METHOD+path+body)` base64, headers: OK-ACCESS-KEY, OK-ACCESS-SIGN, OK-ACCESS-TIMESTAMP, OK-ACCESS-PASSPHRASE | Helios: helioslabs-ai/helios okx-client.ts | HIGH |
| 3 | MCP Server | `claude mcp add --scope user onchainos-cli onchainos mcp` | okx/onchainos-skills README | HIGH |
| 4 | Agentic Wallet CLI | `onchainos wallet login/verify/balance/send/contract-call/history/sign-message/addresses` | okx/onchainos-skills/skills/okx-agentic-wallet/SKILL.md | HIGH |
| 5 | okx-dex-swap | `onchainos swap execute --from <addr> --to <addr> --readable-amount 1.5 --chain xlayer` | okx/onchainos-skills/skills/okx-dex-swap/SKILL.md | HIGH |
| 6 | okx-dex-swap Direct API | `GET /api/v6/dex/aggregator/quote?chainIndex=196&...` + `/swap` + `/approve-transaction` | Helios: okx-dex-swap.ts | HIGH |
| 7 | okx-security | `onchainos security token-scan --address <addr> --chain xlayer` returns riskLevel + isHoneypot | okx/onchainos-skills/skills/okx-security/SKILL.md | HIGH |
| 8 | okx-dex-signal | `onchainos tracker activities --tracker-type smart_money --chain xlayer` + `onchainos signal list` | okx/onchainos-skills/skills/okx-dex-signal/SKILL.md | HIGH |
| 9 | okx-dex-token | `onchainos token info/price-info/holders/liquidity --address <addr>` | okx/onchainos-skills/skills/okx-dex-token/SKILL.md | HIGH |
| 10 | okx-dex-market | `onchainos market price/kline/portfolio-overview --address <addr>` | okx/onchainos-skills/skills/okx-dex-market/SKILL.md | HIGH |
| 11 | okx-wallet-portfolio | `onchainos portfolio total-value/all-balances --address <addr> --chains xlayer` | okx/onchainos-skills/skills/okx-wallet-portfolio/SKILL.md | HIGH |
| 12 | okx-onchain-gateway | `onchainos gateway gas/simulate/broadcast --chain xlayer` | okx/onchainos-skills/skills/okx-onchain-gateway/SKILL.md | HIGH |
| 13 | okx-x402-payment | `onchainos payment x402-pay --accepts '[{...}]'` + EIP-3009 sign | okx/onchainos-skills/skills/okx-x402-payment/SKILL.md | HIGH |
| 14 | Uniswap V3 on X Layer | Factory: 0x4b2ab38dbf28d31d467aa8993f6c2585981d6804, SwapRouter02: 0x4f0c28f5926afda16bf2506d5d9e57ea190f9bca | Uniswap SDK addresses.ts | HIGH |
| 15 | Uniswap V4 on X Layer | PoolManager: 0x360e68faccca8ca495c1b759fd9eee466db9fb32 | Uniswap SDK addresses.ts | HIGH |
| 16 | Uniswap Trading API | `POST https://trade-api.gateway.uniswap.org/v1/quote` supports chain 196 | api-docs.uniswap.org | HIGH |
| 17 | Uniswap AI Skills | `npx skills add Uniswap/uniswap-ai` — 7 skills across 5 plugins | github.com/Uniswap/uniswap-ai | HIGH |
| 18 | Lineage Contract | Linked-list per agent via prevDecisionId, hybrid on-chain + IPFS | Designed from ERC-7512 + Autonolas patterns | HIGH |
| 19 | USDG on X Layer | Address: 0x4ae46a509f6b1d9056937ba4500cb143933d2dc8 | Helios x402 code | HIGH |
| 20 | Native token (EVM) | 0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee for OKB on X Layer | okx-dex-swap SKILL.md | HIGH |

## Newly Verified Patterns (from late x402 research agent)

| # | Component | Pattern | Source | Confidence |
|---|-----------|---------|--------|:---:|
| 21 | OKX x402 Facilitator | `https://web3.okx.com/api/v6/x402/{verify,settle}` with HMAC auth. OKX runs its own facilitator — x402 Foundation only supports Base/Solana, NOT X Layer. | Sponsir competitor repo (github.com/ArthurChou-creator/sponsir) | HIGH |
| 22 | x402 Express Middleware | `@x402/express` package wraps Express routes with 402 payment gating | x402 Foundation GitHub examples | HIGH |
| 23 | x402 MCP Wrapper | `@x402/mcp` + `createPaymentWrapper()` gates MCP tools behind micropayments | github.com/x402-foundation/x402/tree/main/examples/typescript/servers/mcp | HIGH |
| 24 | USDC on X Layer | Address: `0x74b7f16337b8972027f6196a17a631ac6de26d22` | Sponsir competitor code | HIGH |
| 25 | Agentic Wallet TEE | Private keys in TEE secure enclave, never exposed. Gas-free on X Layer via built-in sponsorship. | github.com/okx/onchainos-skills | HIGH |
| 26 | MCP SDK | `@modelcontextprotocol/sdk` v1.29.0, `McpServer` class + `server.tool()` with zod schemas | MCP SDK docs | HIGH |

## Unverified Patterns (use with caution)

| # | Component | Pattern | Source | Risk |
|---|-----------|---------|--------|------|
| 1 | Sandbox API keys | Built-in sandbox keys for testing without credentials | onchainos README mention | May not work for mainnet txs |

## Assumed / Not Found (need decision trees)

| # | Component | What's Unknown | Fallback |
|---|-----------|---------------|----------|
| 1 | Uniswap pool data on X Layer | Which pools exist, TVL, specific token pairs | Use okx-dex-token liquidity + okx-dex-market for pool data instead |
| 2 | x402 full server setup | Exact Express middleware for x402 gating | Implement from x402 spec + Helios patterns |
| 3 | Genesis Protocol journal | Their exact contract design (no public repo found) | Our design is independent and more complete |

## Key Architecture Decisions (from spike)

### Integration Mode: Direct HTTP API (not CLI)
The OnchainOS CLI (`onchainos` commands) is designed for AI coding assistants. For our backend service, we use the **Direct HTTP API** with HMAC auth. This is what Helios does and gives us full control over request/response handling.

However, for the **MCP server exposure** (Best MCP Integration prize), we expose our skills via MCP tools that wrap the HTTP API.

### Swap Execution: OKX DEX Aggregator (primary) + Uniswap Trading API (secondary)
- **Primary:** `okx-dex-swap` aggregates 500+ liquidity sources including Uniswap on X Layer
- **Secondary:** Uniswap Trading API for pool-specific analysis and Best Uniswap Integration prize
- Both are verified available on X Layer (chain 196)

### Lineage Logger: Hybrid On-chain + IPFS
- Structured data (agent, decisionId, prevId, actionType, txHash, timestamp) on-chain
- Reasoning text as IPFS URI + keccak256 hash on-chain for verification
- Events with 3 indexed params for efficient subgraph indexing
- Gas per log: ~80,000-100,000 gas = ~$0.0005 on X Layer

### Trust Scorer: Adapt agent-auditor's 4-axis model
- Reuse: 4-axis scoring (tx patterns, contract interactions, fund flow, behavioral consistency)
- Adapt: Replace Blockscout/RPC calls with OnchainOS skills (wallet-portfolio, security, dex-signal, dex-token)
- Replace: Venice AI LLM with direct scoring (no external LLM dependency for hackathon)

### Demo Agent: Adapt deltaagent's decision loop
- Reuse: Signal collection → LLM analysis → safety checks → execution → state update cycle
- Adapt: Replace Aave V3 with OKX DEX swap, replace Bitfinex with okx-dex-market
- Add: Decision lineage logging at every cycle step

## Existing Code Reuse Assessment

### agent-auditor (HIGH reuse)
- Location: /Users/MAC/hackathon-toolkit/active/agent-auditor/
- **Reuse directly:** 4-axis trust scoring algorithm (breakdown.ts), behavioral profiling (behavioral-profile.ts), entity classification, recommendation logic (SAFE/CAUTION/BLOCKLIST)
- **Adapt:** Replace Blockscout API calls with OnchainOS API calls, replace Venice AI with simplified scoring
- **Drop:** Telegram bot, Olas discovery, ERC-8004 client, Solana support, autonomous loop scanner
- **UI components reusable:** TrustScoreCard, DossierCard, AgentTypeShape

### deltaagent (MEDIUM reuse)
- Location: /Users/MAC/hackathon-toolkit/active/deltaagent/
- **Reuse pattern:** 5-phase decision loop (signal → analyze → gate → execute → report)
- **Adapt:** Replace all Aave/Velora execution with OKX DEX swap, replace signal sources with OnchainOS skills
- **Reuse:** Config management pattern, safety check gates (confidence floor, circuit breaker), position tracking pattern
- **Drop:** Aave-specific code, WDK setup, Tether integration, leverage math
