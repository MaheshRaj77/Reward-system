// ============================================
// SUBSCRIPTION UI COMPONENTS
// ============================================

'use client';

import React from 'react';
import { Button, Badge, Card } from '@/components/ui';
import {
  SUBSCRIPTION_PLANS,
  SUBSCRIPTION_FEATURES_COMPARISON,
  type SubscriptionPlan
} from '@/lib/constants/subscription';

// ============================================
// SUBSCRIPTION BADGE
// ============================================

interface SubscriptionBadgeProps {
  plan: SubscriptionPlan;
  status?: 'active' | 'cancelled' | 'expired';
}

export function SubscriptionBadge({ plan, status = 'active' }: SubscriptionBadgeProps) {
  const planData = SUBSCRIPTION_PLANS[plan];
  const isActive = status === 'active';

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold ${plan === 'premium'
        ? 'bg-amber-100 text-amber-800'
        : 'bg-gray-100 text-gray-800'
      } ${!isActive ? 'opacity-50' : ''}`}>
      {plan === 'premium' && '⭐'}
      {planData.badge}
    </div>
  );
}

// ============================================
// PLAN CARD
// ============================================

interface PlanCardProps {
  plan: SubscriptionPlan;
  isCurrentPlan: boolean;
  onUpgrade?: () => void;
  isLoading?: boolean;
}

export function PlanCard({ plan, isCurrentPlan, onUpgrade, isLoading }: PlanCardProps) {
  const planData = SUBSCRIPTION_PLANS[plan];
  const isFreePlan = plan === 'free';

  return (
    <Card className={`relative overflow-hidden transition-all duration-300 ${!isFreePlan ? 'ring-2 ring-amber-400 shadow-lg' : ''
      } ${isCurrentPlan ? 'bg-gradient-to-br from-blue-50 to-indigo-50' : ''}`}>
      {/* Ribbon for current plan */}
      {isCurrentPlan && (
        <div className="absolute -top-2 -right-10 bg-green-500 text-white px-12 py-1 transform rotate-45 text-xs font-bold">
          ACTIVE
        </div>
      )}

      {/* Premium badge */}
      {!isFreePlan && (
        <div className="absolute top-4 right-4">
          <SubscriptionBadge plan={plan} />
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">{planData.name}</h3>
        <p className="text-gray-600 text-sm mb-4">{planData.description}</p>

        {/* Price */}
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold text-gray-900">
            ${planData.price.toFixed(2)}
          </span>
          <span className="text-gray-600">/{planData.period}</span>
        </div>
      </div>

      {/* Features */}
      <div className="mb-6 space-y-3 border-t border-b border-gray-200 py-6">
        {plan === 'free' ? (
          <>
            <div className="flex items-center gap-3">
              <span className="text-2xl">👨‍👩‍👧‍👦</span>
              <span className="text-gray-700 font-medium">Up to 2 children</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl">✅</span>
              <span className="text-gray-700 font-medium">Up to 5 tasks per child</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎁</span>
              <span className="text-gray-700 font-medium">Limited reward options</span>
            </div>
            <div className="flex items-center gap-3 opacity-50">
              <span className="text-2xl">🔁</span>
              <span className="text-gray-600">Recurring tasks</span>
            </div>
            <div className="flex items-center gap-3 opacity-50">
              <span className="text-2xl">🏆</span>
              <span className="text-gray-600">Achievements & streaks</span>
            </div>
            <div className="flex items-center gap-3 opacity-50">
              <span className="text-2xl">📧</span>
              <span className="text-gray-600">Email notifications</span>
            </div>
            <div className="flex items-center gap-3 opacity-50">
              <span className="text-2xl">🚀</span>
              <span className="text-gray-600">Priority support</span>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <span className="text-2xl">👨‍👩‍👧‍👦</span>
              <span className="text-gray-700 font-medium">Unlimited children</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl">✅</span>
              <span className="text-gray-700 font-medium">Unlimited tasks</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎁</span>
              <span className="text-gray-700 font-medium">Unlimited rewards</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl">🔁</span>
              <span className="text-gray-700 font-medium">Recurring tasks</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl">🏆</span>
              <span className="text-gray-700 font-medium">Achievements & streaks</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl">📧</span>
              <span className="text-gray-700 font-medium">Email notifications</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl">🚀</span>
              <span className="text-gray-700 font-medium">Priority support</span>
            </div>
          </>
        )}
      </div>

      {/* CTA Button */}
      {isCurrentPlan ? (
        <div className="text-center py-3 px-4 bg-green-50 rounded-lg border border-green-200">
          <p className="text-green-800 font-semibold text-sm">✓ Current Plan</p>
        </div>
      ) : (
        <Button
          onClick={onUpgrade}
          isLoading={isLoading}
          className={`w-full ${plan === 'premium'
            ? 'bg-amber-500 hover:bg-amber-600 text-white font-semibold'
            : 'bg-gray-200 text-gray-800 font-semibold hover:bg-gray-300'
            }`}
        >
          {plan === 'premium' ? 'Upgrade to Premium' : 'Continue with Free'}
        </Button>
      )}
    </Card>
  );
}

// ============================================
// PRICING SECTION
// ============================================

interface PricingSectionProps {
  currentPlan: SubscriptionPlan;
  onUpgrade: () => void;
  isLoading?: boolean;
}

export function PricingSection({ currentPlan, onUpgrade, isLoading }: PricingSectionProps) {
  return (
    <div className="bg-gradient-to-br from-slate-50 to-indigo-50 py-12 px-6 rounded-2xl">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Simple Pricing</h2>
          <p className="text-xl text-gray-600">Choose the plan that fits your family</p>
        </div>

        {/* Plans */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <PlanCard
            plan="free"
            isCurrentPlan={currentPlan === 'free'}
          />
          <PlanCard
            plan="premium"
            isCurrentPlan={currentPlan === 'premium'}
            onUpgrade={onUpgrade}
            isLoading={isLoading}
          />
        </div>

        {/* Features Comparison */}
        <div className="mt-12">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">Feature Comparison</h3>
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left font-semibold text-gray-900">Feature</th>
                    <th className="px-6 py-4 text-center font-semibold text-gray-900">Free</th>
                    <th className="px-6 py-4 text-center font-semibold text-gray-900">Premium</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {SUBSCRIPTION_FEATURES_COMPARISON.map((feature, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{feature.icon}</span>
                          <span className="font-medium text-gray-900">{feature.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {typeof feature.free === 'boolean' ? (
                          <span>{feature.free ? '✅' : '❌'}</span>
                        ) : (
                          <span className="text-sm font-medium">
                            {feature.free}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {typeof feature.premium === 'boolean' ? (
                          <span className={feature.premium ? '✅' : '❌'} />
                        ) : (
                          <span className="text-sm font-medium text-gray-900">
                            {feature.premium}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// UPGRADE PROMPT
// ============================================

interface UpgradePromptProps {
  feature: string;
  onUpgrade: () => void;
  isLoading?: boolean;
}

export function UpgradePrompt({ feature, onUpgrade, isLoading }: UpgradePromptProps) {
  return (
    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl p-6">
      <div className="flex items-center gap-4">
        <div className="text-4xl">🔒</div>
        <div className="flex-1">
          <h3 className="font-bold text-gray-900 mb-1">Upgrade to Premium</h3>
          <p className="text-sm text-gray-600">{feature} is only available on our Premium plan</p>
        </div>
        <Button
          onClick={onUpgrade}
          isLoading={isLoading}
          className="bg-amber-500 hover:bg-amber-600 text-white font-semibold whitespace-nowrap"
        >
          Upgrade Now
        </Button>
      </div>
    </div>
  );
}
