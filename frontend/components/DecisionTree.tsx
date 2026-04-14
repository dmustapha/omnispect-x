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
