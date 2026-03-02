import { Account } from '@/components/providers/AuthorizationProvider';
import { supabase } from '@/lib/supabase';
import { useCallback, useEffect, useState } from 'react';

export interface Supporter {
    id: string; // uuid
    signature: string;
    senderAddress: string;
    amount: number;
    message?: string;
    timestamp: number | null | undefined;
    avatarUri?: string;
    name?: string;
}

export function useRecentSupporters(selectedAccount: Account | null) {
    const [supporters, setSupporters] = useState<Supporter[]>([]);
    const [loadingSupporters, setLoadingSupporters] = useState(false);

    const fetchSupporters = useCallback(async () => {
        if (!selectedAccount) return;
        try {
            setLoadingSupporters(true);
            const pubkeyStr = selectedAccount.publicKey.toBase58 ? selectedAccount.publicKey.toBase58() : selectedAccount.publicKey;

            const { data, error } = await supabase
                .from('tips')
                .select('*')
                .eq('receiver_address', pubkeyStr)
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) {
                console.error('Supabase fetch error:', error);
                throw error;
            }

            if (!data) {
                setSupporters([]);
                return;
            }

            const uniqueSenders = [...new Set(data.map((row: any) => row.sender_address))];

            let profilesMap: Record<string, any> = {};
            if (uniqueSenders.length > 0) {
                const { data: profilesData, error: profilesError } = await supabase
                    .from('profiles')
                    .select('wallet_address, avatar_url, username, display_name')
                    .in('wallet_address', uniqueSenders);

                if (!profilesError && profilesData) {
                    profilesData.forEach((profile: any) => {
                        profilesMap[profile.wallet_address] = profile;
                    });
                }
            }

            const fetchedSupporters: Supporter[] = data.map((row: any) => {
                const profile = profilesMap[row.sender_address];
                return {
                    id: row.id,
                    signature: row.signature,
                    senderAddress: row.sender_address,
                    amount: Number(row.amount),
                    message: row.message,
                    timestamp: new Date(row.created_at).getTime() / 1000,
                    avatarUri: profile?.avatar_url || '🎩',
                    name: profile?.username || profile?.display_name || null,
                };
            });

            setSupporters(fetchedSupporters);
        } catch (e) {
            console.error('Failed to fetch supporters from Supabase:', e);
        } finally {
            setLoadingSupporters(false);
        }
    }, [selectedAccount]);

    useEffect(() => {
        if (selectedAccount?.address) {
            fetchSupporters();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedAccount?.address]);

    useEffect(() => {
        if (!selectedAccount) return;

        const pubkeyStr = selectedAccount.publicKey.toBase58 ? selectedAccount.publicKey.toBase58() : selectedAccount.publicKey;

        const channel = supabase
            .channel('recent_supporters_tips')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'tips',
                    filter: `receiver_address=eq.${pubkeyStr}`,
                },
                () => {
                    fetchSupporters();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [selectedAccount, fetchSupporters]);

    return { supporters, loadingSupporters, fetchSupporters };
}
