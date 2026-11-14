// Static decorative backdrop: no video, pointer tracking or background animation.
export default function AuthGlass({ children }) {
  return (
    <div className="standalone-auth auth-motion auth-glass auth-frosted">
      <div className="auth-glass-scene" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      {children}
    </div>
  );
}
