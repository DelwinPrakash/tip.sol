import { supabase } from '@/lib/supabase';
import { useCallback, useState } from 'react';

export interface TipHistoryItem {
    id: string;
    title: string;
    description: string;
    targetAmount: number;
    amountRaised: number;
    status: string;
    createdAt: number;
}

export function useTipHistory(walletAddress: string | undefined) {
    const [history, setHistory] = useState<TipHistoryItem[]>([]);

    const loadHistory = useCallback(async () => {
        if (!walletAddress) return;
        try {
            const { data, error } = await supabase
                .from('tip_goals')
                .select('*')
                .eq('wallet_address', walletAddress)
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (data) {
                const parsedHistory = data.map(item => ({
                    id: item.id,
                    title: item.title,
                    description: item.description || '',
                    targetAmount: Number(item.target_amount),
                    amountRaised: Number(item.amount_raised) || 0,
                    status: item.status,
                    createdAt: new Date(item.created_at).getTime()
                }));
                setHistory(parsedHistory);
            } else {
                setHistory([]);
            }
        } catch (e) {
            console.error('Failed to load tip history', e);
        }
    }, [walletAddress]);

    return { history, loadHistory };
}
