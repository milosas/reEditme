import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export type CreditAction = 'model_photo' | 'tryon_photo' | 'post_image' | 'post_text' | 'text_from_image';

export interface CreditTransaction {
  id: string;
  amount: number;
  type: 'purchase' | 'usage' | 'bonus';
  description: string | null;
  created_at: string;
}

const CREDITS_CHANGED_EVENT = 'credits-changed';
const GUEST_CREDITS_KEY = 'reeditme_guest_credits';
const GUEST_CREDITS_DEFAULT = 5;

export const CREDIT_COSTS: Record<CreditAction, number> = {
  model_photo: 4,
  tryon_photo: 3,
  post_image: 3,
  post_text: 1,
  text_from_image: 1,
};

/** Dispatch this after any successful generation to refresh CreditBadge everywhere */
export function notifyCreditChange() {
  window.dispatchEvent(new Event(CREDITS_CHANGED_EVENT));
}

/** Read guest credits from localStorage */
function getGuestCredits(): number {
  try {
    const stored = localStorage.getItem(GUEST_CREDITS_KEY);
    if (stored === null) {
      localStorage.setItem(GUEST_CREDITS_KEY, String(GUEST_CREDITS_DEFAULT));
      return GUEST_CREDITS_DEFAULT;
    }
    const parsed = parseInt(stored, 10);
    return isNaN(parsed) ? 0 : parsed;
  } catch {
    return 0;
  }
}

/** Write guest credits to localStorage */
function setGuestCredits(credits: number): void {
  try {
    localStorage.setItem(GUEST_CREDITS_KEY, String(Math.max(0, credits)));
  } catch {
    // localStorage unavailable
  }
}

interface CheckCreditsResult {
  hasCredits: boolean;
  required: number;
  balance: number;
}

export function useCredits() {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [socialSubscriptionActive, setSocialSubscriptionActive] = useState(false);
  const [loading, setLoading] = useState(true);

  const isGuest = !user;

  const fetchTransactions = useCallback(async () => {
    if (!user) {
      setTransactions([]);
      return;
    }
    const { data, error } = await supabase
      .from('credit_transactions')
      .select('id, amount, type, description, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      setTransactions(data as CreditTransaction[]);
    }
  }, [user]);

  const fetchBalance = useCallback(async () => {
    if (!user) {
      // Guest mode: read from localStorage
      setBalance(getGuestCredits());
      setSocialSubscriptionActive(false);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('credits, social_subscription_active')
      .eq('id', user.id)
      .single();

    if (!error && data) {
      setBalance(data.credits ?? 0);
      setSocialSubscriptionActive(data.social_subscription_active ?? false);
    }
    setLoading(false);
    fetchTransactions();
  }, [user, fetchTransactions]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  // Listen for credit changes from other hooks/components
  useEffect(() => {
    const handler = () => fetchBalance();
    window.addEventListener(CREDITS_CHANGED_EVENT, handler);
    return () => window.removeEventListener(CREDITS_CHANGED_EVENT, handler);
  }, [fetchBalance]);

  const purchaseCredits = async (packageId: '50' | '150' | '500') => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const response = await supabase.functions.invoke('create-checkout', {
      body: { type: 'credits', packageId },
    });

    if (response.error) throw new Error(response.error.message);
    const result = response.data;

    if (result?.url) {
      window.location.href = result.url;
    } else {
      throw new Error('No checkout URL returned');
    }
  };

  const subscribeSocial = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const response = await supabase.functions.invoke('create-checkout', {
      body: { type: 'social_subscription' },
    });

    if (response.error) throw new Error(response.error.message);
    const result = response.data;

    if (result?.url) {
      window.location.href = result.url;
    } else {
      throw new Error('No checkout URL returned');
    }
  };

  const checkCredits = async (action: CreditAction): Promise<CheckCreditsResult> => {
    if (isGuest) {
      // Guest mode: check localStorage
      const guestBalance = getGuestCredits();
      const required = CREDIT_COSTS[action];
      return {
        hasCredits: guestBalance >= required,
        required,
        balance: guestBalance,
      };
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const response = await supabase.functions.invoke('check-credits', {
      body: { action },
    });

    if (response.error) throw new Error(response.error.message);
    return response.data as CheckCreditsResult;
  };

  /** Deduct credits for a guest user via localStorage. Returns true if successful. */
  const deductGuestCredits = (amount: number): boolean => {
    const current = getGuestCredits();
    if (current < amount) return false;
    const newBalance = current - amount;
    setGuestCredits(newBalance);
    setBalance(newBalance);
    return true;
  };

  const deductCredits = async (action: CreditAction): Promise<CheckCreditsResult> => {
    const required = CREDIT_COSTS[action];

    if (isGuest) {
      // Guest mode: deduct from localStorage
      const guestBalance = getGuestCredits();
      if (guestBalance < required) {
        return { hasCredits: false, required, balance: guestBalance };
      }
      const success = deductGuestCredits(required);
      const newBalance = getGuestCredits();
      return {
        hasCredits: success,
        required,
        balance: newBalance,
      };
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const response = await supabase.functions.invoke('check-credits', {
      body: { action, deduct: true },
    });

    if (response.error) throw new Error(response.error.message);
    const result = response.data;

    if (result?.deducted) {
      setBalance(result.balance);
    }

    return result as CheckCreditsResult;
  };

  const refresh = () => fetchBalance();

  return {
    balance,
    transactions,
    socialSubscriptionActive,
    loading,
    isGuest,
    purchaseCredits,
    subscribeSocial,
    checkCredits,
    deductCredits,
    deductGuestCredits,
    refresh,
  };
}
