'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Spinner } from '@/components/ui';
import { useSubscription } from '@/lib/hooks/use-subscription';

export default function SubscriptionsPage() {
  const router = useRouter();
  const { plan, loading, error, isPremium, upgradeToPremium, cancelSubscription } = useSubscription();
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [upgradeSuccess, setUpgradeSuccess] = useState(false);
  const [upgradeError, setUpgradeError] = useState('');

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { getCurrentParent } = await import('@/lib/auth/parent-auth');
        const parent = await getCurrentParent();

        if (!parent) {
          router.push('/auth/login');
        }
      } catch (err) {
        router.push('/auth/login');
      }
    };

    checkAuth();
  }, [router]);

  const handleUpgrade = async () => {
    setIsUpgrading(true);
    setUpgradeError('');
    const result = await upgradeToPremium();

    if (result.success) {
      setUpgradeSuccess(true);
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } else {
      setUpgradeError(result.error || 'Failed to upgrade');
    }
    setIsUpgrading(false);
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel your Premium subscription?')) {
      return;
    }

    setIsUpgrading(true);
    setUpgradeError('');
    const result = await cancelSubscription();

    if (result.success) {
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } else {
      setUpgradeError(result.error || 'Failed to cancel subscription');
    }
    setIsUpgrading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 font-semibold mb-4">{error}</p>
          <Link href="/dashboard">
            <Button>Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-gray-600 hover:text-gray-900 transition-colors">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Subscription Plans</h1>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        {/* Success Message */}
        {upgradeSuccess && (
          <div className="mb-8 bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
            <div className="text-4xl mb-3">🎉</div>
            <h3 className="text-xl font-bold text-green-800 mb-2">Welcome to Premium!</h3>
            <p className="text-green-700">Your account is being upgraded...</p>
          </div>
        )}

        {/* Error Message */}
        {upgradeError && (
          <div className="mb-8 bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700 text-center">
            {upgradeError}
          </div>
        )}

        {/* Upgrade Badge */}
        <div className="flex justify-center mb-6">
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-700 rounded-full text-sm font-semibold">
            ✨ Upgrade Your Experience
          </span>
        </div>

        {/* Title */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-purple-600 mb-4">Choose Your Plan</h2>
          <p className="text-gray-600 text-lg">Unlock the full potential of FamilyTasks with Premium features</p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-16">
          {/* Free Plan */}
          <div className="bg-white border-2 border-gray-200 rounded-3xl p-8 shadow-lg relative">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Free</h3>
              {plan === 'free' && (
                <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-semibold rounded-full border border-blue-200">
                  Current Plan
                </span>
              )}
            </div>

            <div className="mb-6">
              <span className="text-5xl font-bold text-gray-900">$0</span>
              <span className="text-gray-500">/month</span>
            </div>

            <ul className="space-y-4 mb-8">
              <li className="flex items-center gap-3">
                <span className="text-orange-500">✓</span>
                <span className="text-gray-700">Up to 2 children</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="text-orange-500">✓</span>
                <span className="text-gray-700">Basic task management</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="text-orange-500">✓</span>
                <span className="text-gray-700">Up to 5 tasks per child</span>
              </li>
              <li className="flex items-center gap-3 opacity-50">
                <span className="text-gray-400">○</span>
                <span className="text-gray-500">Recurring tasks</span>
              </li>
              <li className="flex items-center gap-3 opacity-50">
                <span className="text-gray-400">○</span>
                <span className="text-gray-500">Achievements & streaks</span>
              </li>
              <li className="flex items-center gap-3 opacity-50">
                <span className="text-gray-400">○</span>
                <span className="text-gray-500">Unlimited gifts</span>
              </li>
              <li className="flex items-center gap-3 opacity-50">
                <span className="text-gray-400">○</span>
                <span className="text-gray-500">Email notifications</span>
              </li>
              <li className="flex items-center gap-3 opacity-50">
                <span className="text-gray-400">○</span>
                <span className="text-gray-500">Priority support</span>
              </li>
            </ul>
          </div>

          {/* Premium Plan */}
          <div className="bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-300 rounded-3xl p-8 shadow-xl relative overflow-hidden">
            {/* Crown Badge */}
            <div className="absolute top-4 right-4">
              <span className="text-2xl">👑</span>
            </div>

            <div className="flex items-center gap-2 mb-6">
              <span className="text-2xl">👑</span>
              <h3 className="text-2xl font-bold text-gray-900">Premium</h3>
            </div>

            <div className="mb-6">
              <span className="text-5xl font-bold text-orange-600">$9.99</span>
              <span className="text-orange-500">/month</span>
            </div>

            <ul className="space-y-4 mb-8">
              <li className="flex items-center gap-3">
                <span className="text-orange-500">✓</span>
                <span className="text-gray-700 font-medium">Unlimited children</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="text-orange-500">✓</span>
                <span className="text-gray-700 font-medium">Advanced task management</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="text-orange-500">✓</span>
                <span className="text-gray-700 font-medium">Unlimited tasks</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="text-orange-500">✓</span>
                <span className="text-gray-700 font-medium">Recurring tasks</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="text-orange-500">✓</span>
                <span className="text-gray-700 font-medium">Achievements & streaks</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="text-orange-500">✓</span>
                <span className="text-gray-700 font-medium">Unlimited gifts</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="text-orange-500">✓</span>
                <span className="text-gray-700 font-medium">Email notifications</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="text-orange-500">✓</span>
                <span className="text-gray-700 font-medium">Priority support</span>
              </li>
            </ul>

            {!isPremium ? (
              <Button
                onClick={handleUpgrade}
                isLoading={isUpgrading}
                className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-orange-500/30 text-lg"
              >
                👑 Upgrade to Premium
              </Button>
            ) : (
              <div className="text-center py-4 bg-green-100 rounded-xl border border-green-200">
                <span className="text-green-700 font-semibold">✓ Active Subscription</span>
              </div>
            )}
          </div>
        </div>

        {/* Premium Features Section */}
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-3xl p-12 mb-12">
          <h3 className="text-3xl font-bold text-gray-900 text-center mb-10">Premium Features</h3>

          <div className="grid md:grid-cols-4 gap-6">
            {/* Feature 1 */}
            <div className="bg-white rounded-2xl p-6 text-center shadow-md hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 mx-auto mb-4 bg-purple-100 rounded-2xl flex items-center justify-center">
                <svg className="w-8 h-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h4 className="font-bold text-gray-900 mb-2">Unlimited Children</h4>
              <p className="text-sm text-gray-600">Add as many kids as you want</p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white rounded-2xl p-6 text-center shadow-md hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 mx-auto mb-4 bg-purple-100 rounded-2xl flex items-center justify-center">
                <svg className="w-8 h-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <h4 className="font-bold text-gray-900 mb-2">Recurring Tasks</h4>
              <p className="text-sm text-gray-600">Set up daily, weekly, monthly tasks</p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white rounded-2xl p-6 text-center shadow-md hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 mx-auto mb-4 bg-purple-100 rounded-2xl flex items-center justify-center">
                <svg className="w-8 h-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <h4 className="font-bold text-gray-900 mb-2">Achievements</h4>
              <p className="text-sm text-gray-600">Track streaks and milestones</p>
            </div>

            {/* Feature 4 */}
            <div className="bg-white rounded-2xl p-6 text-center shadow-md hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 mx-auto mb-4 bg-purple-100 rounded-2xl flex items-center justify-center">
                <svg className="w-8 h-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                </svg>
              </div>
              <h4 className="font-bold text-gray-900 mb-2">Unlimited Rewards</h4>
              <p className="text-sm text-gray-600">Create unlimited gift options</p>
            </div>
          </div>
        </div>

        {/* Cancel Subscription (for Premium users) */}
        {isPremium && (
          <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center shadow-md">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Managing Your Premium Plan</h3>
            <p className="text-gray-600 mb-6">
              Thank you for supporting us! Your Premium subscription gives you access to all advanced features.
            </p>
            <Button
              variant="ghost"
              onClick={handleCancel}
              isLoading={isUpgrading}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              Cancel Subscription
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
