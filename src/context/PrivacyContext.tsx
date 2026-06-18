'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';

const STORAGE_KEY = 'moneda:privacy';

interface PrivacyContextValue {
  isPrivate: boolean;
  togglePrivacy: () => void;
}

const PrivacyContext = createContext<PrivacyContextValue | null>(null);

export function PrivacyProvider({ children }: { children: ReactNode }) {
  const [isPrivate, setIsPrivate] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored === '1') {
        setIsPrivate(true);
      }
    } catch {
      // sessionStorage unavailable
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, isPrivate ? '1' : '0');
    } catch {
      // sessionStorage unavailable
    }
  }, [isPrivate, hydrated]);

  const togglePrivacy = useCallback(() => {
    setIsPrivate((prev) => !prev);
  }, []);

  return (
    <PrivacyContext.Provider value={{ isPrivate, togglePrivacy }}>
      {children}
    </PrivacyContext.Provider>
  );
}

export function usePrivacy(): PrivacyContextValue {
  const ctx = useContext(PrivacyContext);
  if (!ctx) {
    throw new Error('usePrivacy must be used within a PrivacyProvider');
  }
  return ctx;
}
