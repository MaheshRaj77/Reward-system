// ============================================
// SUBSCRIPTION PLANS & FEATURES
// ============================================

export type SubscriptionPlan = 'free' | 'premium';

export interface SubscriptionFeatures {
  maxChildren: number;
  maxTasksPerChild: number;
  recurringTasks: boolean;
  achievements: boolean;
  unlimitedRewards: boolean;
  emailNotifications: boolean;
  prioritySupport: boolean;
  screenTimeTracking: boolean;
  trustEngine: boolean;
  advancedReporting: boolean;
}

export const SUBSCRIPTION_PLANS = {
  free: {
    name: 'Free Plan',
    price: 0,
    currency: 'USD',
    period: 'month',
    badge: 'Current Plan',
    description: 'Perfect for getting started',
    features: {
      maxChildren: 2,
      maxTasksPerChild: 5,
      recurringTasks: false,
      achievements: false,
      unlimitedRewards: false,
      emailNotifications: false,
      prioritySupport: false,
      screenTimeTracking: true,
      trustEngine: true,
      advancedReporting: false,
    } as SubscriptionFeatures,
    limits: {
      children: 'Up to 2 children',
      tasks: 'Up to 5 tasks per child',
      rewards: 'Limited gift options',
    },
  },
  premium: {
    name: 'Premium Plan',
    price: 9.99,
    currency: 'USD',
    period: 'month',
    badge: 'Premium',
    description: 'Advanced features for growing families',
    features: {
      maxChildren: 999, // Essentially unlimited
      maxTasksPerChild: 999,
      recurringTasks: true,
      achievements: true,
      unlimitedRewards: true,
      emailNotifications: true,
      prioritySupport: true,
      screenTimeTracking: true,
      trustEngine: true,
      advancedReporting: true,
    } as SubscriptionFeatures,
    limits: {
      children: 'Unlimited children',
      tasks: 'Unlimited tasks',
      rewards: 'Unlimited gift options',
    },
  },
} as const;

export const SUBSCRIPTION_FEATURES_COMPARISON = [
  {
    name: 'Children',
    free: 'Up to 2',
    premium: 'Unlimited',
    icon: '👨‍👩‍👧‍👦',
  },
  {
    name: 'Tasks per Child',
    free: 'Up to 5',
    premium: 'Unlimited',
    icon: '✅',
  },
  {
    name: 'Recurring Tasks',
    free: false,
    premium: true,
    icon: '🔁',
  },
  {
    name: 'Achievements & Streaks',
    free: false,
    premium: true,
    icon: '🏆',
  },
  {
    name: 'Rewards',
    free: 'Limited options',
    premium: 'Unlimited',
    icon: '🎁',
  },
  {
    name: 'Email Notifications',
    free: false,
    premium: true,
    icon: '📧',
  },
  {
    name: 'Priority Support',
    free: false,
    premium: true,
    icon: '🚀',
  },
  {
    name: 'Advanced Reporting',
    free: false,
    premium: true,
    icon: '📊',
  },
] as const;

export function getPlanFeatures(plan: SubscriptionPlan): SubscriptionFeatures {
  return SUBSCRIPTION_PLANS[plan].features;
}

export function isFeatureEnabled(plan: SubscriptionPlan, feature: keyof SubscriptionFeatures): boolean {
  return SUBSCRIPTION_PLANS[plan].features[feature] as unknown as boolean;
}

export function canAddChild(plan: SubscriptionPlan, currentChildCount: number): boolean {
  const maxChildren = SUBSCRIPTION_PLANS[plan].features.maxChildren;
  return currentChildCount < maxChildren;
}

export function canAddTask(plan: SubscriptionPlan, currentTaskCount: number): boolean {
  const maxTasks = SUBSCRIPTION_PLANS[plan].features.maxTasksPerChild;
  return currentTaskCount < maxTasks;
}

export function canAddReward(plan: SubscriptionPlan): boolean {
  return SUBSCRIPTION_PLANS[plan].features.unlimitedRewards;
}

export function canUseRecurringTasks(plan: SubscriptionPlan): boolean {
  return SUBSCRIPTION_PLANS[plan].features.recurringTasks;
}

export function canViewAchievements(plan: SubscriptionPlan): boolean {
  return SUBSCRIPTION_PLANS[plan].features.achievements;
}
