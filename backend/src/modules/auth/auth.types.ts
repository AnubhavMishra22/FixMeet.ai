/** Stored on `users.billing_plan`; kept in sync with Stripe via webhooks. */
export type BillingPlan = 'free' | 'pro' | 'max';

export interface User {
  id: string;
  email: string;
  name: string;
  username: string;
  timezone: string;
  briefs_enabled: boolean;
  brief_emails_enabled: boolean;
  brief_generation_hours: number;
  followups_enabled: boolean;
  followup_tone: string;
  meeting_hours_goal: number | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  subscription_status: string | null;
  subscription_current_period_end: Date | null;
  billing_plan: BillingPlan;
  created_at: Date;
  updated_at: Date;
}

export interface UserWithPassword extends User {
  password_hash: string;
}

/** camelCase representation sent to the frontend */
export interface UserResponse {
  id: string;
  email: string;
  name: string;
  username: string;
  timezone: string;
  briefsEnabled: boolean;
  briefEmailsEnabled: boolean;
  briefGenerationHours: number;
  followupsEnabled: boolean;
  followupTone: string;
  meetingHoursGoal: number | null;
  billingPlan: BillingPlan;
  subscriptionStatus: string | null;
  subscriptionCurrentPeriodEnd: string | null;
  /** Reflects BILLING_SHOWCASE_MODE: when true, the API does not enforce paid tiers. */
  billingShowcaseMode: boolean;
  /** Reflects BILLING_ENFORCE_PAID_FEATURES: when false, assertPlanAtLeast is a no-op (UI should not imply Pro/Max is required). */
  billingEnforcePaidFeatures: boolean;
  /** True after Checkout has created or attached a Stripe Customer for this user. */
  hasStripeCustomer: boolean;
  /** True when Stripe secret key and both tier price IDs are set (Checkout/Portal can run). */
  billingStripeConfigured: boolean;
  createdAt: Date;
}

export interface RefreshToken {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  created_at: Date;
}

export interface AuthResponse {
  user: UserResponse;
  accessToken: string;
}

export interface TokenResponse {
  accessToken: string;
}
