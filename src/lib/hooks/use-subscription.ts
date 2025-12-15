// ============================================
// SUBSCRIPTION HOOK
// Hook for managing subscriptions
// ============================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Parent, SubscriptionPlan } from '@/types';
import { useAuth } from './use-auth';

interface UseSubscriptionReturn {
  subscription: Parent['subscription'] | null;
  plan: SubscriptionPlan;
  loading: boolean;
  error: string | null;
  isPremium: boolean;
  upgradeToPremium: () => Promise<{ success: boolean; error?: string }>;
  cancelSubscription: () => Promise<{ success: boolean; error?: string }>;
}

export function useSubscription(): UseSubscriptionReturn {
  const { parent } = useAuth();
  const [subscription, setSubscription] = useState<Parent['subscription'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load subscription data
  useEffect(() => {
    const loadSubscription = async () => {
      if (!parent?.id) {
        setLoading(false);
        return;
      }

      try {
        const parentDoc = await getDoc(doc(db, 'parents', parent.id));
        if (parentDoc.exists()) {
          const data = parentDoc.data();
          setSubscription(data.subscription);
        } else {
          setError('Parent not found');
        }
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load subscription');
        setLoading(false);
      }
    };

    loadSubscription();
  }, [parent?.id]);

  const upgradeToPremium = useCallback(async () => {
    if (!parent?.id) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      // In production, this would integrate with Stripe
      // For now, we'll just update the local subscription status
      const now = Timestamp.now();
      const oneMonthFromNow = new Timestamp(
        now.seconds + 30 * 24 * 60 * 60,
        now.nanoseconds
      );

      const newSubscription: Parent['subscription'] = {
        plan: 'premium',
        status: 'active',
        currentPeriodStart: now,
        currentPeriodEnd: oneMonthFromNow,
      };

      await updateDoc(doc(db, 'parents', parent.id), {
        subscription: newSubscription,
      });

      setSubscription(newSubscription);
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to upgrade';
      return { success: false, error: message };
    }
  }, [parent?.id]);

  const cancelSubscription = useCallback(async () => {
    if (!parent?.id) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const now = Timestamp.now();
      const newSubscription: Parent['subscription'] = {
        plan: 'free',
        status: 'cancelled',
        currentPeriodStart: subscription?.currentPeriodStart || now,
        currentPeriodEnd: subscription?.currentPeriodEnd || now,
        cancelledAt: now,
      };

      await updateDoc(doc(db, 'parents', parent.id), {
        subscription: newSubscription,
      });

      setSubscription(newSubscription);
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to cancel subscription';
      return { success: false, error: message };
    }
  }, [parent?.id, subscription]);

  const plan = (subscription?.plan || 'free') as SubscriptionPlan;
  const isPremium = plan === 'premium' && subscription?.status === 'active';

  return {
    subscription,
    plan,
    loading,
    error,
    isPremium,
    upgradeToPremium,
    cancelSubscription,
  };
}
