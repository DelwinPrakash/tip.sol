import { Account } from '@/components/providers/AuthorizationProvider';
import { supabase } from '@/lib/supabase';
import { useCallback, useEffect, useState } from 'react';

export interface Supporter {
    id: string; // uuid
    signature: string;
    senderAddress: string;
    receiverAddress: string;
    amount: number;
    message?: string;
    timestamp: number | null | undefined;
    avatarUri?: string;
    name?: string;
}

export function useUserTransactions(selectedAccount: Account | null) {
    const [transactions, setTransactions] = useState<Supporter[]>([]);
    const [loadingTransactions, setLoadingTransactions] = useState(false);

    const fetchTransactions = useCallback(async () => {
        if (!selectedAccount) return;
        try {
            setLoadingTransactions(true);
            const pubkeyStr = selectedAccount.publicKey.toBase58 ? selectedAccount.publicKey.toBase58() : selectedAccount.address;

            const { data, error } = await supabase
                .from('tips')
                .select('*')
                .eq('sender_address', pubkeyStr)
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) {
                console.error('Supabase fetch error:', error);
                throw error;
            }

            if (!data) {
                setTransactions([]);
                return;
            }

            const uniqueReceivers = [...new Set(data.map((row: any) => row.receiver_address))];

            let profilesMap: Record<string, any> = {};
            if (uniqueReceivers.length > 0) {
                const { data: profilesData, error: profilesError } = await supabase
                    .from('profiles')
                    .select('wallet_address, avatar_url, username, display_name')
                    .in('wallet_address', uniqueReceivers);

                if (!profilesError && profilesData) {
                    profilesData.forEach((profile: any) => {
                        profilesMap[profile.wallet_address] = profile;
                    });
                }
            }

            const fetchedTransactions: Supporter[] = data.map((row: any) => {
                const profile = profilesMap[row.receiver_address];
                return {
                    id: row.id,
                    signature: row.signature,
                    senderAddress: row.sender_address,
                    receiverAddress: row.receiver_address,
                    amount: Number(row.amount),
                    message: row.message,
                    timestamp: new Date(row.created_at).getTime() / 1000,
                    avatarUri: profile?.avatar_url || '🎩',
                    name: profile?.username || profile?.display_name || null,
                };
            });

            setTransactions(fetchedTransactions);
        } catch (e) {
            console.error('Failed to fetch transactions from Supabase:', e);
        } finally {
            setLoadingTransactions(false);
        }
    }, [selectedAccount]);

    useEffect(() => {
        if (selectedAccount?.address) {
            fetchTransactions();
        }
    }, [selectedAccount?.address, fetchTransactions]);

    return { transactions, loadingTransactions, fetchTransactions };
}
