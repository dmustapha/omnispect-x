"use client";

import { useState, useEffect, useRef } from "react";
import { createWSConnection, startAgent, stopAgent, fetchAgentState } from "../lib/api";

interface WSEvent {
  event: string;
  data: Record<string, unknown>;
  timestamp: number;
}

const EVENT_COLORS: Record<string, string> = {
  "agent:signal": "text-blue-400",
  "agent:analysis": "text-purple-400",
  "agent:trust-check": "text-yellow-400",
  "agent:swap": "text-green-400",
  "agent:lineage-logged": "text-indigo-400",
  "agent:cycle-complete": "text-slate-300",
  "agent:error": "text-red-400",
};

export function AgentMonitor() {
  const [events, setEvents] = useState<WSEvent[]>([]);
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchAgentState().then((s) => setRunning(s.running)).catch(() => {});

    const ws = createWSConnection((data: WSEvent) => {
      setEvents((prev) => [...prev.slice(-100), data]); // keep last 100
    });

    return () => ws.close();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [events]);

  async function handleToggle() {
    setLoading(true);
    try {
      if (running) {
        await stopAgent();
        setRunning(false);
      } else {
        await startAgent();
        setRunning(true);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${running ? "bg-green-500 animate-pulse" : "bg-slate-600"}`} />
          <span className="text-sm text-slate-300">{running ? "Agent Running" : "Agent Stopped"}</span>
        </div>
        <button
          onClick={handleToggle}
          disabled={loading}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            running
              ? "bg-red-600 hover:bg-red-700 text-white"
              : "bg-green-600 hover:bg-green-700 text-white"
          } disabled:opacity-50`}
        >
          {loading ? "..." : running ? "Stop Agent" : "Start Agent"}
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-1 font-mono text-xs">
        {events.length === 0 && (
          <div className="text-slate-500 text-center py-8">
            {running ? "Waiting for events..." : "Start the agent to see live events."}
          </div>
        )}
        {events.map((e, i) => (
          <div key={i} className="flex gap-2 py-1 px-2 rounded hover:bg-slate-800/50">
            <span className="text-slate-600 shrink-0">
              {new Date(e.timestamp).toLocaleTimeString()}
            </span>
            <span className={`shrink-0 ${EVENT_COLORS[e.event] || "text-slate-400"}`}>
              [{e.event.replace("agent:", "")}]
            </span>
            <span className="text-slate-400 truncate">
              {JSON.stringify(e.data)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
