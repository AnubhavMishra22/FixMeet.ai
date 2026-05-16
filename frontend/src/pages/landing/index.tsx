import './landing.css';

/**
 * Public landing page for FixMeet.
 *
 * First-load surface for unauthenticated visitors. Renders an animated tech
 * background and (in follow-up commits) a hero, feature highlights, and CTAs
 * that route to /login and /register.
 */
export default function LandingPage() {
  return (
    <div className="fm-landing fm-grid fm-wires text-slate-900">
      <span aria-hidden className="fm-blob b1" />
      <span aria-hidden className="fm-blob b2" />
      <span aria-hidden className="fm-blob b3" />
    </div>
  );
}
