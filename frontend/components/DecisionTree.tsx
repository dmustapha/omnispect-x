"use client";

import { useState } from "react";

export interface DecisionNode {
  decisionId: string;
  prevDecisionId: string;
  actionType: number;
  resultTxHash: string;
  reasoningHash?: string;
  timestamp: number;
  blockNumber?: number;
  reasoningText?: string;
  reasoningURI: string;
  confidence?: number;
}

const ACTION_LABELS: Record<number, { label: string; color: string; bg: string; dotColor: string }> = {
  0: { label: "Signal", color: "text-cyan-400", bg: "bg-cyan-400/15 border-cyan-400/25", dotColor: "bg-cyan-400" },
  1: { label: "Analysis", color: "text-ox-purple", bg: "bg-ox-purple/15 border-ox-purple/25", dotColor: "bg-ox-purple" },
  2: { label: "Trust Check", color: "text-ox-caution", bg: "bg-ox-caution/15 border-ox-caution/25", dotColor: "bg-ox-caution" },
  3: { label: "Swap", color: "text-ox-safe", bg: "bg-ox-safe/15 border-ox-safe/25", dotColor: "bg-ox-safe" },
  4: { label: "Open", color: "text-blue-400", bg: "bg-blue-400/15 border-blue-400/25", dotColor: "bg-blue-400" },
  5: { label: "Close", color: "text-ox-text-secondary", bg: "bg-ox-text-secondary/15 border-ox-text-secondary/25", dotColor: "bg-ox-text-secondary" },
  6: { label: "Emergency", color: "text-red-400", bg: "bg-red-400/15 border-red-400/25", dotColor: "bg-red-400" },
};

const NULL_HASH = "0x" + "0".repeat(64);
const EXPLORER_BASE = "https://www.okx.com/web3/explorer/xlayer/tx/";
const IPFS_GATEWAY = "https://ipfs.io/ipfs/";

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).catch(() => {});
}

export function DecisionTree({ decisions }: { decisions: DecisionNode[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (decisions.length === 0) {
    return (
      <div className="ox-glass-16 ox-glass-edge rounded-2xl text-ox-text-muted text-center py-12 text-sm">
        No decisions found for this agent.
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Timeline rail */}
      <div className="absolute left-[19px] top-6 bottom-6 w-0.5 bg-gradient-to-b from-ox-cyan/40 via-ox-border to-transparent" />

      <div className="space-y-2">
        {decisions.map((d, idx) => {
          const action = ACTION_LABELS[d.actionType] || {
            label: "Unknown",
            color: "text-gray-400",
            bg: "bg-gray-500/15 border-gray-500/25",
            dotColor: "bg-gray-400",
          };
          const isExpanded = expanded === d.decisionId;
          const shortId = d.decisionId.slice(0, 10) + "..." + d.decisionId.slice(-4);
          const hasTx = d.resultTxHash !== NULL_HASH;
          const ipfsHash = d.reasoningURI?.replace("ipfs://", "") || "";

          return (
            <div key={d.decisionId} className="relative pl-10">
              {/* Timeline node */}
              <div className={`absolute left-2.5 top-4 w-4 h-4 rounded-full border-2 transition-all duration-200 z-10 ${
                isExpanded
                  ? `${action.dotColor} border-transparent shadow-[0_0_8px_rgba(242,140,24,0.3)]`
                  : `bg-ox-bg ${idx === 0 ? "border-ox-cyan" : "border-ox-border"}`
              }`} />

              {/* Card */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setExpanded(isExpanded ? null : d.decisionId)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setExpanded(isExpanded ? null : d.decisionId); } }}
                className={`
                  w-full text-left ox-glass-12 ox-glass-edge rounded-xl p-4 transition-all duration-200 cursor-pointer
                  ${isExpanded ? "border-ox-border-active shadow-[0_0_12px_rgba(242,140,24,0.08)]" : "hover:bg-ox-surface/20"}
                `}
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`ox-badge border ${action.bg} ${action.color}`}>
                    {action.label}
                  </span>
                  <span className="text-ox-text-muted text-[11px] font-mono">{shortId}</span>

                  {d.confidence != null && (
                    <span className="text-[11px] text-ox-text-muted font-mono ml-auto sm:ml-0">
                      {(d.confidence * 100).toFixed(0)}% conf
                    </span>
                  )}

                  <span className="text-[11px] text-ox-text-muted ml-auto hidden sm:inline">
                    {new Date(d.timestamp * 1000).toLocaleString()}
                  </span>
                </div>

                {hasTx && (
                  <div className="mt-2 flex items-center gap-1.5 text-[11px]">
                    <span className="text-ox-text-muted">tx:</span>
                    <a
                      href={`${EXPLORER_BASE}${d.resultTxHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-ox-cyan-dim hover:text-ox-cyan font-mono transition-colors"
                    >
                      {d.resultTxHash.slice(0, 14)}...{d.resultTxHash.slice(-6)}
                    </a>
                  </div>
                )}
              </div>

              {/* Expanded detail panel */}
              {isExpanded && (
                <div className="mt-1 ml-4 p-4 rounded-xl ox-glass-16 ox-glass-edge animate-fade-in space-y-3">
                  {/* Reasoning text */}
                  <div>
                    <h4 className="ox-heading mb-1">Reasoning</h4>
                    <p className="text-sm text-ox-text-secondary leading-relaxed whitespace-pre-wrap">
                      {d.reasoningText || "Reasoning stored on IPFS — view via link below"}
                    </p>
                  </div>

                  {/* Detail grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    {/* Decision ID */}
                    <div className="ox-glass-12 rounded-lg p-2">
                      <span className="text-ox-text-muted block mb-0.5">Decision ID</span>
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-ox-text-secondary truncate">{d.decisionId.slice(0, 20)}...</span>
                        <button onClick={() => copyToClipboard(d.decisionId)} className="text-ox-text-muted hover:text-ox-cyan transition-colors shrink-0" title="Copy">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
                        </button>
                      </div>
                    </div>

                    {/* Reasoning Hash */}
                    {d.reasoningHash && (
                      <div className="ox-glass-12 rounded-lg p-2">
                        <span className="text-ox-text-muted block mb-0.5">Reasoning Hash</span>
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-ox-text-secondary truncate">{d.reasoningHash.slice(0, 20)}...</span>
                          <button onClick={() => copyToClipboard(d.reasoningHash!)} className="text-ox-text-muted hover:text-ox-cyan transition-colors shrink-0" title="Copy">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Block Number */}
                    {d.blockNumber != null && (
                      <div className="ox-glass-12 rounded-lg p-2">
                        <span className="text-ox-text-muted block mb-0.5">Block</span>
                        <span className="font-mono text-ox-text-secondary">#{d.blockNumber.toLocaleString()}</span>
                      </div>
                    )}

                    {/* Action Type */}
                    <div className="ox-glass-12 rounded-lg p-2">
                      <span className="text-ox-text-muted block mb-0.5">Action Type</span>
                      <span className={`font-semibold ${action.color}`}>{d.actionType} — {action.label}</span>
                    </div>
                  </div>

                  {/* Links */}
                  <div className="pt-2 border-t border-ox-border/30 flex flex-wrap gap-3">
                    {ipfsHash && ipfsHash !== "unavailable" && (
                      <a
                        href={`${IPFS_GATEWAY}${ipfsHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-[11px] text-ox-cyan-dim hover:text-ox-cyan font-mono transition-colors"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                        View on IPFS
                      </a>
                    )}
                    {hasTx && (
                      <a
                        href={`${EXPLORER_BASE}${d.resultTxHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-[11px] text-ox-cyan-dim hover:text-ox-cyan font-mono transition-colors"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                        View on X Layer Explorer
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
