# OKX Build X S2 — Ideas

## Selected: [AWAITING WARROOM DELIBERATION]

---

## Generation Stats
- Raw ideas generated: 16
- Killed by Kill List: 3 (ARBITER-saturated, YIELD-MIND-already built, COPY-TRADE-AI-saturated)
- Killed by Demo Test: 1 (AGENT-ECONOMY-too complex for solo demo)
- Killed by score threshold: 0
- Salvaged kernels: 3
- Final presented: 12

---

## Presented Ideas

### #1: ORACLE-MIND — Decision Intelligence Platform
**Score:** 25/25 — Ship [5] | Demo [5] | Sponsor [5] | Novel [5] | Memorable [5]

**Pitch:** AI agent that collects market intelligence from multiple OnchainOS skills, makes autonomous trading decisions via Uniswap/OKX DEX, and logs the ENTIRE decision chain (data→reasoning→action→tx_hash) on X Layer. The ultimate decision-to-action lineage showcase.

**Demo:** Agent analyzes market in real-time → shows reasoning ("ETH/USDT showing whale accumulation + bullish signal, confidence 87%") → executes swap → tx hash appears → decision journal entry logged on-chain with full lineage. All visible in a dashboard.

**Targets:** X Layer Arena + Skills Arena (reusable decision-logging skill) — Both tracks
**Tech Stack & Integration:** okx-dex-market, okx-dex-signal, okx-dex-swap, okx-dex-ws, okx-dex-token, okx-agentic-wallet, okx-onchain-gateway, okx-x402-payment, Uniswap Trading API, MCP server. 9+ skills.
**What This Becomes:** The standard for auditable AI agent decision-making in DeFi.
**The Risk:** Scope — combining data collection + trading + logging is ambitious. Mitigation: builder has deltaagent (DeFi agent) as existing code to accelerate.
**Why this wins:** Directly addresses okx_ai's #1 praised feature (decision-to-action lineage), uses 9+ skills, hits every judging criterion.
**Method:** Recombination (PROOF-CHAIN + DATA-SAGE + trading)

---

### #2: TRUST-LENS — Real-Time Agent Trust Scorer
**Score:** 23/25 — Ship [5] | Demo [5] | Sponsor [4] | Novel [4] | Memorable [5]

**Pitch:** Point it at any agent wallet → instant trust score with behavioral breakdown, risk flags, and historical pattern analysis. Adapted from builder's existing agent-auditor project. Live on X Layer.

**Demo:** Enter a wallet address → watch trust dimensions populate in real-time (tx history analysis, approval patterns, interaction graph, token holdings risk) → final trust score with confidence interval. Run it against hackathon competitor agents LIVE.

**Targets:** Skills Arena — reusable trust scoring skill
**Tech Stack & Integration:** okx-agentic-wallet, okx-wallet-portfolio, okx-security, okx-dex-signal, okx-dex-token, okx-onchain-gateway. 6+ skills.
**What This Becomes:** The credit score for AI agents.
**The Risk:** Novelty — agent-auditor exists on other chains. Mitigation: X Layer-native with OnchainOS-specific trust dimensions.
**Why this wins:** Memorable demo (audit competitor agents live), leverages existing code, targets underserved Skills Arena.
**Method:** Demo Impact + existing project leverage

---

### #3: PROOF-CHAIN — Decision Lineage Registry Skill
**Score:** 21/25 — Ship [4] | Demo [3] | Sponsor [5] | Novel [5] | Memorable [4]

**Pitch:** Reusable OnchainOS skill that any agent can plug in to make their decisions auditable. Logs decision→reasoning→tx_hash chains on X Layer. The meta-play: judges want decision-to-action lineage, so build the TOOL for it.

**Demo:** Show two agents: one with PROOF-CHAIN, one without. Query the decision log: "Why did this agent swap ETH for USDT at 3:42pm?" → full reasoning chain with tx hash proof.

**Targets:** Skills Arena — 1st place = Plugin Store + OnchainOS Partnership
**Tech Stack & Integration:** okx-agentic-wallet, okx-onchain-gateway, okx-x402-payment, MCP server integration. Registry contract on X Layer.
**What This Becomes:** Standard infrastructure for agent accountability.
**The Risk:** Demo is abstract (infrastructure vs product). Mitigation: wrap in compelling demo app showing before/after.
**Why this wins:** Directly builds what judges praised. Meta-strategic: the tool judges want every agent to use.
**Method:** Inversion

---

### #4: AEGIS — Full-Stack Agent Security Suite
**Score:** 21/25 — Ship [4] | Demo [4] | Sponsor [5] | Novel [4] | Memorable [4]

**Pitch:** Three-pronged security for the agent economy: trust scoring (agent-auditor), wallet approval management (shield), meme token safety (guard). Reusable skills + unified dashboard.

**Demo:** Dashboard shows 3 panels: Trust Score (scan any wallet), Approval Shield (auto-revoke risky approvals), Meme Guard (real-time rug pull alerts). Each with live data.

**Targets:** X Layer Arena (full app) + Skills Arena (individual skills)
**Tech Stack & Integration:** okx-security, okx-dex-signal, okx-dex-trenches, okx-wallet-portfolio, okx-agentic-wallet, okx-dex-token, okx-onchain-gateway, okx-x402-payment. 8+ skills.
**What This Becomes:** Norton Antivirus for the agent economy.
**The Risk:** Scope — 3 features is ambitious. Mitigation: builder has agent-auditor code, each feature is self-contained.
**Why this wins:** Deep integration (8+ skills), broad problem (security affects everyone), clear demo.
**Method:** Recombination

---

### #5: AGENT-COURT — On-Chain Dispute Resolution for Agent Payments
**Score:** 19/25 — Ship [4] | Demo [4] | Sponsor [4] | Novel [3] | Memorable [4]
**Pitch:** x402 escrow + AI quality gate + on-chain dispute resolution. Adapted from verdikt (Stellar winner).
**Method:** External injection
**Targets:** X Layer Arena
**Tech:** okx-x402-payment, okx-agentic-wallet, okx-onchain-gateway, okx-security. 4+ skills.

### #6: MEME-GUARD — Intelligent Meme Token Safety Agent
**Score:** 19/25 — Ship [4] | Demo [4] | Sponsor [4] | Novel [3] | Memorable [4]
**Pitch:** Monitors trending memes via okx-dex-trenches, runs security via okx-security, alerts via x402.
**Method:** Market Microstructure
**Targets:** X Layer Arena
**Tech:** okx-dex-trenches, okx-security, okx-dex-signal, okx-dex-token, okx-x402-payment. 5+ skills.

### #7: AGENT-ESCROW — x402 Escrow & Quality Gate
**Score:** 19/25 — Ship [4] | Demo [4] | Sponsor [5] | Novel [3] | Memorable [3]
**Pitch:** Port verdikt's proven escrow pattern to X Layer with OnchainOS x402 integration.
**Method:** External injection
**Targets:** Skills Arena
**Tech:** okx-x402-payment, okx-agentic-wallet, okx-onchain-gateway. 3+ skills.

### #8: AGENT-RANK — Reputation Protocol
**Score:** 18/25 — Ship [4] | Demo [4] | Sponsor [4] | Novel [3] | Memorable [3]
**Pitch:** On-chain reputation for agents based on tx history and x402 payment reliability.
**Method:** Inversion
**Targets:** Skills Arena
**Tech:** okx-agentic-wallet, okx-wallet-portfolio, okx-onchain-gateway. 3+ skills.

---

## Honorable Mentions (Scored 16-17)

- **SENTINEL** (17) — Security alert skill, solid but narrow
- **DATA-SAGE** (17) — Data analyst skill, targets special prize but weak demo
- **SHIELD-AGENT** (17) — Approval manager, useful but not memorable
- **WHALE-WHISPER** (16) — Market intelligence, too similar to existing products

---

## Killed Ideas
| Idea | Method | Kill Reason |
|------|--------|-------------|
| ARBITER | Tech Combo | Saturated — Helios already does cross-DEX routing |
| YIELD-MIND | Tech Combo | Already Built — Leigent building same thing |
| COPY-TRADE-AI | External Injection | Saturated — social trading agents everywhere |
| AGENT-ECONOMY | Recombination | Demo impossible — too many parts for solo 3-min demo |

---

## Salvaged Kernels
1. Real-time WebSocket price monitoring (from ARBITER)
2. Whale trade mirroring logic (from COPY-TRADE-AI)
3. Agent service discovery pattern (from AGENT-ECONOMY)
