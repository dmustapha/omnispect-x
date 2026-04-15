<p align="center">
  <img src="logo.png" alt="Omnispect-X" width="120" />
</p>

<h1 align="center">Omnispect-X</h1>

<p align="center">
  Multi-dimensional trust scoring and on-chain decision lineage for AI agents on X Layer.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-5.8-blue?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Next.js-14-black?logo=next.js&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/Solidity-0.8.24-363636?logo=solidity&logoColor=white" alt="Solidity" />
  <img src="https://img.shields.io/badge/Foundry-Forge-red" alt="Foundry" />
  <img src="https://img.shields.io/badge/Tests-25_passing-brightgreen" alt="Tests" />
  <img src="https://img.shields.io/badge/License-MIT-green" alt="MIT License" />
</p>

---

![Landing Page](docs/images/landing.png)

## What It Does

Omnispect-X scores any wallet across four trust dimensions (0-25 each, 100 total), classifies it as **SAFE**, **CAUTION**, or **BLOCKLIST**, and logs every AI agent decision on-chain with full reasoning lineage. A built-in demo trading agent runs a 5-phase cycle: collect signals, reason with an LLM, gate on trust, execute swaps, and pin the reasoning to IPFS before writing lineage to X Layer.

## Quickstart

```bash
git clone https://github.com/dmustapha/omnispect-x.git && cd omnispect-x

# 1. Install backend dependencies
bun install

# 2. Install frontend dependencies
cd frontend && npm install && cd ..

# 3. Configure environment
cp .env.example .env
# Fill in: OKX_API_KEY, OKX_SECRET_KEY, OKX_PASSPHRASE, PRIVATE_KEY, PINATA_JWT, ANTHROPIC_API_KEY

# 4. Start both servers
bun run dev:all

# 5. Open the dashboard
open http://localhost:3000
```

Backend runs on port **3001**. Frontend runs on port **3000**.

## Features

- **4-Dimension Trust Scoring**: Transaction Patterns, Contract Interactions, Fund Flow, Behavioral Consistency (0-25 each)
- **Trust Classification**: SAFE (70+), CAUTION (40-69), BLOCKLIST (0-39)
- **On-Chain Decision Lineage**: Every agent decision logged to `DecisionLineageLogger` on X Layer
- **Demo Trading Agent**: 5-phase autonomous cycle with LLM reasoning, trust gating, and swap execution
- **x402 Micropayment Gating**: Premium trust reports behind payment protocol
- **IPFS Reasoning Storage**: Full reasoning payloads pinned via Pinata
- **Multi-Chain Balance Analysis**: ETH, BSC, Polygon, Arbitrum, X Layer
- **OKX OnchainOS Integration**: 8 skills (wallet-portfolio, security, dex-signal, dex-token, dex-market, dex-swap, onchain-gateway, x402-payment)
- **Uniswap Trading API**: Pool risk analysis and swap execution
- **WebSocket Monitoring**: Real-time agent events streamed to the dashboard

## Screenshots

| Trust Score | Decision Lineage | Agent Monitor | Compare |
|:-----------:|:----------------:|:-------------:|:-------:|
| ![Trust Score](docs/images/trust-score.png) | ![Lineage](docs/images/lineage.png) | ![Monitor](docs/images/monitor.png) | ![Compare](docs/images/compare.png) |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Bun + Hono |
| Frontend | Next.js 14, React, Recharts |
| Smart Contracts | Solidity 0.8.24, Foundry |
| Chain Interaction | viem |
| Chain | X Layer (Chain ID 196) |
| IPFS | Pinata |
| LLM | Claude (via Anthropic API) |
| APIs | OKX OnchainOS, Uniswap Trading API |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OKX_API_KEY` | Yes | OKX developer portal API key |
| `OKX_SECRET_KEY` | Yes | OKX API secret |
| `OKX_PASSPHRASE` | Yes | OKX API passphrase |
| `PRIVATE_KEY` | Yes | Deployer and agent wallet private key |
| `PINATA_JWT` | Yes | Pinata JWT for IPFS pinning |
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key for LLM reasoning |
| `X_LAYER_RPC` | No | X Layer RPC URL (defaults to `https://rpc.xlayer.tech`) |
| `LINEAGE_CONTRACT` | No | DecisionLineageLogger address (set after deploy) |
| `UNISWAP_API_KEY` | No | Uniswap Trading API key |
| `X402_PRICE` | No | Price in OKB for premium reports (default `0.01`) |
| `X402_DEMO_MODE` | No | Set `true` to bypass payment in development |
| `LLM_MODEL` | No | Claude model ID (default `claude-haiku-4-5-20251001`) |
| `AGENT_CONFIDENCE_FLOOR` | No | Minimum confidence to execute (default `0.6`) |
| `NEXT_PUBLIC_API_URL` | No | Backend URL for frontend (default `http://localhost:3001`) |
| `NEXT_PUBLIC_WS_URL` | No | WebSocket URL for frontend (default `ws://localhost:3001/ws`) |

## Development

```bash
# Start backend only
bun run dev

# Start frontend only
bun run dev:frontend

# Start both (concurrent)
bun run dev:all

# Build backend
bun run build

# Build frontend
bun run build:frontend

# Type check everything
bun run typecheck

# Run contract tests (25 tests)
bun run test:contracts

# Deploy contracts to X Layer
bun run deploy

# Seed sample data
bun run seed
```

## API Reference

### Trust Scoring

#### `GET /api/trust/:address`

Return trust score with breakdown across four dimensions.

**Response (200)**

```json
{
  "address": "0x...",
  "score": 82,
  "classification": "SAFE",
  "dimensions": {
    "transactionPatterns": 21,
    "contractInteractions": 20,
    "fundFlow": 22,
    "behavioralConsistency": 19
  },
  "chains": ["ethereum", "bsc", "polygon", "arbitrum", "xlayer"]
}
```

#### `GET /api/trust/:address/premium`

x402-gated premium trust report with detailed evidence.

### Decision Lineage

#### `GET /api/lineage/:address`

Return full decision chain for an address.

#### `GET /api/lineage/:address/stats`

Return aggregate statistics for an agent's decisions.

#### `GET /api/lineage/decision/:id`

Return a single decision record by ID.

### Demo Agent

#### `POST /api/agent/start`

Start the demo trading agent's 5-phase cycle.

#### `POST /api/agent/stop`

Stop the demo trading agent.

#### `GET /api/agent/state`

Return current agent state and phase.

### System

#### `GET /health`

Health check endpoint.

#### `WS /ws`

WebSocket connection for real-time agent events (phase transitions, trust checks, swap executions, lineage writes).

## Smart Contracts

**DecisionLineageLogger** deployed at [`0xb6B17C10eFa279Dac0e2bB7a33e19d67d29D6313`](https://www.okx.com/explorer/xlayer/address/0xb6B17C10eFa279Dac0e2bB7a33e19d67d29D6313) on X Layer (Chain ID 196).

**Agent Wallet**: `0x131f3b6cD18039D87da0AaECaa5C8462Dd51855D`

Run the test suite:

```bash
cd contracts && forge test -vvv
```

All 25 tests passing.

## Project Structure

```
omnispect-x/
  src/                          # Backend (Bun + Hono)
    server/                     # HTTP server, WebSocket handler
    services/                   # Trust scorer, demo agent, lineage query, LLM reasoning
    lib/                        # OKX client, Uniswap client
    middleware/                  # x402 payment gate
    types/                      # TypeScript interfaces
    config/                     # Environment config
  frontend/                     # Next.js 14 app
    app/                        # Pages: trust, lineage, monitor, compare
    components/                 # TrustScoreCard, DecisionTree, AgentMonitor, CompareView
    lib/                        # API client
  contracts/                    # Solidity + Foundry
    src/DecisionLineageLogger.sol
    test/                       # 25 Foundry tests
  docs/images/                  # Screenshots
```

## Architecture

```
                      +------------------+
                      |   Next.js 14     |
                      |   Dashboard      |
                      |   (port 3000)    |
                      +--------+---------+
                               |
                        HTTP / WebSocket
                               |
                      +--------v---------+
                      |   Bun + Hono     |
                      |   Backend        |
                      |   (port 3001)    |
                      +--+----+----+---+-+
                         |    |    |   |
              +----------+    |    |   +----------+
              |               |    |              |
     +--------v---+  +-------v-+  +--v-------+  +v----------+
     | OKX        |  | Uniswap |  | Pinata   |  | Anthropic |
     | OnchainOS  |  | Trading |  | IPFS     |  | LLM       |
     | (8 skills) |  | API     |  |          |  |           |
     +------------+  +---------+  +----------+  +-----------+
                         |
              +----------v-----------+
              | DecisionLineageLogger|
              | X Layer (Chain 196)  |
              +----------------------+
```

## License

[MIT](LICENSE)
