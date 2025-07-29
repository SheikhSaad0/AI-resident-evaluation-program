// lib/auth.tsx
import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/router';

interface UserProfile {
  id: string;
  name: string;
  photoUrl?: string | null;
  type: 'resident' | 'attending' | 'programDirector';
}

interface AuthContextType {
  user: UserProfile | null;
  database: 'testing' | 'production';
  loading: boolean; // Add loading state
  login: (user: UserProfile, database: 'testing' | 'production') => void;
  logout: () => void;
  switchDatabase: (database: 'testing' | 'production') => void;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [database, setDatabase] = useState<'testing' | 'production'>('testing');
  const [loading, setLoading] = useState(true); // Start as true
  const router = useRouter();

  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('user');
      const savedDatabase = localStorage.getItem('database');

      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
      if (savedDatabase) {
        setDatabase(savedDatabase as 'testing' | 'production');
      }
    } catch (error) {
        console.error("Failed to load auth state from local storage", error);
    } finally {
        setLoading(false); // Set loading to false after checking
    }
  }, []);

  const login = (user: UserProfile, db: 'testing' | 'production') => {
    setUser(user);
    setDatabase(db);
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('database', db);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    router.push('/login'); // Redirect to login on logout
  };

  const switchDatabase = (db: 'testing' | 'production') => {
    setDatabase(db);
    localStorage.setItem('database', db);
  };

  return (
    <AuthContext.Provider value={{ user, database, loading, login, logout, switchDatabase }}>
      {children}
    </AuthContext.Provider>
  );
};