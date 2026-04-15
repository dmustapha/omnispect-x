import { AgentMonitor } from "../../components/AgentMonitor";

export default function MonitorPage() {
  return (
    <div className="h-[calc(100dvh-7rem)]">
      <div className="mb-4">
        <h1 className="font-display text-2xl font-bold text-ox-text-primary mb-1">Live Agent Monitor</h1>
        <p className="text-sm text-ox-text-muted">
          Real-time event feed from the demo trading agent
        </p>
      </div>
      <AgentMonitor />
    </div>
  );
}
