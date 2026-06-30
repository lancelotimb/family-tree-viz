"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Eye, EyeOff, Loader2, Lock } from "lucide-react";

type AdminLoginFormProps = {
  onSubmit: (password: string) => Promise<boolean>;
};

export function AdminLoginForm({ onSubmit }: AdminLoginFormProps) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!password.trim()) {
      setError("Saisissez le mot de passe admin.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const ok = await onSubmit(password.trim());
    setSubmitting(false);
    if (!ok) {
      setError("Mot de passe incorrect.");
      setPassword("");
    }
  };

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#faf6ef] px-4">
      <div className="w-full max-w-sm rounded-2xl border border-[#e8dfd0] bg-[#fffef9] p-8 shadow-xl">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-[#e8dfd0] bg-[#faf6ef]">
            <Lock className="h-6 w-6 text-[#a8957a]" aria-hidden />
          </div>
          <h1 className="font-serif text-2xl text-[#3d3428]">Admin</h1>
          <p className="mt-2 text-sm text-[#8b7d6b]">
            Connectez-vous pour modifier l&apos;arbre généalogique et enregistrer les changements
            dans le GEDCOM.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-[#a8957a]">
              Mot de passe
            </span>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full rounded-lg border border-[#e8dfd0] bg-white py-2.5 pl-3 pr-10 text-sm text-[#3d3428] outline-none transition-colors focus:border-[#c9b896] focus:ring-2 focus:ring-[#d4b896]/30"
                placeholder="Mot de passe admin"
                disabled={submitting}
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                disabled={submitting}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-[#a8957a] transition-colors hover:bg-[#f5efe4] hover:text-[#3d3428] disabled:opacity-60"
                aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" aria-hidden />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden />
                )}
              </button>
            </div>
          </label>

          {error ? <p className="text-sm text-red-700">{error}</p> : null}

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#6b7d5a] bg-[#eef4e8] px-4 py-2.5 text-sm font-medium text-[#4a5c3d] transition-colors hover:bg-[#e4eddb] disabled:opacity-60"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Se connecter
          </button>
        </form>

        <Link
          href="/"
          className="mt-6 flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#e8dfd0] bg-white px-4 py-2.5 text-sm font-medium text-[#3d3428] transition-colors hover:border-[#d4c4a8] hover:bg-[#faf6ef]"
        >
          <ArrowLeft className="h-4 w-4 shrink-0 text-[#8b7d6b]" aria-hidden />
          Retour à l&apos;arbre
        </Link>
      </div>
    </main>
  );
}
