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

export interface DimensionEvidence {
  dataPoints: number;
  sources: string[];
  rawMetrics: Record<string, number | string>;
}

export interface DimensionScore {
  score: number; // 0-25
  findings: Finding[];
  evidence: DimensionEvidence;
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

export interface TrustScoreMetadata {
  chainsQueried: string[];
  totalDataPoints: number;
  queryDurationMs: number;
  freshness: string;
}

export interface AgentProfile {
  isAgent: boolean;
  totalDecisions: number;
  registeredOnChain: boolean;
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
  agentProfile: AgentProfile;
  recommendations: string[];
  metadata: TrustScoreMetadata;
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

export interface PortfolioOverview {
  totalPnl: string;
  winRate: string;
  totalTrades: string;
  avgPnl: string;
}

export interface TransactionRecord {
  txHash: string;
  from: string;
  to: string;
  amount: string;
  timestamp: string;
  type: string;
  chainIndex: string;
  symbol: string;
}

export interface LeaderboardEntry {
  address: string;
  pnl: string;
  winRate: string;
  roi: string;
  rank: string;
}

export interface TokenPriceDetail {
  tokenAddress: string;
  marketCap: string;
  volume24h: string;
  holdersCount: string;
  priceChange1h: string;
  priceChange4h: string;
  priceChange24h: string;
  priceChange7d: string;
  price: string;
}

export interface TokenBalance {
  tokenAddress: string;
  symbol: string;
  balance: string;
  tokenPrice: string;
  chainIndex?: string;
  tokenType?: string;
  isRiskToken?: boolean;
  transferAmount?: string;
  availableAmount?: string;
  rawBalance?: string;
  address?: string;
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
  price?: string;
  change?: string;
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
  socialLinks?: Record<string, string>;
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
  isFallback?: boolean; // true when data is synthetic (API failure)
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
  chainId: string;
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
  cycle?: number;
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
    apiKey: string;
  };
  ipfs: {
    pinataJwt: string;
    gateway: string;
  };
  chains?: {
    ethRpcUrl?: string;
    bscRpcUrl?: string;
  };
  agentSecret: string;
  corsOrigin: string;
  agentWallet: {
    privateKey: string;
  };
  x402: {
    paymentTokenAddress: string;
    pricePerReport: string; // in USDG wei
  };
  anthropic: {
    apiKey: string;
    model: string;
  };
}
