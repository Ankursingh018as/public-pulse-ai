'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  name: string;
  trustScore: number;
  reportsSubmitted: number;
  verificationsGiven: number;
}

interface UserContextType {
  user: User | null;
  setUser: (user: User) => void;
  isAuthenticated: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const STORAGE_KEY = 'publicpulse_user';

// Generate or retrieve user ID
function getOrCreateUserId(): string {
  if (typeof window === 'undefined') return 'temp_user';
  
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      return parsed.id;
    } catch {}
  }

  // Generate new unique user ID
  const newId = `citizen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const newUser = {
    id: newId,
    name: 'Citizen User',
    trustScore: 50,
    reportsSubmitted: 0,
    verificationsGiven: 0
  };
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
  return newId;
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);

  useEffect(() => {
    // Load user from localStorage on mount
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          setUserState(JSON.parse(stored));
        } catch {
          // Create new user if parse fails
          const userId = getOrCreateUserId();
          const newUser = {
            id: userId,
            name: 'Citizen User',
            trustScore: 50,
            reportsSubmitted: 0,
            verificationsGiven: 0
          };
          setUserState(newUser);
        }
      } else {
        // Create new user
        const userId = getOrCreateUserId();
        const newUser = {
          id: userId,
          name: 'Citizen User',
          trustScore: 50,
          reportsSubmitted: 0,
          verificationsGiven: 0
        };
        setUserState(newUser);
      }
    }
  }, []);

  const setUser = (newUser: User) => {
    setUserState(newUser);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
    }
  };

  return (
    <UserContext.Provider value={{ 
      user, 
      setUser, 
      isAuthenticated: !!user 
    }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
