import { CompareView } from "../../components/CompareView";

export default function ComparePage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-ox-text-primary mb-1">Compare Agents</h1>
        <p className="text-sm text-ox-text-muted">
          Paste 2-3 wallet addresses to compare their trust scores side by side. See which agent scores higher in each dimension and by how much. Useful for choosing between agents before delegating funds.
        </p>
      </div>
      <CompareView />
    </div>
  );
}
