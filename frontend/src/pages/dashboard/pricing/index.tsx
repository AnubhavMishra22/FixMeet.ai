import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Loader2, Settings } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { useAuthStore } from '../../../stores/auth-store';
import { useToast } from '../../../stores/toast-store';
import { createBillingCheckoutSession, getApiErrorMessage } from '../../../lib/api';

const proFeatures = [
  'AI Copilot for natural-language scheduling',
  'Meeting briefs (prep notes before meetings)',
  'Priority positioning in the product story',
];

const maxFeatures = [
  'Everything in Pro',
  'AI follow-up emails after meetings',
  'Insights dashboard & exports',
];

export default function PricingPage() {
  const user = useAuthStore((s) => s.user);
  const { toast } = useToast();
  const [tierLoading, setTierLoading] = useState<'pro' | 'max' | null>(null);

  useEffect(() => {
    const reset = () => setTierLoading(null);
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) reset();
    };
    window.addEventListener('pageshow', onPageShow);
    return () => {
      window.removeEventListener('pageshow', onPageShow);
      reset();
    };
  }, []);

  const configured = user?.billingStripeConfigured ?? false;

  async function checkout(tier: 'pro' | 'max') {
    setTierLoading(tier);
    try {
      const url = await createBillingCheckoutSession(tier);
      window.location.href = url;
    } catch (e: unknown) {
      toast({
        title: getApiErrorMessage(e, 'Could not start Checkout'),
        variant: 'destructive',
      });
      setTierLoading(null);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Plans &amp; pricing</h1>
        <p className="text-gray-600 mt-1 max-w-2xl">
          This project uses Stripe test mode for Checkout and the Customer Portal. No real charges when you use
          Stripe&apos;s test card. Your plan in the app updates after webhooks run.
        </p>
        {(user?.billingShowcaseMode || user?.billingEnforcePaidFeatures === false) && (
          <p className="mt-2 text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 max-w-2xl">
            {user?.billingShowcaseMode ? (
              <>
                <span className="font-medium">Showcase mode is on:</span> Pro and Max areas in the app stay open even
                on the Free plan. Checkout still works so you can demo the full billing flow.
              </>
            ) : (
              <>
                <span className="font-medium">Plan tier enforcement is off:</span> Pro and Max areas stay available
                without upgrading. You can still use Checkout to try the billing flow.
              </>
            )}
          </p>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="flex flex-col">
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle>Pro</CardTitle>
              {user?.billingPlan === 'pro' && <Badge>Current</Badge>}
            </div>
            <CardDescription>For power users who want AI scheduling and meeting briefs.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 space-y-3">
            <ul className="space-y-2 text-sm text-gray-700">
              {proFeatures.map((f) => (
                <li key={f} className="flex gap-2">
                  <Check className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter>
            <Button
              className="w-full"
              disabled={!configured || tierLoading !== null}
              onClick={() => void checkout('pro')}
            >
              {tierLoading === 'pro' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Redirecting…
                </>
              ) : (
                'Upgrade to Pro (test Checkout)'
              )}
            </Button>
          </CardFooter>
        </Card>

        <Card className="flex flex-col border-primary/30 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle>Max</CardTitle>
              {user?.billingPlan === 'max' && <Badge>Current</Badge>}
            </div>
            <CardDescription>Full automation: follow-ups, insights, and everything in Pro.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 space-y-3">
            <ul className="space-y-2 text-sm text-gray-700">
              {maxFeatures.map((f) => (
                <li key={f} className="flex gap-2">
                  <Check className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter>
            <Button
              className="w-full"
              variant="default"
              disabled={!configured || tierLoading !== null}
              onClick={() => void checkout('max')}
            >
              {tierLoading === 'max' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Redirecting…
                </>
              ) : (
                'Upgrade to Max (test Checkout)'
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>

      {!configured && (
        <p className="text-sm text-gray-600">
          Stripe is not fully configured in the backend environment. Add{' '}
          <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">STRIPE_SECRET_KEY</code>,{' '}
          <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">STRIPE_PRICE_ID_PRO</code>, and{' '}
          <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">STRIPE_PRICE_ID_MAX</code>, then restart the
          API.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
        <Link
          to="/dashboard/settings#plan-and-billing"
          className="inline-flex items-center gap-1.5 text-primary underline-offset-2 hover:underline"
        >
          <Settings className="h-4 w-4" />
          Manage subscription &amp; Customer Portal
        </Link>
        <span className="hidden sm:inline text-gray-300">|</span>
        <span>After Checkout, you return to Settings; use Manage billing for invoices and cancellation.</span>
      </div>
    </div>
  );
}
