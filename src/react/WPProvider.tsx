import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { RestDataSource } from '../api/rest/dataSource';
import { WPAdapterConfig } from '../types';
import { WPDataSource } from '../api/types';

const WPContext = createContext<WPDataSource | null>(null);

export interface WPProviderProps {
  config: WPAdapterConfig;
  children: ReactNode;
}

export function WPProvider({ config, children }: WPProviderProps) {
  const client = useMemo(
    () => new RestDataSource(config),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config.baseUrl]
  );

  return <WPContext.Provider value={client}>{children}</WPContext.Provider>;
}

export function useWPClient(): WPDataSource {
  const client = useContext(WPContext);
  if (!client) {
    throw new Error(
      'useWPClient (or any mentonext hook) must be used within a <WPProvider>.'
    );
  }
  return client;
}
