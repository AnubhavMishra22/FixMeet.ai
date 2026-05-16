import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { APP_NAME, LOGO_PATH } from '../../lib/constants';
import './landing.css';

/**
 * Public landing page for FixMeet.
 *
 * First-load surface for unauthenticated visitors. Features the brand,
 * a one-line value prop, and CTAs into /register and /login. The animated
 * background lives in `landing.css` and respects prefers-reduced-motion.
 */
export default function LandingPage() {
  return (
    <div className="fm-landing fm-grid fm-wires text-slate-900">
      <span aria-hidden className="fm-blob b1" />
      <span aria-hidden className="fm-blob b2" />
      <span aria-hidden className="fm-blob b3" />

      {/* Top navigation */}
      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 md:px-8">
        <Link
          to="/"
          aria-label={APP_NAME}
          className="flex items-center gap-2 text-lg font-bold text-primary-wordmark transition-opacity hover:opacity-90"
        >
          <img src={LOGO_PATH} alt="" aria-hidden className="h-9 w-9 object-contain" />
          <span>{APP_NAME}</span>
        </Link>
        <nav className="flex items-center gap-2 sm:gap-3" aria-label="Primary">
          <Link
            to="/login"
            className="hidden rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-white/60 hover:text-slate-900 sm:inline-flex"
          >
            Sign in
          </Link>
          <Link to="/register">
            <Button size="sm">
              Get started
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <main
        id="main"
        className="relative z-10 mx-auto flex w-full max-w-6xl flex-col items-center px-5 pt-10 pb-16 text-center md:px-8 md:pt-16 md:pb-24"
      >
        <span className="fm-rise fm-rise-1 mb-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-xs font-medium text-slate-700 shadow-sm backdrop-blur">
          <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden />
          AI-native scheduling, briefs, and follow-ups
        </span>

        <img
          src={LOGO_PATH}
          alt={`${APP_NAME} logo`}
          className="fm-rise fm-rise-1 mb-3 h-24 w-auto drop-shadow-sm md:h-32"
        />

        <h1 className="fm-rise fm-rise-2 text-4xl font-bold tracking-tight md:text-6xl">
          {APP_NAME}
        </h1>

        <p className="fm-rise fm-rise-3 mt-4 max-w-2xl text-lg text-slate-700 md:text-xl">
          The <span className="font-semibold text-primary">AI-native scheduling SaaS</span>{' '}
          that books, briefs, and follows up — for you.
        </p>

        <p className="fm-rise fm-rise-3 mt-3 max-w-2xl text-base text-slate-600">
          Share a link. Let invitees pick a time. Show up prepared with AI briefs and close the
          loop with personalized follow-ups — all on autopilot.
        </p>

        <div className="fm-rise fm-rise-4 mt-8 flex w-full max-w-md flex-col gap-3 sm:flex-row sm:justify-center">
          <Link to="/register" className="sm:w-auto">
            <Button size="lg" className="w-full sm:w-auto">
              Create your free account
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link to="/login" className="sm:w-auto">
            <Button size="lg" variant="outline" className="w-full sm:w-auto">
              Sign in
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
