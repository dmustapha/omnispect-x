import Link from "next/link";

const STATS = [
  { value: "8", label: "OnchainOS Skills" },
  { value: "4", label: "Trust Dimensions" },
  { value: "7", label: "Action Types" },
  { value: "<$0.001", label: "Per Lineage Log" },
];

const INTEGRATIONS = [
  "okx-agentic-wallet", "okx-wallet-portfolio", "okx-security",
  "okx-dex-signal", "okx-dex-token", "okx-dex-market",
  "okx-dex-swap", "okx-onchain-gateway", "okx-x402-payment",
  "Uniswap Trading API", "MCP Server",
];

export default function Home() {
  return (
    <div className="ox-dots">
      {/* ── Hero ───────────────────────────────────────────── */}
      <section className="relative pt-6 pb-10">
        <div className="ox-glass-12 ox-glass-edge rounded-2xl p-8 lg:p-12 relative overflow-hidden">
          {/* Decorative dot grid */}
          <div className="ox-dots absolute inset-0 rounded-2xl opacity-30 pointer-events-none" aria-hidden="true" />

          <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-center relative z-10">
            {/* Left: Copy */}
            <div className="flex-1 lg:max-w-[55%]">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-6 ox-glass-16 ox-glass-edge text-ox-cyan">
                <span className="w-1.5 h-1.5 rounded-full bg-ox-safe animate-pulse-dot" />
                Live on X Layer Mainnet
              </span>
              <h1 className="font-display font-bold text-4xl md:text-5xl lg:text-[3.5rem] leading-tight mb-5 tracking-tight">
                Trust & Lineage
                <br />
                <span className="text-ox-cyan">for AI Agents</span>
              </h1>
              <p className="text-base md:text-lg leading-relaxed mb-8 text-ox-text-secondary max-w-[520px]">
                Multi-dimensional trust scoring and on-chain decision audit trails.
                Know what any agent did, why it did it, and whether to trust it.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/trust" className="ox-btn-primary px-6 py-3 text-sm text-center">
                  Score an Agent
                </Link>
                <Link href="/lineage" className="ox-btn-secondary ox-glass-16 ox-glass-lift px-6 py-3 text-sm text-center border-0">
                  Explore Lineage
                </Link>
              </div>
            </div>

            {/* Right: Nested glass score preview */}
            <div className="flex-1 lg:max-w-[45%] w-full flex justify-center">
              <div className="ox-glass-20 ox-glass-edge-strong rounded-2xl p-6 w-full max-w-sm relative" style={{ transform: "translateY(-8px)" }}>
                {/* Top refraction line */}
                <div className="absolute inset-x-0 top-0 h-px rounded-t-2xl" style={{ background: "linear-gradient(90deg, transparent, rgba(242, 140, 24, 0.3), transparent)" }} aria-hidden="true" />

                <div className="flex items-start gap-5 mb-5">
                  {/* Score ring */}
                  <div className="relative shrink-0">
                    <svg width="88" height="88" viewBox="0 0 88 88">
                      <circle cx="44" cy="44" r="38" fill="none" className="ox-score-ring-track" strokeWidth="5" />
                      <circle cx="44" cy="44" r="38" fill="none" className="ox-score-ring-fill" strokeWidth="5"
                        strokeLinecap="round" strokeDasharray="239 251" strokeDashoffset="0" transform="rotate(-90 44 44)" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="font-display font-bold text-3xl text-ox-cyan">82</span>
                    </div>
                  </div>
                  {/* Agent info */}
                  <div className="pt-1">
                    <p className="font-display font-semibold text-base text-ox-text-primary">agent-alpha.xlayer</p>
                    <p className="text-xs mt-1 text-ox-text-secondary">DeFi Yield Optimizer</p>
                    <span className="inline-flex items-center gap-1.5 mt-2 px-2 py-0.5 rounded-full text-xs font-medium bg-ox-safe/10 text-ox-safe">
                      <span className="w-1.5 h-1.5 rounded-full bg-ox-safe" /> Safe
                    </span>
                  </div>
                </div>

                {/* Mini radar */}
                <div className="flex justify-center mb-5">
                  <svg width="160" height="130" viewBox="0 0 160 130" className="opacity-90">
                    <polygon points="80,10 140,45 140,95 80,130 20,95 20,45" fill="none" stroke="rgba(61,46,36,0.2)" strokeWidth="0.5" />
                    <polygon points="80,30 120,52 120,88 80,110 40,88 40,52" fill="none" stroke="rgba(61,46,36,0.15)" strokeWidth="0.5" />
                    <polygon points="80,50 100,62 100,78 80,90 60,78 60,62" fill="none" stroke="rgba(61,46,36,0.1)" strokeWidth="0.5" />
                    <line x1="80" y1="10" x2="80" y2="130" stroke="rgba(61,46,36,0.15)" strokeWidth="0.5" />
                    <line x1="20" y1="45" x2="140" y2="95" stroke="rgba(61,46,36,0.15)" strokeWidth="0.5" />
                    <line x1="140" y1="45" x2="20" y2="95" stroke="rgba(61,46,36,0.15)" strokeWidth="0.5" />
                    <polygon points="80,18 132,52 125,100 35,90" fill="rgba(242,140,24,0.12)" stroke="var(--ox-cyan)" strokeWidth="1.5" strokeLinejoin="round" />
                    <circle cx="80" cy="18" r="3" fill="var(--ox-cyan)" />
                    <circle cx="132" cy="52" r="3" fill="var(--ox-cyan)" />
                    <circle cx="125" cy="100" r="3" fill="var(--ox-purple)" />
                    <circle cx="35" cy="90" r="3" fill="var(--ox-cyan)" />
                    <text x="80" y="6" textAnchor="middle" fill="var(--ox-text-secondary)" fontSize="8">Txn Patterns</text>
                    <text x="150" y="50" textAnchor="start" fill="var(--ox-text-secondary)" fontSize="8">Contracts</text>
                    <text x="135" y="112" textAnchor="start" fill="var(--ox-text-secondary)" fontSize="8">Fund Flow</text>
                    <text x="10" y="100" textAnchor="start" fill="var(--ox-text-secondary)" fontSize="8">Consistency</text>
                  </svg>
                </div>

                {/* Dimension bars */}
                <div className="space-y-2.5">
                  {[
                    { label: "Txn Patterns", score: 20, max: 25, color: "var(--ox-safe)" },
                    { label: "Contract Int.", score: 20, max: 25, color: "var(--ox-cyan)" },
                    { label: "Fund Flow", score: 18, max: 25, color: "var(--ox-caution)" },
                    { label: "Consistency", score: 24, max: 25, color: "var(--ox-safe)" },
                  ].map((d) => (
                    <div key={d.label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-ox-text-secondary">{d.label}</span>
                        <span className="font-medium" style={{ color: d.color }}>{d.score}/{d.max}</span>
                      </div>
                      <div className="h-1.5 rounded-full" style={{ background: "rgba(61, 46, 36, 0.3)" }}>
                        <div className="h-full rounded-full" style={{ width: `${(d.score / d.max) * 100}%`, background: `linear-gradient(90deg, var(--ox-cyan-dim), ${d.color})` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats Strip (overlapping) ─────────────────────── */}
      <section className="relative -mt-6 z-10 mb-10">
        <div className="ox-glass-20 ox-glass-edge-strong rounded-xl px-6 py-5 flex flex-wrap items-center justify-around gap-4">
          {STATS.map((s, i) => (
            <div key={s.label} className="flex items-center gap-3">
              {i > 0 && (
                <div className="hidden md:block w-px h-10" style={{ background: "linear-gradient(180deg, transparent, var(--ox-border-glow), transparent)" }} aria-hidden="true" />
              )}
              <div className="flex items-center gap-3 ml-3 first:ml-0">
                <span className="font-display font-bold text-2xl text-ox-cyan">{s.value}</span>
                <span className="text-sm text-ox-text-secondary">{s.label}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────── */}
      <section className="pb-10">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold uppercase tracking-widest mb-3 text-ox-cyan">Core Capabilities</p>
          <h2 className="font-display font-bold text-3xl md:text-4xl tracking-tight">
            Built for <span className="text-ox-cyan">Transparency</span>
          </h2>
        </div>

        {/* Feature 1: Trust Scoring — 60/40 */}
        <div className="flex flex-col lg:flex-row gap-5 mb-5">
          <Link href="/trust" className="lg:w-[60%] ox-glass-16 ox-glass-edge ox-glass-lift rounded-2xl p-8 relative overflow-hidden group block">
            <div className="ox-dots absolute inset-0 opacity-20 pointer-events-none" aria-hidden="true" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-ox-cyan/15">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ox-cyan)" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" />
                  </svg>
                </div>
                <h3 className="font-display font-semibold text-xl">Trust Scoring</h3>
              </div>
              <p className="text-sm leading-relaxed text-ox-text-secondary max-w-[420px]">
                Multi-dimensional behavioral risk analysis across 4 axes with on-chain verification
              </p>
            </div>
          </Link>
          <div className="lg:w-[40%] ox-glass-12 ox-glass-edge rounded-2xl p-8 flex flex-col justify-center">
            <div className="space-y-4">
              {[
                { label: "On-chain Verified", sub: "Immutable trust records", color: "var(--ox-safe)" },
                { label: "Real-time Updates", sub: "Scores shift with behavior", color: "var(--ox-cyan)" },
                { label: "4-Axis Analysis", sub: "Txn Patterns, Contracts, Fund Flow, Consistency", color: "var(--ox-purple)" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `color-mix(in srgb, ${item.color} 10%, transparent)` }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={item.color} strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-ox-text-primary">{item.label}</p>
                    <p className="text-xs text-ox-text-muted">{item.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="ox-line-accent my-8" aria-hidden="true" />

        {/* Feature 2: Decision Lineage — 40/60 flipped */}
        <div className="flex flex-col lg:flex-row-reverse gap-5 mb-5">
          <Link href="/lineage" className="lg:w-[60%] ox-glass-12 ox-glass-edge ox-glass-lift rounded-2xl p-8 relative overflow-hidden group block">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-ox-purple/15">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ox-purple)" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
                </div>
                <h3 className="font-display font-semibold text-xl">Decision Lineage</h3>
              </div>
              <p className="text-sm leading-relaxed text-ox-text-secondary max-w-[420px] mb-6">
                Full decision-to-action chains logged on-chain with reasoning, confidence & tx proof
              </p>
              {/* Lineage chain mini */}
              <div className="ox-glass-16 rounded-xl p-4 space-y-2.5">
                {[
                  { step: "1", label: "Signal Received", detail: "okx-dex-signal: ETH/USDC price drop", conf: "0.94", color: "var(--ox-cyan)" },
                  { step: "2", label: "Decision Made", detail: "Execute swap via okx-dex-swap", conf: "0.87", color: "var(--ox-purple)" },
                  { step: "3", label: "Action Executed", detail: "TX: 0x8f3a...7c2e on X Layer", conf: "confirmed", color: "var(--ox-safe)" },
                ].map((node, i) => (
                  <div key={node.step}>
                    {i > 0 && <div className="ml-3 w-px h-3" style={{ background: "var(--ox-border-glow)" }} aria-hidden="true" />}
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: `color-mix(in srgb, ${node.color} 20%, transparent)`, border: `1px solid color-mix(in srgb, ${node.color} 15%, transparent)` }}>
                        <span className="text-[9px] font-bold" style={{ color: node.color }}>{node.step}</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-medium text-ox-text-primary">{node.label}</p>
                        <p className="text-[10px] text-ox-text-muted">{node.detail}</p>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: `color-mix(in srgb, ${node.color} 10%, transparent)`, color: node.color }}>{node.conf}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Link>
          <div className="lg:w-[40%] ox-glass-16 ox-glass-edge rounded-2xl p-8 flex flex-col justify-center">
            <p className="text-xs font-semibold uppercase tracking-widest mb-3 text-ox-purple">Audit Trail</p>
            <h3 className="font-display font-semibold text-2xl mb-3">Every Decision,<br />Fully Traceable</h3>
            <p className="text-sm leading-relaxed text-ox-text-secondary">
              From initial signal to final transaction, every step includes reasoning context, confidence metrics, and on-chain proof.
            </p>
            <div className="flex gap-4 mt-6">
              <div>
                <p className="font-display font-bold text-xl text-ox-cyan">100%</p>
                <p className="text-[10px] text-ox-text-muted">On-chain logged</p>
              </div>
              <div>
                <p className="font-display font-bold text-xl text-ox-purple">~200ms</p>
                <p className="text-[10px] text-ox-text-muted">Log latency</p>
              </div>
            </div>
          </div>
        </div>

        <div className="ox-line-accent my-8" aria-hidden="true" />

        {/* Feature 3: Live Monitoring — Full Width Deep Glass */}
        <Link href="/monitor" className="ox-glass-20 ox-glass-edge-strong ox-glass-lift rounded-2xl p-8 mb-5 relative overflow-hidden block group">
          <div className="ox-dots absolute inset-0 opacity-15 pointer-events-none" aria-hidden="true" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-ox-safe/15">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ox-safe)" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8" /><path d="M12 17v4" /></svg>
              </div>
              <h3 className="font-display font-semibold text-xl">Live Monitoring</h3>
              <span className="w-2 h-2 rounded-full bg-ox-safe animate-pulse-dot ml-2" />
            </div>
            <p className="text-sm leading-relaxed text-ox-text-secondary max-w-[560px] mb-6">
              Real-time WebSocket feed of agent signals, swaps, trust checks & cycle events
            </p>
            {/* Terminal mock */}
            <div className="ox-glass-24 rounded-xl overflow-hidden">
              <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-ox-border">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
                <span className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                <span className="text-[10px] ml-2 text-ox-text-muted font-mono">omnispect-x monitor --live</span>
              </div>
              <div className="p-4 font-mono text-xs space-y-1.5 text-ox-text-secondary">
                <p><span className="text-ox-text-muted">[14:32:01]</span> <span className="text-ox-safe">SIGNAL</span> agent-alpha: okx-dex-signal price alert ETH/USDC</p>
                <p><span className="text-ox-text-muted">[14:32:02]</span> <span className="text-ox-cyan">TRUST</span> agent-alpha: score check initiated — behavioral: 92</p>
                <p><span className="text-ox-text-muted">[14:32:02]</span> <span className="text-ox-caution">DECIDE</span> agent-alpha: swap 0.5 ETH → USDC via okx-dex-swap</p>
                <p><span className="text-ox-text-muted">[14:32:03]</span> <span className="text-ox-safe">ACTION</span> agent-alpha: tx submitted 0x8f3a...7c2e</p>
                <p><span className="text-ox-text-muted">[14:32:05]</span> <span className="text-ox-safe">CONFIRM</span> agent-alpha: tx confirmed block #4,291,087</p>
                <p><span className="text-ox-text-muted">[14:32:06]</span> <span className="text-ox-purple">LINEAGE</span> agent-alpha: decision chain logged — 3 steps, confidence 0.87</p>
              </div>
            </div>
          </div>
        </Link>

        <div className="ox-line-accent my-8" aria-hidden="true" />

        {/* Feature 4: Agent Comparison — 60/40 */}
        <div className="flex flex-col lg:flex-row gap-5">
          <Link href="/compare" className="lg:w-[60%] ox-glass-16 ox-glass-edge ox-glass-lift rounded-2xl p-8 relative overflow-hidden group block">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-ox-caution/12">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ox-caution)" strokeWidth="2"><path d="M16 3h5v5" /><path d="M8 3H3v5" /><path d="M21 3l-7 7" /><path d="M3 3l7 7" /></svg>
                </div>
                <h3 className="font-display font-semibold text-xl">Agent Comparison</h3>
              </div>
              <p className="text-sm leading-relaxed text-ox-text-secondary mb-6">
                Side-by-side radar analysis of multiple agents with dimension-level breakdown
              </p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { name: "agent-alpha", score: 82, color: "var(--ox-cyan)", dims: [20, 20, 18, 24] },
                  { name: "agent-beta", score: 63, color: "var(--ox-purple)", dims: [15, 18, 15, 15] },
                ].map((a) => (
                  <div key={a.name} className="ox-glass-12 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 rounded-full" style={{ background: `linear-gradient(135deg, ${a.color}, color-mix(in srgb, ${a.color} 60%, transparent))` }} />
                      <span className="text-xs font-medium text-ox-text-primary">{a.name}</span>
                    </div>
                    <p className="font-display font-bold text-2xl" style={{ color: a.color }}>{a.score}</p>
                    <div className="mt-2 space-y-1">
                      {["TXN", "CTR", "FLW", "CON"].map((dim, i) => (
                        <div key={dim} className="flex justify-between text-[10px]">
                          <span className="text-ox-text-muted">{dim}</span>
                          <span style={{ color: a.dims[i] >= 20 ? "var(--ox-safe)" : a.dims[i] >= 15 ? "var(--ox-caution)" : "var(--ox-danger)" }}>{a.dims[i]}/25</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Link>
          <div className="lg:w-[40%] ox-glass-12 ox-glass-edge rounded-2xl p-8 flex flex-col justify-center">
            <p className="text-xs font-semibold uppercase tracking-widest mb-3 text-ox-caution">Analysis</p>
            <h3 className="font-display font-semibold text-2xl mb-3">Compare Before<br />You Delegate</h3>
            <p className="text-sm leading-relaxed text-ox-text-secondary">
              Not all agents are equal. Compare trust profiles across dimensions to find the right agent for every task.
            </p>
          </div>
        </div>
      </section>

      {/* ── Integrations ──────────────────────────────────── */}
      <section className="pb-12">
        <div className="ox-line-accent mb-10" aria-hidden="true" />
        <div className="text-center mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest mb-3 text-ox-cyan">Integrations</p>
          <h2 className="font-display font-bold text-2xl md:text-3xl">
            Powered by <span className="text-ox-cyan">OnchainOS</span>
          </h2>
        </div>
        <div className="flex flex-wrap justify-center gap-2.5">
          {INTEGRATIONS.map((name) => (
            <span key={name} className="ox-glass-12 ox-glass-lift rounded-lg px-4 py-2 text-xs font-medium text-ox-text-secondary">
              {name}
            </span>
          ))}
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────── */}
      <footer className="pb-8">
        <div className="ox-line-accent mb-6" aria-hidden="true" />
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: "linear-gradient(135deg, var(--ox-cyan), var(--ox-purple))" }}>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M8 1L14 4.5V11.5L8 15L2 11.5V4.5L8 1Z" stroke="white" strokeWidth="1.5" fill="none" /><circle cx="8" cy="8" r="2" fill="white" opacity="0.9" /></svg>
            </div>
            <span className="font-display font-semibold text-sm">Omnispect-X</span>
          </div>
          <p className="text-xs text-ox-text-muted">AI Agent Trust Infrastructure on X Layer</p>
        </div>
      </footer>
    </div>
  );
}
