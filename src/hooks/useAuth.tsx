import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type AuthCtx = {
  name: string | null;
  loading: boolean;
  signIn: (name: string) => void;
  signOut: () => void;
};

const Ctx = createContext<AuthCtx | undefined>(undefined);
const KEY = "makanapa.username";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [name, setName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(KEY);
      if (stored) setName(stored);
    } catch {}
    setLoading(false);
  }, []);

  const signIn = (n: string) => {
    const trimmed = n.trim();
    if (!trimmed) return;
    localStorage.setItem(KEY, trimmed);
    setName(trimmed);
  };

  const signOut = () => {
    localStorage.removeItem(KEY);
    setName(null);
  };

  return <Ctx.Provider value={{ name, loading, signIn, signOut }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be inside AuthProvider");
  return v;
}
