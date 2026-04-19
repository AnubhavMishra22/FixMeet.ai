import { useEffect, useState } from 'react';

/** Ticks every second; keeps interval state local so the parent dashboard does not re-render each tick. */
export function DashboardLocalClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <p className="text-gray-600 text-sm mt-1 tabular-nums">
      Local time:{' '}
      {now.toLocaleString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
      })}
    </p>
  );
}
