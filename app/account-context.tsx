'use client';

import { createContext, useContext } from 'react';
import type { SessionUser } from '@/lib/auth';

const AccountContext = createContext<SessionUser | null>(null);

export function AccountProvider({ account, children }: { account: SessionUser | null; children: React.ReactNode }) {
  return <AccountContext.Provider value={account}>{children}</AccountContext.Provider>;
}

export function useAccount() {
  return useContext(AccountContext);
}
