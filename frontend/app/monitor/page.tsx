import { AgentMonitor } from "../../components/AgentMonitor";

export default function MonitorPage() {
  return (
    <div className="h-[calc(100dvh-7rem)]">
      <div className="mb-4">
        <h1 className="font-display text-2xl font-bold text-ox-text-primary mb-1">Live Agent Monitor</h1>
        <p className="text-sm text-ox-text-muted">
          Watch the demo trading agent work in real time. It runs a 5-step cycle: collect market signals, analyze with AI, check wallet trust, execute a swap, then log the decision on-chain. Press Start to begin.
        </p>
      </div>
      <AgentMonitor />
    </div>
  );
}
