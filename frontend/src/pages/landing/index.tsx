import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  CalendarDays,
  FileText,
  MailCheck,
  BarChart3,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { APP_NAME, LOGO_PATH } from '../../lib/constants';
import './landing.css';

/**
 * Tracks the pointer position and writes it into CSS variables
 * (`--fm-cursor-x`, `--fm-cursor-y`) on the landing root, so the
 * `.fm-cursor-glow` radial gradient can follow the cursor without
 * triggering React re-renders.
 *
 * Skips touch-only devices (would leave a stuck spotlight) and
 * collapses pointermove bursts to one update per animation frame.
 */
function useCursorSpotlight(rootRef: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    if (typeof window.matchMedia === 'function') {
      const fine = window.matchMedia('(pointer: fine)');
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (!fine.matches || reduced.matches) return;
    }

    let raf = 0;
    let nextX = window.innerWidth / 2;
    let nextY = window.innerHeight / 2;

    const flush = () => {
      raf = 0;
      root.style.setProperty('--fm-cursor-x', `${nextX}px`);
      root.style.setProperty('--fm-cursor-y', `${nextY}px`);
    };

    const onMove = (e: PointerEvent) => {
      nextX = e.clientX;
      nextY = e.clientY;
      if (!raf) raf = requestAnimationFrame(flush);
    };

    flush();
    window.addEventListener('pointermove', onMove, { passive: true });

    return () => {
      window.removeEventListener('pointermove', onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [rootRef]);
}

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
  iconClass: string;
}

const features: Feature[] = [
  {
    icon: Sparkles,
    title: 'AI Copilot',
    description:
      'Schedule, reschedule, and triage your calendar by chatting in plain English.',
    iconClass: 'bg-primary/10 text-primary',
  },
  {
    icon: CalendarDays,
    title: 'Smart Scheduling',
    description:
      'Public booking pages, availability rules, buffers, and Google Calendar sync.',
    iconClass: 'bg-sky-100 text-sky-700',
  },
  {
    icon: FileText,
    title: 'Meeting Briefs',
    description:
      'Pre-meeting prep notes generated automatically from invitee and meeting context.',
    iconClass: 'bg-indigo-100 text-indigo-700',
  },
  {
    icon: MailCheck,
    title: 'AI Follow-ups',
    description:
      'Polished post-meeting emails with action items, ready to review and send.',
    iconClass: 'bg-violet-100 text-violet-700',
  },
  {
    icon: BarChart3,
    title: 'Insights',
    description:
      'Trends, peak hours, and cancellation patterns — surfaced at a glance.',
    iconClass: 'bg-cyan-100 text-cyan-700',
  },
];

/**
 * Public landing page for FixMeet.
 *
 * First-load surface for unauthenticated visitors. Features the brand,
 * a one-line value prop, and CTAs into /register and /login. The animated
 * background lives in `landing.css` and respects prefers-reduced-motion.
 */
export default function LandingPage() {
  const rootRef = useRef<HTMLDivElement>(null);
  useCursorSpotlight(rootRef);

  return (
    <div ref={rootRef} className="fm-landing fm-grid fm-wires text-slate-900">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-slate-900 focus:shadow"
      >
        Skip to content
      </a>

      <span aria-hidden className="fm-blob b1" />
      <span aria-hidden className="fm-blob b2" />
      <span aria-hidden className="fm-blob b3" />
      <span aria-hidden className="fm-cursor-glow" />

      {/* Top navigation */}
      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-2 md:px-8">
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
        className="relative z-10 mx-auto -mt-8 flex w-full max-w-6xl flex-col items-center px-5 pb-16 pt-0 text-center md:-mt-12 md:px-8 md:pb-24"
      >
        <h1 className="sr-only">{APP_NAME}</h1>
        <div className="fm-rise fm-rise-1 flex flex-col items-center gap-0">
          <img
            src={LOGO_PATH}
            alt=""
            aria-hidden
            className="block h-52 w-auto max-w-[min(92vw,28rem)] drop-shadow-sm sm:h-60 md:h-72 lg:h-80"
          />
          <p className="fm-rise fm-rise-2 -mt-6 max-w-2xl text-lg leading-snug text-slate-700 sm:-mt-7 md:-mt-8 md:text-xl">
            The <span className="font-semibold text-primary">AI-native scheduling SaaS</span>{' '}
            that books, briefs, and follows up — for you.
          </p>
        </div>

        <p className="fm-rise fm-rise-3 mt-3 max-w-2xl text-base text-slate-600 md:mt-4">
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

        {/* Feature highlights */}
        <section
          aria-labelledby="features-heading"
          className="fm-rise fm-rise-4 mt-16 w-full md:mt-24"
        >
          <h2
            id="features-heading"
            className="text-sm font-semibold uppercase tracking-wider text-slate-500"
          >
            What you get out of the box
          </h2>

          <ul
            role="list"
            className="mt-5 grid grid-cols-1 gap-4 text-left sm:grid-cols-2 lg:grid-cols-5"
          >
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <li
                  key={f.title}
                  className="fm-glass group relative rounded-2xl border border-white/60 p-5 shadow-sm transition-shadow hover:shadow-md"
                >
                  <span
                    className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl ${f.iconClass}`}
                    aria-hidden
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="text-base font-semibold text-slate-900">{f.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">{f.description}</p>
                </li>
              );
            })}
          </ul>
        </section>
      </main>

      <footer className="relative z-10 mx-auto w-full max-w-6xl px-5 pb-8 text-center text-xs text-slate-500 md:px-8">
        <p>
          © {new Date().getFullYear()} {APP_NAME} · Built for AI-native scheduling. ·{' '}
          <Link to="/login" className="font-medium text-slate-700 hover:text-slate-900">
            Sign in
          </Link>{' '}
          ·{' '}
          <Link to="/register" className="font-medium text-slate-700 hover:text-slate-900">
            Create account
          </Link>
        </p>
      </footer>
    </div>
  );
}
