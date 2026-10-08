import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types.ts';
import { api } from '../services/api.ts';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string, fullName: string, role?: string) => Promise<void>;
  logout: () => void;
  resetPassword: (email: string, newPass: string) => Promise<void>;
  updateProfile: (data: { fullName?: string; bio?: string; role?: UserRole }) => Promise<void>;
  switchRole: (role: UserRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_STORAGE_USER_KEY = 'remedi_user_session';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize session from local storage, then verify with server
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setUser(parsed);
      } else {
        // Default to demo admin / creator user for seamless immediate testing if nothing exists
        const defaultUser: User = {
          id: 'usr_admin',
          email: 'samuelosemu5@gmail.com',
          fullName: 'Samuel Osemu',
          role: 'admin',
          bio: 'Remedi Pro Lead Platform Administrator & Educational Creator',
          disabled: false,
          createdAt: new Date().toISOString(),
        };
        setUser(defaultUser);
        localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(defaultUser));
      }
    } catch (e) {
      console.error('Error loading stored user session:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, pass: string) => {
    const res = await api.login({ email, password: pass });
    setUser(res.user);
    localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(res.user));
  };

  const register = async (email: string, pass: string, fullName: string, role?: string) => {
    const res = await api.register({ email, password: pass, fullName, role });
    setUser(res.user);
    localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(res.user));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
  };

  const resetPassword = async (email: string, newPass: string) => {
    await api.resetPassword({ email, newPassword: newPass });
  };

  const updateProfile = async (data: { fullName?: string; bio?: string; role?: UserRole }) => {
    if (!user) return;
    const res = await api.updateProfile(user.id, data);
    setUser(res.user);
    localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(res.user));
  };

  const switchRole = async (newRole: UserRole) => {
    if (!user) return;
    await updateProfile({ role: newRole });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        register,
        logout,
        resetPassword,
        updateProfile,
        switchRole,
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
