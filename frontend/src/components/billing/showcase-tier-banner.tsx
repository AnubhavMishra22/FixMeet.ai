import { useState } from 'react';
import { useAuthStore } from '../../stores/auth-store';
import { Button } from '../ui/button';
import { X } from 'lucide-react';

const storageKey = (tier: 'pro' | 'max') => `fixmeet-showcase-tier-hint-${tier}`;

interface Props {
  tier: 'pro' | 'max';
}

/** Soft gate hint when the API runs in showcase mode (paid areas stay open). */
export function ShowcaseTierBanner({ tier }: Props) {
  const user = useAuthStore((s) => s.user);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(storageKey(tier)) === '1';
    } catch {
      return false;
    }
  });

  if (!user?.billingShowcaseMode || dismissed) {
    return null;
  }

  const label = tier === 'pro' ? 'Pro' : 'Max';

  function dismiss() {
    try {
      sessionStorage.setItem(storageKey(tier), '1');
    } catch {
      /* ignore */
    }
    setDismissed(true);
  }

  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
    >
      <p className="min-w-0 flex-1 leading-relaxed">
        <span className="font-medium">Showcase:</span> this demo keeps {label} areas unlocked. In production,
        an active {label} subscription would be required here.
      </p>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0 text-amber-900 hover:bg-amber-100 hover:text-amber-950"
        onClick={dismiss}
        aria-label="Dismiss notice"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
