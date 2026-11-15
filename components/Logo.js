// Fyndo mark: a map pin with a play cut-out (places + short videos).
export function PlayPin({ size = 26 }) {
  return (
    <svg viewBox="0 0 40 48" width={size} height={size * 1.2} aria-hidden="true">
      <path d="M20 47C14 39 3 30 3 19A17 17 0 0 1 37 19C37 30 26 39 20 47Z" fill="#F6B800" />
      <path d="M16 12V26L28 19Z" fill="#0D2422" />
    </svg>
  );
}
