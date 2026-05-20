import { useEffect } from 'react';

/**
 * Writes pointer position to CSS vars `--fm-cursor-x` / `--fm-cursor-y` on `rootRef`
 * for `.fm-cursor-glow` (landing or auth ambient backgrounds).
 */
export function useCursorSpotlight(rootRef: React.RefObject<HTMLElement | null>) {
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
