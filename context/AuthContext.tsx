import { Account, useAuthorization } from '@/components/providers/AuthorizationProvider';
import { supabase } from '@/lib/supabase';
import { alertAndLog } from '@/util/alertAndLog';
import { transact } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';
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

    const loadProfile = useCallback(async ({ isRefresh = false } = {}) => {
        if (!isRefresh) setIsLoading(true);
        try {
            if (selectedAccount) {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('wallet_address', selectedAccount.publicKey)
                    .single();

                if (error && error.code !== 'PGRST116') {
                    console.error('Failed to load profile from Supabase', error);
                }

                if (data) {
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
                }
            } else {
                setUserProfile(null);
                setTipTarget(null);
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

// import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';

// interface UserProfile {
//     name: string;
//     bio: string;
//     avatarUri: string;
// }

// interface MockAccount {
//     address: string;
//     label: string;
// }

// interface AuthContextType {
//     selectedAccount: MockAccount | null;
//     authorizeSession: (wallet: any) => Promise<any>;
//     deauthorizeSession: (wallet: any) => Promise<void>;
//     handleConnect: () => Promise<void>;
//     handleDisconnect: () => Promise<void>;
//     userProfile: UserProfile | null;
//     updateProfile: (profile: UserProfile) => Promise<void>;
//     isLoading: boolean;
// }

// const AuthContext = createContext<AuthContextType | undefined>(undefined);

// // -------- Mock Data --------
// const MOCK_ACCOUNT: MockAccount = {
//     address: '0xMOCK123456789',
//     label: 'Mock Wallet',
// };

// const MOCK_PROFILE: UserProfile = {
//     name: 'Mock User',
//     bio: 'This is a mock profile for testing UI without backend.',
//     avatarUri: 'https://picsum.photos/seed/random1/300/300',
// };
// // ---------------------------

// export const AuthProvider = ({ children }: { children: ReactNode }) => {
//     const [selectedAccount, setSelectedAccount] = useState<MockAccount | null>(null);
//     const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
//     const [isLoading, setIsLoading] = useState(true);

//     // Simulate loading when account changes
//     useEffect(() => {
//         const loadMockProfile = async () => {
//             setIsLoading(true);
//             await new Promise(res => setTimeout(res, 500)); // fake delay

//             if (selectedAccount) {
//                 setUserProfile(MOCK_PROFILE);
//             } else {
//                 setUserProfile(null);
//             }

//             setIsLoading(false);
//         };

//         loadMockProfile();
//     }, [selectedAccount]);

//     const authorizeSession = async () => {
//         return Promise.resolve(true);
//     };

//     const deauthorizeSession = async () => {
//         return Promise.resolve();
//     };

//     const handleConnect = async () => {
//         setIsLoading(true);
//         await new Promise(res => setTimeout(res, 500)); // fake delay
//         setSelectedAccount(MOCK_ACCOUNT);
//         setIsLoading(false);
//     };

//     const handleDisconnect = async () => {
//         setIsLoading(true);
//         await new Promise(res => setTimeout(res, 300));
//         setSelectedAccount(null);
//         setUserProfile(null);
//         setIsLoading(false);
//     };

//     const updateProfile = async (profile: UserProfile) => {
//         await new Promise(res => setTimeout(res, 200)); // simulate API
//         setUserProfile(profile);
//     };

//     return (
//         <AuthContext.Provider
//             value={{
//                 selectedAccount,
//                 authorizeSession,
//                 deauthorizeSession,
//                 handleConnect,
//                 handleDisconnect,
//                 userProfile,
//                 updateProfile,
//                 isLoading,
//             }}
//         >
//             {children}
//         </AuthContext.Provider>
//     );
// };

// export const useAuth = () => {
//     const context = useContext(AuthContext);
//     if (!context) {
//         throw new Error('useAuth must be used within an AuthProvider');
//     }
//     return context;
// };
