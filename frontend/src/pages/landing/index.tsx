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
  iconClass: string;
  /** Absolute placement on md+ viewports (corners / edges). */
  cornerClass: string;
}

const features: Feature[] = [
  {
    icon: Sparkles,
    title: 'AI Copilot',
    iconClass: 'bg-primary/10 text-primary',
    cornerClass: 'md:left-6 md:top-[5.5rem] md:max-w-[11rem]',
  },
  {
    icon: CalendarDays,
    title: 'Smart Scheduling',
    iconClass: 'bg-sky-100 text-sky-700',
    cornerClass: 'md:right-6 md:top-[5.5rem] md:max-w-[11rem]',
  },
  {
    icon: FileText,
    title: 'Meeting Briefs',
    iconClass: 'bg-indigo-100 text-indigo-700',
    cornerClass: 'md:left-6 md:bottom-6 md:max-w-[11rem]',
  },
  {
    icon: MailCheck,
    title: 'AI Follow-ups',
    iconClass: 'bg-violet-100 text-violet-700',
    cornerClass: 'md:right-6 md:bottom-6 md:max-w-[11rem]',
  },
  {
    icon: BarChart3,
    title: 'Insights',
    iconClass: 'bg-cyan-100 text-cyan-700',
    cornerClass: 'md:left-1/2 md:-translate-x-1/2 md:bottom-6 md:max-w-[9rem]',
  },
];

function FeatureChip({ icon: Icon, title, iconClass }: Feature) {
  return (
    <li className="fm-glass flex items-center gap-2 rounded-xl border border-white/60 px-3 py-2 shadow-sm">
      <span
        className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${iconClass}`}
        aria-hidden
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="text-sm font-semibold text-slate-800">{title}</span>
    </li>
  );
}

export default function LandingPage() {
  const rootRef = useRef<HTMLDivElement>(null);
  useCursorSpotlight(rootRef);

  return (
    <div
      ref={rootRef}
      className="fm-landing fm-grid fm-wires flex h-screen max-h-screen flex-col overflow-hidden text-slate-900"
    >
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

      <header className="relative z-10 flex shrink-0 items-center justify-between px-5 py-4 md:px-8">
        <Link
          to="/"
          aria-label={APP_NAME}
          className="flex items-center gap-2 text-lg font-bold text-primary-wordmark transition-opacity hover:opacity-90"
        >
          <img src={LOGO_PATH} alt="" aria-hidden className="h-8 w-8 object-contain" />
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

      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        {/* Corner highlights — desktop */}
        <ul
          aria-label="Product highlights"
          className="pointer-events-none absolute inset-0 hidden md:block"
        >
          {features.map((f) => (
            <li key={f.title} className={`pointer-events-auto absolute ${f.cornerClass}`}>
              <FeatureChip {...f} />
            </li>
          ))}
        </ul>

        <main
          id="main"
          className="flex flex-1 flex-col items-center justify-center px-5 text-center md:px-8"
        >
          <img
            src={LOGO_PATH}
            alt={`${APP_NAME} logo`}
            className="fm-rise fm-rise-1 mb-2 h-16 w-auto drop-shadow-sm sm:h-20 md:h-24"
          />

          <h1 className="fm-rise fm-rise-2 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            {APP_NAME}
          </h1>

          <p className="fm-rise fm-rise-3 mt-2 max-w-md text-base text-slate-700 sm:text-lg">
            <span className="font-semibold text-primary">AI-native scheduling SaaS</span> — book,
            brief, and follow up in one place.
          </p>

          <div className="fm-rise fm-rise-4 mt-5 flex w-full max-w-sm flex-col gap-2 sm:max-w-md sm:flex-row sm:justify-center sm:gap-3">
            <Link to="/register" className="sm:flex-1 sm:max-w-[12rem]">
              <Button size="default" className="w-full">
                Get started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/login" className="sm:flex-1 sm:max-w-[12rem]">
              <Button size="default" variant="outline" className="w-full">
                Sign in
              </Button>
            </Link>
          </div>
        </main>

        {/* Compact strip — mobile / narrow */}
        <ul
          aria-label="Product highlights"
          className="relative z-10 flex shrink-0 flex-wrap justify-center gap-2 px-4 pb-4 md:hidden"
        >
          {features.map((f) => (
            <FeatureChip key={f.title} {...f} />
          ))}
        </ul>
      </div>
    </div>
  );
}
