export function CorrectBurst(props: { burstId: number }) {
  const stars = [
    "⭐", "⭐", "🌟", "⭐", "🌟", "⭐", "⭐", "🌟",
  ];
  return (
    <div key={props.burstId} className="fx-layer" aria-hidden="true">
      {stars.map((glyph, i) => (
        <span key={i} className="fx-star">{glyph}</span>
      ))}
    </div>
  );
}

export function StreakToast(props: { text: string | null }) {
  if (!props.text) return null;
  return <div className="streak-toast">{props.text}</div>;
}
