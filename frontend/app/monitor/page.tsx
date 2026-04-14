import { AgentMonitor } from "../../components/AgentMonitor";

export default function MonitorPage() {
  return (
    <div className="h-[calc(100vh-12rem)]">
      <h1 className="text-2xl font-bold text-white mb-6">Live Agent Monitor</h1>
      <AgentMonitor />
    </div>
  );
}
