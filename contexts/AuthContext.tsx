import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { User } from '@supabase/supabase-js';

// Define the shape of our context
export type AccountTier = 'ADMIN' | 'TEST' | 'REGULAR';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    tier: AccountTier;
    counts: number;
    deductCount: (amount?: number) => boolean;
}

// Create the context with default values
const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    tier: 'REGULAR',
    counts: 0,
    deductCount: () => false,
});

// Custom hook to use the auth context
export const useAuth = () => useContext(AuthContext);

// Provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [counts, setCounts] = useState<number>(0);

    const ADMIN_EMAILS = [
        'dermbi@cre-te.com', 'brown@cre-te.com', 'parisking@cre-te.com',
        'stc602@cre-te.com', 'sbin@cre-te.com', 'kimdongwook@cre-te.com',
        'woohj@cre-te.com', 'bbyj@cre-te.com', 'hyeon@cre-te.com', 'je@cre-te.com'
    ];

    // Helpers to check account tiers
    const getAccountTier = (email: string | undefined): AccountTier => {
        if (!email) return 'REGULAR';
        const emailLower = email.trim().toLowerCase();

        const checkEmails = (envVar: string | undefined) => {
            if (!envVar) return false;
            return envVar.split(',').map(e => e.trim().toLowerCase()).includes(emailLower);
        };

        if (ADMIN_EMAILS.includes(emailLower) || checkEmails(import.meta.env.VITE_ADMIN_EMAILS as string)) return 'ADMIN';
        if (checkEmails(import.meta.env.VITE_TEST_EMAILS as string)) return 'TEST';

        return 'REGULAR';
    };

    const tier = getAccountTier(user?.email);

    useEffect(() => {
        let isHandlingSession = false;

        const verifyApproval = async (currentUser: User | null) => {
            if (!currentUser) {
                setUser(null);
                setCounts(0);
                setLoading(false);
                return;
            }

            const currentTier = getAccountTier(currentUser.email);

            if (currentTier === 'ADMIN') {
                setUser(currentUser);
                initializeCounts(currentUser.id, currentUser.email);
                setLoading(false);
                return;
            }

            try {
                // Fetch profile
                const { data: profile, error } = await supabase
                    .from('profiles')
                    .select('is_approved')
                    .eq('id', currentUser.id)
                    .single();

                if (error && error.code === 'PGRST116') {
                    // Profile doesn't exist (e.g., first time social login)
                    const { error: insertErr } = await supabase.from('profiles').insert([
                        { id: currentUser.id, email: currentUser.email, is_approved: false }
                    ]);
                    if (insertErr) {
                        console.error('Failed to insert profile:', insertErr);
                    }
                    // 알림창 삭제 (AuthScreen이 자체적으로 5초 피드백 제공 & 모달 유지)
                    await supabase.auth.signOut();
                    setUser(null);
                    setCounts(0);
                    return;
                }

                if (profile && !profile.is_approved) {
                    // 알림창 삭제
                    await supabase.auth.signOut();
                    setUser(null);
                    setCounts(0);
                    return;
                }

                // Profile is approved
                setUser(currentUser);
                initializeCounts(currentUser.id, currentUser.email);
            } catch (err) {
                console.error("Error verifying profile:", err);
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        // 1. Get initial session
        const getInitialSession = async () => {
            isHandlingSession = true;
            try {
                const { data: { session } } = await supabase.auth.getSession();
                await verifyApproval(session?.user ?? null);
            } catch (error) {
                console.error("Error getting session:", error);
            } finally {
                isHandlingSession = false;
                setLoading(false);
            }
        };

        getInitialSession();

        // 2. Listen to auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
                if (!isHandlingSession) {
                    await verifyApproval(session?.user ?? null);
                }
            }
        );

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    // Count Management Logic (Local Storage)
    const initializeCounts = (userId: string, email: string | undefined) => {
        const currentTier = getAccountTier(email);

        if (currentTier === 'ADMIN') {
            setCounts(9999);
            return;
        }

        const storageKey = `crete_counts_${userId}`;
        const storedCounts = localStorage.getItem(storageKey);

        if (storedCounts === null) {
            // First time login for this user
            let initialAmount = currentTier === 'TEST' ? 1000 : 100;
            localStorage.setItem(storageKey, initialAmount.toString());
            setCounts(initialAmount);
        } else {
            // Returning user, get from local storage
            let parsedCounts = parseInt(storedCounts, 10);

            // If they are TEST but had the old default 100, upgrade them to 1000
            if (currentTier === 'TEST' && parsedCounts === 100) {
                parsedCounts = 1000;
                localStorage.setItem(storageKey, parsedCounts.toString());
            }

            setCounts(parsedCounts);
        }
    };

    const deductCount = (amount: number = 1): boolean => {
        if (tier === 'ADMIN') {
            return true; // Admin never runs out
        }

        if (counts >= amount) {
            const newCounts = counts - amount;
            setCounts(newCounts);
            if (user) {
                const storageKey = `crete_counts_${user.id}`;
                localStorage.setItem(storageKey, newCounts.toString());
            }
            return true;
        }

        return false; // Not enough counts
    };

    return (
        <AuthContext.Provider value={{ user, loading, tier, counts, deductCount }}>
            {children}
        </AuthContext.Provider>
    );
};
