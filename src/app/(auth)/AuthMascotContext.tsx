'use client';

import { createContext, useContext, useState } from 'react';

interface AuthMascotContextValue {
  eyesClosed: boolean;
  setEyesClosed: (v: boolean) => void;
}

const AuthMascotContext = createContext<AuthMascotContextValue>({
  eyesClosed: false,
  setEyesClosed: () => {},
});

export function AuthMascotProvider({ children }: { children: React.ReactNode }) {
  const [eyesClosed, setEyesClosed] = useState(false);
  return (
    <AuthMascotContext.Provider value={{ eyesClosed, setEyesClosed }}>
      {children}
    </AuthMascotContext.Provider>
  );
}

export function useAuthMascot() {
  return useContext(AuthMascotContext);
}
