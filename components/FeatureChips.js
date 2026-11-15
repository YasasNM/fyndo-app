import { featureOf } from "@/lib/features";

export default function FeatureChips({ ids = [] }) {
  const list = (ids || []).map(featureOf).filter(Boolean);
  if (!list.length) return null;
  return (
    <div className="row small" style={{ gap: 6, margin: "8px 0" }}>
      {list.map((f) => <span key={f.id} className="fchip">{f.label}</span>)}
    </div>
  );
}
