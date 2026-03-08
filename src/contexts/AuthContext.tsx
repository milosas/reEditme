import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { notifyCreditChange } from '../hooks/useCredits';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const GUEST_CREDITS_KEY = 'reeditme_guest_credits';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const prevUserRef = useRef<User | null>(null);
  const migrationDoneRef = useRef(false);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    // Cleanup subscription
    return () => subscription.unsubscribe();
  }, []);

  // Guest credit migration: when user transitions from null to authenticated
  useEffect(() => {
    const wasGuest = prevUserRef.current === null;
    const isNowAuthenticated = user !== null;
    prevUserRef.current = user;

    if (wasGuest && isNowAuthenticated && !migrationDoneRef.current) {
      migrationDoneRef.current = true;

      try {
        const stored = localStorage.getItem(GUEST_CREDITS_KEY);
        if (stored !== null) {
          const guestCredits = parseInt(stored, 10);
          if (!isNaN(guestCredits) && guestCredits > 0) {
            supabase.rpc('increment_credits', {
              p_user_id: user.id,
              p_amount: guestCredits,
              p_description: 'Guest credit migration',
              p_type: 'bonus'
            }).then(({ error }) => {
              if (error) {
                console.error('Guest credit migration failed:', error);
                return;
              }
              localStorage.removeItem(GUEST_CREDITS_KEY);
              notifyCreditChange();
              console.log(`Migrated ${guestCredits} guest credits to account`);
            });
          }
        }
      } catch (err) {
        console.error('Guest credit migration error:', err);
      }
    }
  }, [user]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
