import { useEffect, type RefObject } from 'react';

/**
 * Writes pointer position to CSS vars `--fm-cursor-x` / `--fm-cursor-y` on `rootRef`
 * for `.fm-cursor-glow` (landing or auth ambient backgrounds).
 */
export function useCursorSpotlight(rootRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    let teardownPointer: (() => void) | undefined;

    const attachPointer = () => {
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
        root.style.removeProperty('--fm-cursor-x');
        root.style.removeProperty('--fm-cursor-y');
      };
    };

    const sync = () => {
      teardownPointer?.();
      teardownPointer = undefined;

      if (typeof window.matchMedia !== 'function') {
        teardownPointer = attachPointer();
        return;
      }

      const fine = window.matchMedia('(pointer: fine)');
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (fine.matches && !reduced.matches) {
        teardownPointer = attachPointer();
      } else {
        root.style.removeProperty('--fm-cursor-x');
        root.style.removeProperty('--fm-cursor-y');
      }
    };

    if (typeof window.matchMedia === 'function') {
      const fine = window.matchMedia('(pointer: fine)');
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
      const onMediaChange = () => sync();
      fine.addEventListener('change', onMediaChange);
      reduced.addEventListener('change', onMediaChange);
      sync();

      return () => {
        fine.removeEventListener('change', onMediaChange);
        reduced.removeEventListener('change', onMediaChange);
        teardownPointer?.();
      };
    }

    sync();
    return () => teardownPointer?.();
  }, [rootRef]);
}
