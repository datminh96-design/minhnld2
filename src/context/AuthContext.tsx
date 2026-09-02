import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { getSupabaseClient, getSupabaseStatus } from '../lib/supabase';
import { Profile } from '../types';
import { DEFAULT_PROFILE } from '../lib/seedData';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  isSupabaseConfigured: boolean;
  isDemoUser: boolean;
  signInWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUpWithEmail: (email: string, password: string, fullName: string) => Promise<{ error: Error | null; data?: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: Error | null }>;
  switchMode: (toDemo: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemoUser, setIsDemoUser] = useState<boolean>(() => {
    const saved = localStorage.getItem('app_is_demo_mode');
    return saved !== null ? saved === 'true' : true; // Default to demo/interactive preview so it works right away!
  });

  const { isConfigured } = getSupabaseStatus();

  useEffect(() => {
    const initAuth = async () => {
      const { client, isConfigured: hasSupabase } = getSupabaseClient();

      if (hasSupabase && client && !isDemoUser) {
        try {
          const { data: { session: currentSession } } = await client.auth.getSession();
          setSession(currentSession);
          setUser(currentSession?.user || null);

          if (currentSession?.user) {
            // Load user profile from Supabase
            const { data, error } = await client
              .from('profiles')
              .select('*')
              .eq('id', currentSession.user.id)
              .single();

            if (!error && data) {
              setProfile(data);
            } else {
              // Fallback default profile
              setProfile({
                id: currentSession.user.id,
                full_name: currentSession.user.user_metadata?.full_name || 'Nguyễn Lê Đạt Minh',
                email: currentSession.user.email,
              });
            }
          }
        } catch (err) {
          console.warn('Supabase session fetch error:', err);
        }

        // Listen to auth state changes
        const { data: { subscription } } = client.auth.onAuthStateChange(async (_event, newSession) => {
          setSession(newSession);
          setUser(newSession?.user || null);
          if (newSession?.user) {
            const { data } = await client.from('profiles').select('*').eq('id', newSession.user.id).single();
            if (data) setProfile(data);
          } else {
            setProfile(null);
          }
        });

        setLoading(false);
        return () => subscription.unsubscribe();
      } else {
        // Demo mode: initialize default profile
        const savedProfile = localStorage.getItem('demo_user_profile');
        if (savedProfile) {
          try {
            setProfile(JSON.parse(savedProfile));
          } catch {
            setProfile(DEFAULT_PROFILE);
          }
        } else {
          setProfile(DEFAULT_PROFILE);
        }
        setLoading(false);
      }
    };

    initAuth();
  }, [isDemoUser, isConfigured]);

  const signInWithEmail = async (email: string, password: string) => {
    const { client, isConfigured: hasSupabase } = getSupabaseClient();
    if (!hasSupabase || !client) {
      // Demo simulated login
      const demoProf: Profile = {
        id: 'demo-user-id',
        full_name: 'Nguyễn Lê Đạt Minh',
        email: email || 'datminh96@gmail.com',
      };
      setProfile(demoProf);
      localStorage.setItem('demo_user_profile', JSON.stringify(demoProf));
      setIsDemoUser(true);
      return { error: null };
    }

    try {
      const { error } = await client.auth.signInWithPassword({ email, password });
      if (error) return { error };
      setIsDemoUser(false);
      localStorage.setItem('app_is_demo_mode', 'false');
      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  const signUpWithEmail = async (email: string, password: string, fullName: string) => {
    const { client, isConfigured: hasSupabase } = getSupabaseClient();
    if (!hasSupabase || !client) {
      // Demo simulated register
      const demoProf: Profile = {
        id: 'demo-user-id',
        full_name: fullName || 'Nguyễn Lê Đạt Minh',
        email,
      };
      setProfile(demoProf);
      localStorage.setItem('demo_user_profile', JSON.stringify(demoProf));
      setIsDemoUser(true);
      return { error: null };
    }

    try {
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });
      if (error) return { error };
      setIsDemoUser(false);
      localStorage.setItem('app_is_demo_mode', 'false');
      return { error: null, data };
    } catch (err: any) {
      return { error: err };
    }
  };

  const signOut = async () => {
    const { client } = getSupabaseClient();
    if (client) {
      await client.auth.signOut();
    }
    setUser(null);
    setSession(null);
    setProfile(DEFAULT_PROFILE);
    setIsDemoUser(true);
    localStorage.setItem('app_is_demo_mode', 'true');
  };

  const resetPassword = async (email: string) => {
    const { client, isConfigured: hasSupabase } = getSupabaseClient();
    if (!hasSupabase || !client) {
      return { error: null }; // Demo simulation success
    }
    const { error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error };
  };

  const updatePassword = async (newPassword: string) => {
    const { client, isConfigured: hasSupabase } = getSupabaseClient();
    if (!hasSupabase || !client) {
      return { error: null };
    }
    const { error } = await client.auth.updateUser({ password: newPassword });
    return { error };
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (isDemoUser || !user) {
      const updated = { ...(profile || DEFAULT_PROFILE), ...updates };
      setProfile(updated);
      localStorage.setItem('demo_user_profile', JSON.stringify(updated));
      return { error: null };
    }

    const { client } = getSupabaseClient();
    if (!client) return { error: new Error('Supabase not connected') };

    const { error } = await client
      .from('profiles')
      .update(updates)
      .eq('id', user.id);

    if (!error) {
      setProfile(prev => prev ? { ...prev, ...updates } : null);
    }
    return { error };
  };

  const switchMode = (toDemo: boolean) => {
    setIsDemoUser(toDemo);
    localStorage.setItem('app_is_demo_mode', toDemo ? 'true' : 'false');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        isSupabaseConfigured: isConfigured,
        isDemoUser,
        signInWithEmail,
        signUpWithEmail,
        signOut,
        resetPassword,
        updatePassword,
        updateProfile,
        switchMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
