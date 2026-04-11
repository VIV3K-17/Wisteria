import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

export interface User {
  id: string;
  fullName: string;
  email: string;
  aadhaarNumber: string;
  emergencyContacts: EmergencyContact[];
}

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (data: SignupData) => Promise<boolean>;
  logout: () => void;
  addEmergencyContact: (contact: Omit<EmergencyContact, 'id'>) => void;
  removeEmergencyContact: (id: string) => void;
}

interface SignupData {
  fullName: string;
  email: string;
  password: string;
  aadhaarNumber: string;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('safety_user');
    return stored ? JSON.parse(stored) : null;
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem('safety_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('safety_user');
    }
  }, [user]);

  const login = useCallback(async (email: string, _password: string): Promise<boolean> => {
    const storedUsers = JSON.parse(localStorage.getItem('safety_users') || '[]');
    const found = storedUsers.find((u: User & { password: string }) => u.email === email);
    if (found) {
      const { password: _, ...userData } = found;
      setUser(userData);
      return true;
    }
    return false;
  }, []);

  const signup = useCallback(async (data: SignupData): Promise<boolean> => {
    const storedUsers = JSON.parse(localStorage.getItem('safety_users') || '[]');
    if (storedUsers.find((u: any) => u.email === data.email)) return false;
    
    const newUser: User & { password: string } = {
      id: crypto.randomUUID(),
      fullName: data.fullName,
      email: data.email,
      aadhaarNumber: data.aadhaarNumber,
      password: data.password,
      emergencyContacts: [],
    };
    storedUsers.push(newUser);
    localStorage.setItem('safety_users', JSON.stringify(storedUsers));
    const { password: _, ...userData } = newUser;
    setUser(userData);
    return true;
  }, []);

  const logout = useCallback(() => setUser(null), []);

  const addEmergencyContact = useCallback((contact: Omit<EmergencyContact, 'id'>) => {
    setUser(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        emergencyContacts: [...prev.emergencyContacts, { ...contact, id: crypto.randomUUID() }],
      };
    });
  }, []);

  const removeEmergencyContact = useCallback((id: string) => {
    setUser(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        emergencyContacts: prev.emergencyContacts.filter(c => c.id !== id),
      };
    });
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      login,
      signup,
      logout,
      addEmergencyContact,
      removeEmergencyContact,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
