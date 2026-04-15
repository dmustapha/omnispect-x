import { CompareView } from "../../components/CompareView";

export default function ComparePage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-ox-text-primary mb-1">Multi-Agent Comparison</h1>
        <p className="text-sm text-ox-text-muted">
          Compare trust profiles side-by-side across up to 3 agents
        </p>
      </div>
      <CompareView />
    </div>
  );
}
