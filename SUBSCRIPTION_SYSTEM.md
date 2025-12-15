# Subscription System Implementation

## Overview

A two-tier subscription system has been implemented to manage features and limits for the reward platform.

## Plans

### Free Plan ($0/month)

**Features:**

- ✅ Up to 2 children
- ✅ Basic task management
- ✅ Up to 5 tasks per child
- ✅ Screen time tracking
- ✅ Trust engine

**NOT Included:**

- ❌ Recurring tasks
- ❌ Achievements & streaks
- ❌ Unlimited rewards
- ❌ Email notifications
- ❌ Priority support
- ❌ Advanced reporting

### Premium Plan ($9.99/month)

**Features:**

- ✅ Unlimited children
- ✅ Advanced task management
- ✅ Unlimited tasks
- ✅ Recurring tasks
- ✅ Achievements & streaks
- ✅ Unlimited rewards
- ✅ Email notifications
- ✅ Priority support
- ✅ Advanced reporting
- ✅ Screen time tracking
- ✅ Trust engine

## Implementation Details

### Database Schema

Every parent automatically gets a `SubscriptionInfo` object upon registration:

```typescript
interface SubscriptionInfo {
  plan: "free" | "premium";
  status: "active" | "cancelled" | "expired";
  currentPeriodStart: Timestamp;
  currentPeriodEnd: Timestamp;
  cancelledAt?: Timestamp;
  stripeCustomerId?: string; // For future Stripe integration
  stripeSubscriptionId?: string; // For future Stripe integration
}
```

### Initial Setup

When a new parent registers via `ParentAuth.register()`:

1. A FREE plan subscription is created with 30-day period
2. Status is set to 'active'
3. All enforcement happens at the hook/engine level

### Enforcement Points

#### 1. Adding Children (use-children.ts)

```typescript
if (!canAddChild(plan, children.length)) {
  return {
    success: false,
    error: "You've reached the limit of 2 children on the free plan...",
  };
}
```

#### 2. Feature Availability

Use the subscription utility functions:

```typescript
import {
  canAddChild,
  canUseRecurringTasks,
  canViewAchievements,
  canAddReward,
} from "@/lib/constants/subscription";
```

### UI Components

#### 1. Pricing Page

`src/app/subscriptions/page.tsx` - Complete pricing and upgrade flow

#### 2. Plan Cards

`src/components/subscription/index.tsx`:

- `PlanCard` - Individual plan display
- `PricingSection` - Full pricing page component
- `SubscriptionBadge` - Plan status badge
- `UpgradePrompt` - Locked feature prompts

#### 3. Dashboard Components

`src/components/parent/index.tsx`:

- `SubscriptionBanner` - Prominent plan display in dashboard
- `SubscriptionStatus` - Detailed usage and limits

### Hooks

#### useSubscription()

```typescript
const {
  plan, // Current plan: 'free' | 'premium'
  isPremium, // Boolean
  upgradeToPremium,
  cancelSubscription,
  subscription,
  loading,
  error,
} = useSubscription();
```

### Helper Functions

Located in `src/lib/constants/subscription.ts`:

```typescript
// Check if a feature is available on a plan
isFeatureEnabled(plan, "recurringTasks"); // boolean

// Get max children for a plan
canAddChild(plan, currentCount); // boolean

// Get max tasks per child
canAddTask(plan, currentCount); // boolean

// Check reward limits
canAddReward(plan); // boolean

// Check feature availability
canUseRecurringTasks(plan); // boolean
canViewAchievements(plan); // boolean
```

## Flow

### New Parent Registration

1. User registers via email/password or Google
2. `ParentAuth.register()` creates family and parent with FREE plan
3. Subscription starts immediately with 30-day period

### Upgrade Flow

1. Parent clicks "Upgrade to Premium" button
2. Calls `useSubscription().upgradeToPremium()`
3. Updates parent subscription to 'premium' with new period
4. Features become immediately available

### Cancellation Flow

1. Parent clicks "Cancel Subscription" on premium plan
2. Calls `useSubscription().cancelSubscription()`
3. Downgrades to 'free' plan
4. Loses premium-only features immediately
5. Falls back to free plan limits

## Future Integration Points

### Stripe Integration

The `SubscriptionInfo` interface includes:

- `stripeCustomerId` - Link to Stripe customer
- `stripeSubscriptionId` - Link to Stripe subscription

Upgrade function can be extended to:

1. Create Stripe checkout session
2. Handle webhook updates from Stripe
3. Manage recurring billing

### Feature Restrictions

Add these checks before operations:

```typescript
// In task creation
if (!canAddTask(plan, taskCount)) {
  // Show upgrade prompt
}

// In reward creation
if (!canAddReward(plan) && rewardCount >= limit) {
  // Show upgrade prompt
}

// In recurring task setup
if (!canUseRecurringTasks(plan)) {
  // Show upgrade prompt
}
```

## Testing Checklist

- [ ] New user gets free plan on registration
- [ ] Free plan users can't add >2 children
- [ ] Free plan users can't add >5 tasks per child
- [ ] Free plan shows upgrade prompts for locked features
- [ ] Premium users can add unlimited children/tasks
- [ ] Upgrade changes plan to premium immediately
- [ ] Cancel subscription downgrade to free
- [ ] Subscription page shows correct plan status
- [ ] Dashboard banner shows current plan

## Files Created/Modified

### New Files

- `src/lib/constants/subscription.ts` - Subscription constants and helpers
- `src/lib/hooks/use-subscription.ts` - Subscription management hook
- `src/components/subscription/index.tsx` - UI components
- `src/app/subscriptions/page.tsx` - Pricing page

### Modified Files

- `src/types/index.ts` - Added SubscriptionInfo and SubscriptionPlan types
- `src/lib/auth/parent-auth.ts` - Initialize free plan on registration
- `src/lib/hooks/use-children.ts` - Added child limit enforcement
- `src/components/parent/index.tsx` - Updated SubscriptionBanner, added SubscriptionStatus
- `src/lib/hooks/index.ts` - Export useSubscription hook
