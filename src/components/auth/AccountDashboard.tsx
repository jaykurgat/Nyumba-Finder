"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, UserRound, Mail, ShieldCheck } from "lucide-react";

type AccountUser = {
  email: string;
  profile: { displayName: string | null; firstName: string | null; lastName: string | null; avatarUrl: string | null } | null;
};

export function AccountDashboard({ user }: { user: AccountUser }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const name = user.profile?.displayName || [user.profile?.firstName, user.profile?.lastName].filter(Boolean).join(" ") || user.email.split("@")[0];

  async function signOut() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Could not sign out. Please try again.");
      router.replace("/account?mode=login");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not sign out. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-2xl py-10 sm:py-16">
      <div className="mb-6">
        <p className="text-sm font-medium text-primary">Your account</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Welcome, {name}</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">You are signed in to NyumbaFinder.</p>
      </div>
      <div className="rounded-2xl border bg-card p-5 shadow-sm sm:p-7">
        <div className="flex items-center gap-4">
          {user.profile?.avatarUrl ? (
            <img src={user.profile.avatarUrl} alt="" className="h-14 w-14 rounded-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary"><UserRound className="h-6 w-6" /></div>
          )}
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold">{name}</h2>
            <p className="mt-1 flex items-center gap-2 break-all text-sm text-muted-foreground"><Mail className="h-4 w-4 shrink-0" />{user.email}</p>
          </div>
        </div>
        <div className="mt-6 flex items-start gap-3 rounded-xl bg-muted/50 p-4 text-sm">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <p>Your NyumbaFinder account is active. You can use this account to sign in again with your registered method.</p>
        </div>
        {error && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <button type="button" onClick={signOut} disabled={busy} className="mt-6 inline-flex h-10 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-medium transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60">
          <LogOut className="h-4 w-4" />{busy ? "Signing out…" : "Sign out"}
        </button>
      </div>
    </section>
  );
}
