# OKX Build X S2 — Research Brief

## Hackathon Overview
- **Name:** OKX Build X Hackathon Season 2
- **Chain:** X Layer (Ethereum L2, ZK-rollup, Polygon CDK, Chain ID 196)
- **Deadline:** April 15, 2026 23:59 UTC (~47 hours from now)
- **Prize Pool:** 60,000 USDT (46K Human + 14K Agent Track)
- **Dual submission:** Same project can enter both Human Track (Google Form) + Agent Track (Moltbook)

## Key Technology Stack

### OnchainOS Skills (13 total)
| Skill | Category | Function |
|-------|----------|----------|
| okx-agentic-wallet | Core | Auth, balances, PnL, sends, history, contract calls |
| okx-wallet-portfolio | Core | Public address holdings across chains |
| okx-security | Safety | Token/DApp risk, phishing, approval management |
| okx-dex-market | Market | Live pricing, candlestick charts, index prices |
| okx-dex-signal | Intelligence | Smart money/whale/KOL tracking |
| okx-dex-trenches | Intelligence | Meme token analysis, pump.fun, dev reputation |
| okx-dex-ws | Data | Real-time WebSocket monitoring |
| okx-dex-swap | Trading | Token swap (500+ liquidity sources) |
| okx-dex-token | Data | Token search, metadata, holders, trending |
| okx-onchain-gateway | Infra | Gas estimation, simulation, broadcasting |
| okx-x402-payment | Payment | TEE-based payment for gated resources |
| okx-defi-invest | DeFi | DeFi deposits/withdrawals (Aave, Lido, PancakeSwap) |
| okx-defi-portfolio | DeFi | Cross-protocol position tracking |

### Agentic Wallet
- Email login, no seed phrase, TEE-secured keys
- Gas-free on X Layer
- Risk simulation on every tx
- Mandatory for all submissions

### x402 Protocol
- HTTP 402 → auto-pay via TEE wallet
- Settlement in USDG on X Layer
- EIP-3009 gasless transfers
- Key for "Best x402 Application" special prize

### Uniswap on X Layer
- Full Protocol + Web App + Wallet + Trading API
- Zero Uniswap Labs fees
- Key for "Best Uniswap Integration" special prize

### MCP Integration
- OnchainOS available via MCP server for Claude Code / Cursor
- Key for "Best MCP Integration" special prize

## Judging Criteria (each 25%)
1. **OnchainOS/Uniswap Integration & Innovation** — depth of usage, creative combos
2. **X Layer Ecosystem Fit** — real on-chain use cases on X Layer
3. **AI Interaction Experience** — AI makes on-chain ops smarter/more natural
4. **Product Completeness** — actually runs end-to-end, genuinely usable

## Judge Hints (from okx_ai on Moltbook)
1. "Proof surface should be declared up front" — repo, tx, demo, evaluation rule
2. "Decision-to-action lineage" — journal entries queryable against executed trades (THE key differentiator)
3. "Execution envelope" — wallet, tx history, demo tied to same agent identity
4. "Execution witness, not just rich logs" — each entry should carry final tx hash or intent id

## Competitive Intelligence

### Known Competitors

**Genesis Protocol** (0xcaptain888) — Skills Arena
- AI cognitive engine for composable Uniswap V4 Hook strategies
- 9 deployed contracts, 157+ mainnet txs
- 13 integrated skills (6 OnchainOS + 7 Uniswap)
- Live dApp, 72 decision journal entries on-chain
- okx_ai praised "decision-to-action lineage"
- THREAT: HIGH — deep integration, strong tx history, judge-praised

**Leigent** (leigent) — X Layer Arena
- Autonomous DeFi portfolio agent
- OnchainOS swap + wallet + x402
- okx_ai praised "execution envelope"
- THREAT: MEDIUM — solid execution but narrower scope

**SYMBIOSIS** (symbiosiseconomy) — X Layer Arena (marked spam)
- 7 autonomous agents, Dutch auctions, ELO reputation, x402
- 16 OKX OnchainOS skills
- THREAT: LOW-MEDIUM — marked as spam, likely disqualified

**Helios** — X Layer Arena (from GitHub)
- 4-agent autonomous DeFi economy
- Each agent has own TEE wallet
- All 14 OnchainOS skills, x402 inter-agent payments
- Uniswap Trading API, 30-min cycle loops
- THREAT: HIGH — comprehensive multi-agent system

### Category Assessment
| Category | Crowding | Risk |
|----------|----------|------|
| DeFi Portfolio Agent | HIGH | Leigent + Helios both here |
| Multi-Agent Economy | MEDIUM | Helios dominates, SYMBIOSIS spam |
| Uniswap V4 Hooks/Strategy | MEDIUM | Genesis Protocol strong |
| Agent Skills/Plugins | LOW | Genesis Protocol only serious competitor |
| x402 Micropayments | LOW | Special prize, few dedicated entries |
| Data/Analytics Agent | LOW | No visible competitors |
| MCP Integration | LOW | No visible competitors |
| Gaming/Social | VERY LOW | No competitors seen |

## Special Prize Opportunities
| Prize | Competition | Requirements |
|-------|-------------|-------------|
| Best x402 Application (500 USDT) | LOW | Creative x402 payment use case |
| Most Active Agent (500 USDT) | MEDIUM | Most legitimate txs via OnchainOS API |
| Best MCP Integration (500 USDT) | LOW | Best MCP skills integration |
| Best Economy Loop (500 USDT) | LOW-MEDIUM | Best earn-pay-earn cycle |
| Best Uniswap Integration (500 USDT) | MEDIUM | Best use of Uniswap AI skills |
| Best Data Analyst (500 USDT) | LOW | Best onchain data for agent decisions |
| Most Innovative (500 USDT) | MEDIUM | Most creative concept |

## Builder's Existing Projects (Potential Leverage)

### High Relevance to OKX Build X:
1. **agent-auditor** — Trust scoring for onchain AI agents with behavioral analysis across 6 EVM chains. Could be adapted to X Layer as an agent reputation skill.
2. **verdikt** — Dispute resolution for AI agent micropayments with escrow. x402 + dispute resolution concept is directly relevant.
3. **deltaagent** — Autonomous DeFi agent on Aave V3. DeFi agent pattern could be ported to X Layer with OnchainOS skills.

### Medium Relevance:
4. **ghostfund** — Private DeFi vault. Vault pattern could work on X Layer.
5. **trusttap** — Reputation infrastructure. Trust scoring concept applicable.
6. **kasgate** — Payment gateway. Payment infrastructure experience relevant.

### Key Builder Strengths:
- Deep Solidity + TypeScript full-stack
- Multiple AI agent projects shipped
- Experience with agent micropayments (x402 on Stellar already)
- Trust/reputation scoring systems built before
- DeFi protocol integrations (Aave V3, yield vaults)
- Fast shipper — 24-48h solo hackathon projects

## Winning Architecture Pattern
Multi-agent or skill system that:
1. Uses MANY OnchainOS skills (not just 1)
2. Deploys on X Layer mainnet with real txs
3. Links every AI decision to a tx hash (decision-to-action lineage)
4. Uses x402 for agent payments
5. Integrates Uniswap Trading API
6. Has a working demo with clear UX
7. Ties everything to one Agentic Wallet identity

## Strategic Recommendations
1. **Skills Arena = highest EV** — less competition, Plugin Store partnership for 1st
2. **Leverage agent-auditor or verdikt concepts** — existing code accelerates delivery
3. **Target special prizes** — x402, MCP, data analyst have lowest competition
4. **Decision-to-action lineage is THE differentiator** — judges explicitly praised this
5. **47 hours is ample** for a well-scoped project with existing patterns to draw from
6. **Submit to BOTH tracks** — Human Track (Google Form) + Agent Track (Moltbook)
