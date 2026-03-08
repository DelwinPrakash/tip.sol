import { Connection, type ConnectionConfig } from '@solana/web3.js';
import React, {
  createContext,
  type FC,
  type ReactNode,
  useContext,
  useMemo,
} from 'react';

export const RPC_ENDPOINT = process.env.EXPO_PUBLIC_SOLANA_RPC_URL || 'mainnet-beta';

export interface ConnectionProviderProps {
  children: ReactNode;
  endpoint: string;
  config?: ConnectionConfig;
}

export const ConnectionProvider: FC<ConnectionProviderProps> = ({
  children,
  endpoint,
  config = { commitment: 'confirmed' },
}) => {
  const connection = useMemo(
    () => new Connection(endpoint, config),
    [endpoint, config],
  );

  return (
    <ConnectionContext.Provider value={{ connection }}>
      {children}
    </ConnectionContext.Provider>
  );
};

export interface ConnectionContextState {
  connection: Connection;
}

export const ConnectionContext = createContext<ConnectionContextState>(
  {} as ConnectionContextState,
);

export function useConnection(): ConnectionContextState {
  return useContext(ConnectionContext);
}
