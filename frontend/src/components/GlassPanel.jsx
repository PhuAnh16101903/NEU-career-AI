export default function GlassPanel({ children }) {
  return (
    <section className="panel auth-form frosted-panel">
      <div className="glass-content">{children}</div>
    </section>
  );
}
