import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { CreditCard, ExternalLink, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../stores/auth-store';
import { useToast } from '../../stores/toast-store';
import { createBillingCheckoutSession, createBillingPortalSession, getApiErrorMessage } from '../../lib/api';

function planLabel(plan: string): string {
  if (plan === 'free') return 'Free';
  if (plan === 'pro') return 'Pro';
  if (plan === 'max') return 'Max';
  return plan;
}

export function BillingSection() {
  const { user, fetchUser } = useAuthStore();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [checkoutTier, setCheckoutTier] = useState<'pro' | 'max' | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  useEffect(() => {
    const billing = searchParams.get('billing');
    if (billing !== 'success' && billing !== 'cancel') return;

    if (billing === 'success') {
      toast({
        title: 'Returned from Checkout',
        description:
          'Stripe is processing your subscription. Your plan updates when the webhook runs (usually within a few seconds).',
      });
      void fetchUser();
    } else {
      toast({
        title: 'Checkout cancelled',
        description: 'No payment was completed. You can try again anytime.',
      });
    }

    const next = new URLSearchParams(searchParams);
    next.delete('billing');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, fetchUser, toast]);

  async function startCheckout(tier: 'pro' | 'max') {
    setCheckoutTier(tier);
    try {
      const url = await createBillingCheckoutSession(tier);
      window.location.href = url;
    } catch (e: unknown) {
      toast({
        title: getApiErrorMessage(e, 'Could not start Checkout'),
        variant: 'destructive',
      });
      setCheckoutTier(null);
    }
  }

  async function openPortal() {
    setPortalLoading(true);
    try {
      const url = await createBillingPortalSession();
      window.location.href = url;
    } catch (e: unknown) {
      toast({
        title: getApiErrorMessage(e, 'Could not open billing portal'),
        variant: 'destructive',
      });
    } finally {
      setPortalLoading(false);
    }
  }

  if (!user) {
    return (
      <Card id="plan-and-billing">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Plan &amp; billing
          </CardTitle>
          <CardDescription>Sign in to manage your subscription.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const configured = user.billingStripeConfigured;
  const periodEnd = user.subscriptionCurrentPeriodEnd
    ? format(new Date(user.subscriptionCurrentPeriodEnd), 'PPP')
    : null;

  return (
    <Card id="plan-and-billing">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Plan &amp; billing
        </CardTitle>
        <CardDescription>
          Test-mode Stripe Checkout and Customer Portal. Compare tiers on{' '}
          <Link to="/dashboard/pricing" className="text-primary underline-offset-2 hover:underline">
            Plans &amp; pricing
          </Link>
          .
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Current plan</span>
          <Badge variant="secondary" className="font-semibold">
            {planLabel(user.billingPlan)}
          </Badge>
          {user.billingShowcaseMode && (
            <span className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-0.5">
              Showcase: API gates relaxed
            </span>
          )}
        </div>

        {user.subscriptionStatus && (
          <p className="text-sm text-gray-600">
            Subscription status:{' '}
            <span className="font-medium text-gray-900">{user.subscriptionStatus}</span>
            {periodEnd && (
              <>
                {' '}
                · Current period ends <span className="font-medium text-gray-900">{periodEnd}</span>
              </>
            )}
          </p>
        )}

        {!configured && (
          <p className="text-sm text-gray-600 rounded-md border border-dashed border-gray-200 bg-gray-50 px-3 py-2">
            Billing is not configured on this server (missing Stripe secret key or price IDs). Upgrade buttons
            stay disabled until the backend env is set.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={!configured || checkoutTier !== null}
            onClick={() => startCheckout('pro')}
          >
            {checkoutTier === 'pro' ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Redirecting…
              </>
            ) : (
              'Upgrade to Pro (test)'
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!configured || checkoutTier !== null}
            onClick={() => startCheckout('max')}
          >
            {checkoutTier === 'max' ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Redirecting…
              </>
            ) : (
              'Upgrade to Max (test)'
            )}
          </Button>
          {user.hasStripeCustomer && (
            <Button
              type="button"
              variant="secondary"
              disabled={!configured || portalLoading}
              onClick={() => void openPortal()}
            >
              {portalLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Opening…
                </>
              ) : (
                <>
                  Manage billing
                  <ExternalLink className="h-3.5 w-3.5 ml-1.5 opacity-70" />
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
