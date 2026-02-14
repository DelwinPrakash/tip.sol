import { Account, AuthorizationResult } from '@solana-mobile/mobile-wallet-adapter-protocol';
import {
    transact,
    Web3MobileWallet,
} from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';
import { useCallback, useState } from 'react';

const APP_IDENTITY = {
    name: 'SolTip',
    uri: 'https://soltip.app',
    icon: 'favicon.ico',
};

export function useAuthorization() {
    const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
    const [authorization, setAuthorization] = useState<AuthorizationResult | null>(null);

    const authorizeSession = useCallback(async (wallet: Web3MobileWallet) => {
        const authorizationResult = await wallet.authorize({
            cluster: 'devnet',
            identity: APP_IDENTITY,
        });
        setAuthorization(authorizationResult);
        setSelectedAccount(authorizationResult.accounts[0]);
        return authorizationResult;
    }, []);

    const deauthorizeSession = useCallback(async (wallet: Web3MobileWallet) => {
        if (!authorization?.auth_token) {
            return;
        }
        await wallet.deauthorize({ auth_token: authorization.auth_token });
        setSelectedAccount(null);
        setAuthorization(null);
    }, [authorization]);

    const handleConnect = useCallback(async () => {
        try {
            await transact(async (wallet) => {
                await authorizeSession(wallet);
            });
        } catch (err: any) {
            console.log('Authorization failed', err);
        }
    }, [authorizeSession]);

    const handleDisconnect = useCallback(async () => {
        try {
            await transact(async (wallet) => {
                await deauthorizeSession(wallet);
            });
        } catch (err: any) {
            console.log('Deauthorization failed', err);
        }
    }, [deauthorizeSession]);

    return {
        selectedAccount,
        authorizeSession,
        deauthorizeSession,
        handleConnect,
        handleDisconnect
    };
}
