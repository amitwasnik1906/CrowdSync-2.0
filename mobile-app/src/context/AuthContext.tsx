import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { TOKEN_KEY } from '@/api/client';
import { verifyOtp, type ParentLoginResponse } from '@/api/auth';

const PARENT_KEY = 'crowdsync.parent';

type Parent = ParentLoginResponse['parent'];

type AuthState = {
  loading: boolean;
  token: string | null;
  parent: Parent | null;
  signIn: (phone: string, otp: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthCtx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [parent, setParent] = useState<Parent | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [t, p] = await Promise.all([
          AsyncStorage.getItem(TOKEN_KEY),
          AsyncStorage.getItem(PARENT_KEY),
        ]);
        if (t) setToken(t);
        if (p) setParent(JSON.parse(p) as Parent);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const signIn = async (phone: string, otp: string) => {
    const res = await verifyOtp(phone, otp);
    await AsyncStorage.setItem(TOKEN_KEY, res.token);
    await AsyncStorage.setItem(PARENT_KEY, JSON.stringify(res.parent));
    setToken(res.token);
    setParent(res.parent);
  };

  const signOut = async () => {
    await AsyncStorage.multiRemove([TOKEN_KEY, PARENT_KEY]);
    setToken(null);
    setParent(null);
  };

  return (
    <AuthCtx.Provider value={{ loading, token, parent, signIn, signOut }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
