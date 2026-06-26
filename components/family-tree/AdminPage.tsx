"use client";

import { useCallback, useEffect, useState } from "react";
import {
  FamilyGraphProvider,
  useFamilyGraphAdmin,
} from "@/components/family-tree/FamilyGraphContext";
import { FamilyTreeVisualizer } from "@/components/family-tree/FamilyTreeVisualizer";
import { AdminLoginForm } from "@/components/family-tree/AdminLoginForm";
import {
  clearStoredAdminKey,
  getStoredAdminKey,
  setStoredAdminKey,
} from "@/lib/adminClientStorage";
import {
  clearAdminSession,
  establishAdminSession,
} from "@/lib/adminSessionClient";

type AdminPageProps = {
  initialGedcom: string;
};

type AuthState = "checking" | "login" | "authed";

export function AdminPage({ initialGedcom }: AdminPageProps) {
  const [authState, setAuthState] = useState<AuthState>("checking");

  const tryLogin = useCallback(async (key: string, remember: boolean): Promise<boolean> => {
    const ok = await establishAdminSession(key);
    if (!ok) return false;
    if (remember) {
      setStoredAdminKey(key);
    }
    setAuthState("authed");
    return true;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      const stored = getStoredAdminKey();
      if (stored) {
        const ok = await establishAdminSession(stored);
        if (cancelled) return;
        if (ok) {
          setAuthState("authed");
          return;
        }
        clearStoredAdminKey();
      }
      if (!cancelled) setAuthState("login");
    }

    void restoreSession();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogout = useCallback(async () => {
    await clearAdminSession();
    clearStoredAdminKey();
    setAuthState("login");
  }, []);

  if (authState === "checking") {
    return (
      <main className="flex h-dvh w-full items-center justify-center bg-[#faf6ef]">
        <p className="text-sm text-[#8b7d6b]">Checking admin session…</p>
      </main>
    );
  }

  if (authState === "login") {
    return (
      <AdminLoginForm
        onSubmit={(password) => tryLogin(password, true)}
      />
    );
  }

  return (
    <FamilyGraphProvider initialGedcom={initialGedcom} adminMode>
      <AdminTreeView onLogout={handleLogout} />
    </FamilyGraphProvider>
  );
}

function AdminTreeView({ onLogout }: { onLogout: () => void }) {
  const { graphReady } = useFamilyGraphAdmin();

  if (!graphReady) {
    return (
      <main className="flex h-dvh w-full items-center justify-center bg-[#faf6ef]">
        <p className="text-sm text-[#8b7d6b]">Loading family tree…</p>
      </main>
    );
  }

  return (
    <main className="h-dvh w-full overflow-hidden">
      <FamilyTreeVisualizer onAdminLogout={onLogout} />
    </main>
  );
}
