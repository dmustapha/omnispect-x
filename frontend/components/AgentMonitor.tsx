"use client";

import { useState, useEffect, useRef } from "react";
import { createWSConnection, startAgent, stopAgent, fetchAgentState } from "../lib/api";

interface WSEvent {
  event: string;
  data: Record<string, unknown>;
  timestamp: number;
}

// ─── Phase Mapping ──────────────────────────────────────────────────────

const PHASES = [
  { key: "signal", label: "Signal", desc: "Collecting market signals", icon: "~", color: "text-blue-400", bg: "bg-blue-400", border: "border-blue-400" },
  { key: "analysis", label: "Analysis", desc: "AI reasoning on signals", icon: ">", color: "text-ox-purple", bg: "bg-ox-purple", border: "border-ox-purple" },
  { key: "trust-check", label: "Trust Gate", desc: "Checking wallet trust score", icon: "#", color: "text-ox-caution", bg: "bg-ox-caution", border: "border-ox-caution" },
  { key: "swap", label: "Execute", desc: "Executing the swap", icon: "$", color: "text-ox-safe", bg: "bg-ox-safe", border: "border-ox-safe" },
  { key: "lineage-logged", label: "Log", desc: "Logging decision on-chain", icon: "+", color: "text-ox-cyan", bg: "bg-ox-cyan", border: "border-ox-cyan" },
];

const EVENT_STYLES: Record<string, { color: string; icon: string }> = {
  "agent:signal": { color: "text-blue-400", icon: "~" },
  "agent:analysis": { color: "text-ox-purple", icon: ">" },
  "agent:trust-check": { color: "text-ox-caution", icon: "#" },
  "agent:swap": { color: "text-ox-safe", icon: "$" },
  "agent:lineage-logged": { color: "text-ox-cyan", icon: "+" },
  "agent:cycle-complete": { color: "text-ox-text-secondary", icon: "=" },
  "agent:error": { color: "text-ox-danger", icon: "!" },
};

function eventToPhase(eventType: string): string | null {
  const key = eventType.replace("agent:", "");
  return PHASES.find(p => p.key === key) ? key : null;
}

function formatEventData(data: Record<string, unknown>): string {
  const parts: string[] = [];
  if (data.phase) parts.push(String(data.phase));
  if (data.confidence != null) parts.push(`confidence: ${Number(data.confidence).toFixed(2)}`);
  if (data.score != null) parts.push(`score: ${data.score}`);
  if (data.classification) parts.push(String(data.classification));
  if (data.signalCount != null) parts.push(`${data.signalCount} signals`);
  if (data.source) parts.push(`source: ${data.source}`);
  if (data.token) parts.push(`token: ${String(data.token).slice(0, 10)}...`);
  if (data.txHash) parts.push(`tx: ${String(data.txHash).slice(0, 14)}...`);
  if (data.reason) parts.push(String(data.reason));
  if (data.error) parts.push(String(data.error));
  if (data.cycle != null) parts.push(`cycle #${data.cycle}`);
  if (parts.length === 0) return JSON.stringify(data);
  return parts.join(" | ");
}

// ─── Component ──────────────────────────────────────────────────────────

export function AgentMonitor() {
  const [events, setEvents] = useState<WSEvent[]>([]);
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<string | null>(null);
  const [completedPhases, setCompletedPhases] = useState<Set<string>>(new Set());
  const [phaseData, setPhaseData] = useState<Record<string, Record<string, unknown>>>({});
  const [cycleCount, setCycleCount] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inFlight = useRef(false);

  useEffect(() => {
    fetchAgentState().then((s) => {
      setRunning(s.running);
      if (s.running) setStartTime(Date.now());
    }).catch(() => {});

    const ws = createWSConnection(
      (data: WSEvent) => {
        setEvents((prev) => [...prev.slice(-200), data]);

        // Update phase tracking
        const phase = eventToPhase(data.event);
        if (phase) {
          setCurrentPhase((prev) => {
            if (prev && prev !== phase) {
              setCompletedPhases((s) => new Set(s).add(prev));
            }
            return phase;
          });
          setPhaseData((prev) => ({ ...prev, [phase]: data.data }));
        }

        if (data.event === "agent:cycle-complete") {
          setCycleCount((c) => c + 1);
          setCurrentPhase(null);
          setCompletedPhases(new Set());
          setPhaseData({});
        }

        if (data.event === "agent:error") {
          setCurrentPhase(null);
        }
      },
      () => setWsConnected(false),
      () => setWsConnected(true)
    );

    return () => ws.close();
  }, []);

  // Tick uptime counter every second
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    if (!startTime) return;
    const id = setInterval(() => forceUpdate((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [startTime]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [events]);

  async function handleToggle() {
    if (inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    setError(null);
    try {
      if (running) {
        await stopAgent();
        setRunning(false);
        setStartTime(null);
      } else {
        await startAgent();
        setRunning(true);
        setStartTime(Date.now());
        setCycleCount(0);
      }
    } catch {
      setError(`Failed to ${running ? "stop" : "start"} agent. Check backend connection.`);
    } finally {
      setLoading(false);
      inFlight.current = false;
    }
  }

  const uptime = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
  const uptimeStr = uptime > 3600
    ? `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`
    : uptime > 60 ? `${Math.floor(uptime / 60)}m ${uptime % 60}s` : `${uptime}s`;

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Controls */}
      <div className="flex items-center justify-between p-3 ox-glass-16 ox-glass-edge rounded-xl">
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full ${
            running ? "bg-ox-safe animate-pulse-glow" : "bg-ox-text-muted"
          }`} />
          <span className="text-sm font-medium text-ox-text-secondary">
            {running ? "Agent Active" : "Agent Idle"}
          </span>
          {!wsConnected && (
            <span className="text-[10px] text-ox-danger font-mono">WS disconnected</span>
          )}
        </div>
        <button
          onClick={handleToggle}
          disabled={loading}
          className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-colors ${
            running
              ? "bg-ox-danger/15 text-ox-danger border border-ox-danger/25 hover:bg-ox-danger/25"
              : "bg-ox-safe/15 text-ox-safe border border-ox-safe/25 hover:bg-ox-safe/25"
          } disabled:opacity-50`}
        >
          {loading ? "..." : running ? "Stop" : "Start"}
        </button>
      </div>

      {error && (
        <div role="alert" className="px-3 py-2 rounded-lg bg-ox-danger/10 border border-ox-danger/20 text-ox-danger text-xs">
          {error}
        </div>
      )}

      {/* Stats bar */}
      {running && (
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Cycles", value: String(cycleCount), color: "text-ox-cyan" },
            { label: "Events", value: String(events.length), color: "text-ox-text-secondary" },
            { label: "Uptime", value: uptimeStr, color: "text-ox-safe" },
            { label: "Errors", value: String(events.filter(e => e.event === "agent:error").length), color: "text-ox-danger" },
          ].map((s) => (
            <div key={s.label} className="ox-glass-12 rounded-lg px-3 py-2 text-center">
              <div className={`text-sm font-bold font-mono ${s.color}`}>{s.value}</div>
              <div className="text-[10px] text-ox-text-muted">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* 5-Phase Cycle Indicator */}
      {running && (
        <div className="ox-glass-16 ox-glass-edge rounded-xl p-4">
          <div className="flex items-center justify-between relative">
            {/* Connecting line */}
            <div className="absolute top-4 left-6 right-6 h-px bg-ox-border/40" />

            {PHASES.map((phase, i) => {
              const isDone = completedPhases.has(phase.key);
              const isActive = currentPhase === phase.key;
              const isPending = !isDone && !isActive;

              return (
                <div key={phase.key} className="relative z-10 flex flex-col items-center gap-1.5" style={{ flex: 1 }}>
                  {/* Node */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                    isDone
                      ? `${phase.border} ${phase.bg}/20`
                      : isActive
                        ? `${phase.border} ${phase.bg}/10 shadow-[0_0_12px_rgba(242,140,24,0.2)] animate-pulse`
                        : "border-ox-border bg-ox-bg"
                  }`}>
                    {isDone ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={phase.color}>
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <span className={`text-xs font-bold ${isActive ? phase.color : "text-ox-text-muted"}`}>
                        {i + 1}
                      </span>
                    )}
                  </div>
                  {/* Label */}
                  <span className={`text-[10px] font-medium ${
                    isDone || isActive ? phase.color : "text-ox-text-muted"
                  }`}>
                    {phase.label}
                  </span>
                  {isActive && (
                    <span className="text-[9px] text-ox-text-muted hidden sm:block">
                      {phase.desc}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Active phase detail */}
          {currentPhase && phaseData[currentPhase] && (
            <div className="mt-3 pt-3 border-t border-ox-border/30 animate-fade-in">
              <div className="text-xs text-ox-text-secondary">
                {formatEventData(phaseData[currentPhase])}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Event feed — terminal glass */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto ox-glass-24 ox-glass-edge rounded-xl"
      >
        {/* Terminal header */}
        <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-ox-border/30 sticky top-0 bg-ox-bg/80 backdrop-blur-sm">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
          <span className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
          <span className="text-[10px] ml-2 text-ox-text-muted font-mono">omnispect-x monitor --live</span>
        </div>

        <div className="p-3 font-mono text-[12px] leading-5">
          {events.length === 0 ? (
            <div className="flex items-center justify-center h-full min-h-[200px] text-ox-text-muted text-sm font-sans">
              {running ? (
                <span className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-ox-safe animate-pulse-dot" />
                  Agent started. Waiting for first event...
                </span>
              ) : (
                <span className="text-center">
                  <span className="block mb-1">No events yet.</span>
                  <span className="text-ox-text-muted text-xs">Press <strong className="text-ox-text-secondary">Start</strong> above to launch the demo trading agent.</span>
                </span>
              )}
            </div>
          ) : (
            events.map((e, i) => {
              const style = EVENT_STYLES[e.event] || { color: "text-ox-text-muted", icon: "?" };
              const eventName = e.event.replace("agent:", "").toUpperCase();
              return (
                <div
                  key={`${e.timestamp}-${i}`}
                  className="flex gap-2 py-0.5 px-1 rounded hover:bg-ox-surface/50 group"
                >
                  <span className="text-ox-text-muted shrink-0 tabular-nums">
                    {new Date(e.timestamp).toLocaleTimeString()}
                  </span>
                  <span className={`shrink-0 ${style.color} font-semibold w-16`}>
                    {eventName}
                  </span>
                  <span className="text-ox-text-muted truncate opacity-80 group-hover:opacity-100 transition-opacity">
                    {formatEventData(e.data)}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
