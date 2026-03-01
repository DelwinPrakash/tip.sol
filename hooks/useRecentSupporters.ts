import { Account } from '@/components/providers/AuthorizationProvider';
import { useConnection } from '@/components/providers/ConnectionProvider';
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { useCallback, useEffect, useState } from 'react';

export interface Supporter {
    signature: string;
    senderAddress: string;
    amount: number;
    timestamp: number | null | undefined;
}

export function useRecentSupporters(selectedAccount: Account | null) {
    const { connection } = useConnection();
    const [supporters, setSupporters] = useState<Supporter[]>([]);
    const [loadingSupporters, setLoadingSupporters] = useState(false);

    const fetchSupporters = useCallback(async () => {
        if (!selectedAccount) return;
        try {
            setLoadingSupporters(true);
            const pubkey = new PublicKey(selectedAccount.publicKey);
            const signatures = await connection.getSignaturesForAddress(pubkey, { limit: 5 }, 'confirmed');

            if (signatures.length === 0) {
                setSupporters([]);
                return;
            }

            const parsedTxs: (import('@solana/web3.js').ParsedTransactionWithMeta | null)[] = [];
            for (const sig of signatures) {
                try {
                    const tx = await connection.getParsedTransaction(sig.signature, {
                        commitment: 'confirmed',
                        maxSupportedTransactionVersion: 0
                    });
                    parsedTxs.push(tx);
                    await new Promise(resolve => setTimeout(resolve, 300));
                } catch (err) {
                    console.warn(`Failed to fetch tx ${sig.signature}`, err);
                }
            }

            const fetchedSupporters: Supporter[] = [];

            parsedTxs.forEach((tx, index) => {
                if (!tx || !tx.meta || tx.meta.err) return;

                const pubkeyStr = pubkey.toBase58();
                const accountIndex = tx.transaction.message.accountKeys.findIndex(
                    (k) => k.pubkey.toBase58() === pubkeyStr
                );

                if (accountIndex === -1) return;

                const preBalance = tx.meta.preBalances[accountIndex];
                const postBalance = tx.meta.postBalances[accountIndex];

                const receivedDiff = postBalance - preBalance;

                if (receivedDiff > 0) {
                    let senderAddress = 'Unknown';
                    for (let i = 0; i < tx.transaction.message.accountKeys.length; i++) {
                        if (i !== accountIndex) {
                            const diff = tx.meta.postBalances[i] - tx.meta.preBalances[i];
                            // Assuming sender's balance decreased
                            if (diff < 0) {
                                senderAddress = tx.transaction.message.accountKeys[i].pubkey.toBase58();
                                break;
                            }
                        }
                    }

                    fetchedSupporters.push({
                        signature: signatures[index].signature,
                        senderAddress,
                        amount: receivedDiff / LAMPORTS_PER_SOL,
                        timestamp: tx.blockTime,
                    });
                }
            });

            setSupporters(fetchedSupporters);
        } catch (e) {
            console.error('Failed to fetch supporters:', e);
        } finally {
            setLoadingSupporters(false);
        }
    }, [connection, selectedAccount]);

    useEffect(() => {
        if (selectedAccount?.address) {
            fetchSupporters();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedAccount?.address]);

    return { supporters, loadingSupporters, fetchSupporters };
}
