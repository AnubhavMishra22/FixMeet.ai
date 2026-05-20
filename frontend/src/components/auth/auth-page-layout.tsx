import { useRef, type ReactNode } from 'react';
import { useCursorSpotlight } from '../../hooks/use-cursor-spotlight';
import '../../pages/auth/auth-ambient.css';

interface Props {
  children: ReactNode;
}

/** Full-viewport ambient background (auth palette) with centered auth form content. */
export function AuthPageLayout({ children }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  useCursorSpotlight(rootRef);

  return (
    <div ref={rootRef} className="fm-auth fm-auth-grid fm-auth-wires text-slate-900">
      <span aria-hidden className="fm-auth-blob b1" />
      <span aria-hidden className="fm-auth-blob b2" />
      <span aria-hidden className="fm-auth-blob b3" />
      <span aria-hidden className="fm-cursor-glow" />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-8">
        {children}
      </div>
    </div>
  );
}
