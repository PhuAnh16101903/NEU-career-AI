// Decorative only: deterministic particles keep prerender and client markup identical.
const PARTICLE_COUNT = 36;

export default function ChristmasSnow() {
  return (
    <div className="christmas-snow" aria-hidden="true">
      {Array.from({ length: PARTICLE_COUNT }, (_, i) => {
        const drift = ((i * 17) % 61) - 30;
        return (
          <i
            key={i}
            style={{
              "--snow-x": `${(i * 37 + 13) % 100}%`,
              "--snow-size": `${2 + ((i * 7) % 5)}px`,
              "--snow-time": `${14 + ((i * 11) % 15)}s`,
              "--snow-delay": `${-((i * 1.41) % 28)}s`,
              "--snow-drift": `${drift}px`,
              "--snow-mid": `${Math.round(drift * 0.38 + ((i % 5) - 2) * 5)}px`,
              "--snow-sway": `${((i * 13) % 23) - 11}px`,
              "--snow-tilt": `${(i % 2 ? 1 : -1) * (8 + i % 13)}deg`,
              "--snow-rotation": `${(i % 2 ? 1 : -1) * (90 + (i % 5) * 35)}deg`,
              "--snow-opacity": `${0.24 + ((i * 13) % 33) / 100}`,
            }}
          />
        );
      })}
    </div>
  );
}
