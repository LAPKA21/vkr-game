import React, { createContext, useContext, useState, useEffect } from 'react';

export interface BotMatchHistory {
  id: string;
  botDifficulty: string;
  gamesPlayed: number;
  chipsWon: number;
  opponentStyle: string;
  botLogs: string[];
  createdAt: string;
}

export interface UserAchievement {
  id: string;
  userId: string;
  key: string;
  unlockedAt: string;
}

export interface User {
  id: string;
  email: string;
  username: string;
  chips: number;
  rating: number;
  totalGamesPlayed?: number;
  totalChipsWon?: number;
  showHints?: boolean;
  botMatches?: BotMatchHistory[];
  achievements?: UserAchievement[];
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (user: User, token: string) => void;
  logout: () => void;
  addChips: (amount?: number) => Promise<void>;
  saveStats: (stats: { gamesPlayed: number, chipsWon: number, botMatch?: boolean, botDifficulty?: string, opponentStyle?: string, botLogs?: string[] }) => Promise<void>;
  updateSettings: (settings: { showHints: boolean }) => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = async (currentToken: string) => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${currentToken}` }
      });
      if (!res.ok) throw new Error('Session expired');
      const data = await res.json();
      setUser(data);
    } catch (err) {
      console.error(err);
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchProfile(token);
    } else {
      setIsLoading(false);
    }
  }, [token]);

  const login = (newUser: User, newToken: string) => {
    setUser(newUser);
    setToken(newToken);
    localStorage.setItem('token', newToken);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
  };

  const addChips = async (amount: number = 1000) => {
    if (!token) return;
    try {
      const res = await fetch('/api/auth/add-chips', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ amount })
      });
      if (!res.ok) throw new Error('Ошбика начисления фишек');
      const data = await res.json();
      if (user) {
        setUser({ ...user, chips: data.chips });
      }
    } catch (err) {
      console.error(err);
      alert('Не удалось получить фишки. Попробуйте позже.');
    }
  };

  const saveStats = async (stats: { gamesPlayed: number, chipsWon: number, botMatch?: boolean, botDifficulty?: string, opponentStyle?: string, botLogs?: string[] }) => {
    if (!token || !user) return;
    try {
      const res = await fetch('/api/auth/save-stats', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(stats)
      });
      if (!res.ok) throw new Error('Ошибка сохранения статистики');
      const data = await res.json();
      setUser(data.user);
    } catch (err) {
      console.error(err);
    }
  };

  const updateSettings = async (settings: { showHints: boolean }) => {
    if (!token || !user) return;
    try {
      const res = await fetch('/api/auth/update-settings', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(settings)
      });
      if (!res.ok) throw new Error('Ошибка обновления настроек');
      const data = await res.json();
      setUser({ ...user, showHints: data.showHints });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, addChips, saveStats, updateSettings, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
