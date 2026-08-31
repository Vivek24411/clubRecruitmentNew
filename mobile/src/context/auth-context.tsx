import * as SecureStore from 'expo-secure-store';
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { apiRequest, setApiAccessToken } from '@/lib/api';
import { disableNativePush } from '@/lib/push-notifications';
import type { Student } from '@/types/api';

const tokenKey = 'discovr.student.session';

type AuthContextValue = {
  profile: Student | null;
  token: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  acceptRegistration: (token: string, student?: Student) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<Student | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function persistToken(token: string | null) {
  if (token) {
    await SecureStore.setItemAsync(tokenKey, token, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
  } else {
    await SecureStore.deleteItemAsync(tokenKey);
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [profile, setProfile] = useState<Student | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const applyToken = useCallback(async (nextToken: string | null) => {
    setToken(nextToken);
    setApiAccessToken(nextToken);
    await persistToken(nextToken);
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const response = await apiRequest<{ success: boolean; student: Student }>('/student/getProfile');
      setProfile(response.student);
      return response.student;
    } catch {
      setProfile(null);
      return null;
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const stored = await SecureStore.getItemAsync(tokenKey);
        if (!active) return;
        setToken(stored);
        setApiAccessToken(stored);
        if (stored) {
          const nextProfile = await refreshProfile();
          if (!nextProfile && active) await applyToken(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [applyToken, refreshProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const response = await apiRequest<{ success: boolean; token: string; student?: Student }>('/student/login', {
      method: 'POST', body: { email: email.trim().toLowerCase(), password },
    });
    await applyToken(response.token);
    setProfile(response.student || null);
    if (!response.student) await refreshProfile();
  }, [applyToken, refreshProfile]);

  const acceptRegistration = useCallback(async (nextToken: string, student?: Student) => {
    await applyToken(nextToken);
    setProfile(student || null);
    if (!student) await refreshProfile();
  }, [applyToken, refreshProfile]);

  const signOut = useCallback(async () => {
    try {
      await disableNativePush().catch(() => {});
      await apiRequest('/student/logout', { method: 'POST' });
    }
    finally { setProfile(null); await applyToken(null); }
  }, [applyToken]);

  const value = useMemo(() => ({ profile, token, loading, signIn, acceptRegistration, signOut, refreshProfile }), [profile, token, loading, signIn, acceptRegistration, signOut, refreshProfile]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
