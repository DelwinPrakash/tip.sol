import { Account, useAuthorization } from '@/components/providers/AuthorizationProvider';
import { supabase } from '@/lib/supabase';
import { alertAndLog } from '@/util/alertAndLog';
import { transact } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';
import { useRouter, useSegments } from 'expo-router';
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';

interface UserProfile {
    name: string;
    bio: string;
    avatarUri: string;
}

export interface TipTarget {
    title: string;
    description: string;
    targetAmount: number;
    amountRaised?: number;
}

interface AuthContextType {
    selectedAccount: Account | null;
    authorizeSession: (wallet: any) => Promise<any>;
    deauthorizeSession: (wallet: any) => void;
    handleConnect: () => Promise<void>;
    handleDisconnect: () => Promise<void>;
    userProfile: UserProfile | null;
    updateProfile: (profile: UserProfile) => Promise<void>;
    tipTarget: TipTarget | null;
    updateTipTarget: (target: TipTarget | null) => Promise<void>;
    refreshProfile: () => Promise<void>;
    isLoading: boolean;
    isProfileIncomplete: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const {
        selectedAccount,
        authorizeSession,
        deauthorizeSession,
    } = useAuthorization();

    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [tipTarget, setTipTarget] = useState<TipTarget | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isProfileIncomplete, setIsProfileIncomplete] = useState(false);

    const segments = useSegments();
    const router = useRouter();

    const loadProfile = useCallback(async ({ isRefresh = false } = {}) => {
        if (!isRefresh) setIsLoading(true);
        try {
            if (selectedAccount) {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('wallet_address', selectedAccount.publicKey)
                    .single();

                if (error && error.code === 'PGRST116') {
                    // Profile not found, create an empty one
                    const { error: insertError } = await supabase
                        .from('profiles')
                        .insert({
                            wallet_address: selectedAccount.publicKey,
                            username: '',
                            display_name: '',
                            bio: '',
                            avatar_url: '',
                        });

                    if (insertError) {
                        console.error('Failed to create new profile', insertError);
                    }

                    setIsProfileIncomplete(true);
                    setUserProfile({
                        name: '',
                        bio: '',
                        avatarUri: '',
                    });
                    setTipTarget(null);
                } else if (error) {
                    console.error('Failed to load profile from Supabase', error);
                } else if (data) {
                    const incomplete = !data.username || data.username.trim() === '';
                    setIsProfileIncomplete(incomplete);

                    setUserProfile({
                        name: data.username || data.display_name || '',
                        bio: data.bio || '',
                        avatarUri: data.avatar_url || '',
                    });

                    const { data: goalData, error: goalError } = await supabase
                        .from('tip_goals')
                        .select('*')
                        .eq('wallet_address', selectedAccount.publicKey)
                        .eq('status', 'active')
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .single();

                    if (goalError && goalError.code !== 'PGRST116') {
                        console.error('Failed to load active tip goal', goalError);
                    }

                    if (goalData) {
                        setTipTarget({
                            title: goalData.title,
                            description: goalData.description || '',
                            targetAmount: Number(goalData.target_amount),
                            amountRaised: Number(goalData.amount_raised) || 0,
                        });
                    } else {
                        setTipTarget(null);
                    }
                } else {
                    setUserProfile(null);
                    setTipTarget(null);
                    setIsProfileIncomplete(false);
                }
            } else {
                setUserProfile(null);
                setTipTarget(null);
                setIsProfileIncomplete(false);
            }
        } catch (error) {
            console.error('Failed to load profile', error);
        } finally {
            setIsLoading(false);
        }
    }, [selectedAccount]);

    useEffect(() => {
        loadProfile();
    }, [loadProfile]);

    useEffect(() => {
        if (isLoading) return;

        const inOnboardingGroup = segments[0] === 'onboarding';

        if (selectedAccount && isProfileIncomplete && !inOnboardingGroup) {
            router.replace('/onboarding');
        } else if (selectedAccount && !isProfileIncomplete && inOnboardingGroup) {
            router.replace('/(tabs)');
        } else if (!selectedAccount && inOnboardingGroup) {
            router.replace('/');
        }
    }, [selectedAccount, isProfileIncomplete, segments, isLoading, router]);

    const updateProfile = async (profile: UserProfile) => {
        if (!selectedAccount) return;
        try {
            const { error } = await supabase
                .from('profiles')
                .upsert({
                    wallet_address: selectedAccount.publicKey,
                    username: profile.name,
                    display_name: profile.name,
                    bio: profile.bio,
                    avatar_url: profile.avatarUri,
                }, { onConflict: 'wallet_address' });

            if (error) throw error;
            setUserProfile(profile);
            setIsProfileIncomplete(false);
        } catch (error) {
            console.error('Failed to save profile', error);
            throw error;
        }
    };

    const updateTipTarget = async (target: TipTarget | null) => {
        if (!selectedAccount) return;
        try {
            if (target === null) {
                // Deactivate current goal
                const { error } = await supabase
                    .from('tip_goals')
                    .update({ status: 'deleted' })
                    .eq('wallet_address', selectedAccount.publicKey)
                    .eq('status', 'active');

                if (error) throw error;
            } else {
                // First, deactivate any currently active goals
                await supabase
                    .from('tip_goals')
                    .update({ status: 'deleted' })
                    .eq('wallet_address', selectedAccount.publicKey)
                    .eq('status', 'active');

                // Insert the new active goal
                const { error } = await supabase
                    .from('tip_goals')
                    .insert({
                        wallet_address: selectedAccount.publicKey,
                        title: target.title,
                        description: target.description,
                        target_amount: target.targetAmount,
                        amount_raised: target.amountRaised || 0,
                        status: 'active'
                    });

                if (error) throw error;
            }

            setTipTarget(target);
        } catch (error) {
            console.error('Failed to save tip target', error);
            throw error;
        }
    };

    const handleConnect = useCallback(async () => {
        try {
            await transact(async wallet => {
                await authorizeSession(wallet);
            });
        } catch (err: any) {
            alertAndLog(
                'Error during connect',
                err instanceof Error ? err.message : err,
            );
        } finally {
            setIsLoading(false);
        }
    }, [isLoading, authorizeSession]);

    const handleDisconnect = useCallback(async () => {
        try {
            await transact(async wallet => {
                await deauthorizeSession(wallet);
            });
            setUserProfile(null);
            setTipTarget(null);
            setIsProfileIncomplete(false);
        } catch (err: any) {
            alertAndLog(
                'Error during disconnect',
                err instanceof Error ? err.message : err,
            );
        }
    }, [deauthorizeSession]);

    return (
        <AuthContext.Provider
            value={{
                selectedAccount,
                authorizeSession,
                deauthorizeSession,
                handleConnect,
                handleDisconnect,
                userProfile,
                updateProfile,
                tipTarget,
                updateTipTarget,
                refreshProfile: () => loadProfile({ isRefresh: true }),
                isLoading,
                isProfileIncomplete,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
