import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AuthorizationResult,
  AuthorizeAPI,
  Account as AuthorizedAccount,
  AuthToken,
  Base64EncodedAddress,
  DeauthorizeAPI,
  ReauthorizeAPI,
} from '@solana-mobile/mobile-wallet-adapter-protocol';
import { PublicKey } from '@solana/web3.js';
import { toUint8Array } from 'js-base64';
import React, { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';

import { RPC_ENDPOINT } from './ConnectionProvider';

const AUTHORIZATION_STORAGE_KEY = 'authorization_state';

export type Account = Readonly<{
  address: Base64EncodedAddress;
  label?: string;
  publicKey: PublicKey;
}>;

type Authorization = Readonly<{
  accounts: Account[];
  authToken: AuthToken;
  selectedAccount: Account;
}>;

function getAccountFromAuthorizedAccount(account: AuthorizedAccount): Account {
  return {
    ...account,
    publicKey: getPublicKeyFromAddress(account.address),
  };
}

function getAuthorizationFromAuthorizationResult(
  authorizationResult: AuthorizationResult,
  previouslySelectedAccount?: Account,
): Authorization {
  let selectedAccount: Account;
  if (
    // We have yet to select an account.
    previouslySelectedAccount == null ||
    // The previously selected account is no longer in the set of authorized addresses.
    !authorizationResult.accounts.some(
      ({ address }) => address === previouslySelectedAccount.address,
    )
  ) {
    const firstAccount = authorizationResult.accounts[0];
    selectedAccount = getAccountFromAuthorizedAccount(firstAccount);
  } else {
    selectedAccount = previouslySelectedAccount;
  }
  return {
    accounts: authorizationResult.accounts.map(getAccountFromAuthorizedAccount),
    authToken: authorizationResult.auth_token,
    selectedAccount,
  };
}

function getPublicKeyFromAddress(address: Base64EncodedAddress): PublicKey {
  const publicKeyByteArray = toUint8Array(address);
  return new PublicKey(publicKeyByteArray);
}

export const APP_IDENTITY = {
  name: 'SolTip',
  uri: 'https://soltip.app',
  icon: 'favicon.ico',
};

export interface AuthorizationProviderContext {
  accounts: Account[] | null;
  authorizeSession: (wallet: AuthorizeAPI & ReauthorizeAPI) => Promise<Account>;
  deauthorizeSession: (wallet: DeauthorizeAPI) => void;
  onChangeAccount: (nextSelectedAccount: Account) => void;
  selectedAccount: Account | null;
}

const AuthorizationContext = React.createContext<AuthorizationProviderContext>({
  accounts: null,
  authorizeSession: (_wallet: AuthorizeAPI & ReauthorizeAPI) => {
    throw new Error('AuthorizationProvider not initialized');
  },
  deauthorizeSession: (_wallet: DeauthorizeAPI) => {
    throw new Error('AuthorizationProvider not initialized');
  },
  onChangeAccount: (_nextSelectedAccount: Account) => {
    throw new Error('AuthorizationProvider not initialized');
  },
  selectedAccount: null,
});

function AuthorizationProvider(props: { children: ReactNode }) {
  const { children } = props;
  const [authorization, setAuthorization] = useState<Authorization | null>(
    null,
  );

  useEffect(() => {
    AsyncStorage.getItem(AUTHORIZATION_STORAGE_KEY).then(storedAuth => {
      if (storedAuth) {
        try {
          const parsed = JSON.parse(storedAuth);
          const reconstructed: Authorization = {
            accounts: parsed.accounts.map((acc: any) => ({
              ...acc,
              publicKey: getPublicKeyFromAddress(acc.address),
            })),
            authToken: parsed.authToken,
            selectedAccount: {
              ...parsed.selectedAccount,
              publicKey: getPublicKeyFromAddress(parsed.selectedAccount.address)
            }
          };
          setAuthorization(reconstructed);
        } catch (e) {
          console.error('Failed to parse stored authorization', e);
        }
      }
    });
  }, []);

  const saveAuthorization = async (auth: Authorization | null) => {
    try {
      if (auth) {
        const authToStore = {
          accounts: auth.accounts.map(acc => ({ address: acc.address, label: acc.label })),
          authToken: auth.authToken,
          selectedAccount: { address: auth.selectedAccount.address, label: auth.selectedAccount.label }
        };
        await AsyncStorage.setItem(AUTHORIZATION_STORAGE_KEY, JSON.stringify(authToStore));
      } else {
        await AsyncStorage.removeItem(AUTHORIZATION_STORAGE_KEY);
      }
    } catch (e) {
      console.error('Failed to save authorization', e);
    }
  };

  const handleAuthorizationResult = useCallback(
    async (
      authorizationResult: AuthorizationResult,
      currentSelectedAccount?: Account
    ): Promise<Authorization> => {
      const nextAuthorization = getAuthorizationFromAuthorizationResult(
        authorizationResult,
        currentSelectedAccount,
      );
      setAuthorization(nextAuthorization);
      await saveAuthorization(nextAuthorization);
      return nextAuthorization;
    },
    [],
  );

  const authorizeSession = useCallback(
    async (wallet: AuthorizeAPI & ReauthorizeAPI) => {
      const authorizationResult = await (authorization
        ? wallet.reauthorize({
          auth_token: authorization.authToken,
          identity: APP_IDENTITY,
        })
        : wallet.authorize({
          cluster: RPC_ENDPOINT,
          identity: APP_IDENTITY,
        }));
      return (await handleAuthorizationResult(authorizationResult, authorization?.selectedAccount))
        .selectedAccount;
    },
    [authorization, handleAuthorizationResult],
  );

  const deauthorizeSession = useCallback(
    async (wallet: DeauthorizeAPI) => {
      if (authorization?.authToken == null) {
        return;
      }
      await wallet.deauthorize({ auth_token: authorization.authToken });
      setAuthorization(null);
      await saveAuthorization(null);
    },
    [authorization],
  );

  const onChangeAccount = useCallback(
    (nextSelectedAccount: Account) => {
      setAuthorization(currentAuthorization => {
        if (!currentAuthorization) return currentAuthorization;
        if (
          !currentAuthorization.accounts.some(
            ({ address }) => address === nextSelectedAccount.address,
          )
        ) {
          throw new Error(
            `${nextSelectedAccount.address} is not one of the available addresses`,
          );
        }
        const nextAuth = {
          ...currentAuthorization,
          selectedAccount: nextSelectedAccount,
        };
        saveAuthorization(nextAuth).catch(console.error);
        return nextAuth;
      });
    },
    [],
  );
  const value = useMemo(
    () => ({
      accounts: authorization?.accounts ?? null,
      authorizeSession,
      deauthorizeSession,
      onChangeAccount,
      selectedAccount: authorization?.selectedAccount ?? null,
    }),
    [authorization, authorizeSession, deauthorizeSession, onChangeAccount],
  );

  return (
    <AuthorizationContext.Provider value={value}>
      {children}
    </AuthorizationContext.Provider>
  );
}

const useAuthorization = () => React.useContext(AuthorizationContext);

export { AuthorizationProvider, useAuthorization };

