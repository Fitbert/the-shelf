"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
    });
    if (error) {
      setStatus("error");
      setError(error.message);
      return;
    }
    setStatus("sent");
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="font-display italic font-bold text-3xl text-teal-deep">The Shelf</div>
          <div className="font-mono text-[0.68rem] tracking-[0.08em] uppercase text-rust/75 mt-1">
            your records, spinning
          </div>
        </div>

        {status === "sent" ? (
          <div className="font-mono text-sm text-center text-ink/70 bg-cream-soft rounded-xl p-5 border border-teal-deep/20">
            Check <span className="text-teal-deep">{email}</span> for a sign-in link.
          </div>
        ) : (
          <form onSubmit={sendLink} className="space-y-3">
            <div>
              <label className="block font-mono text-[0.68rem] uppercase tracking-[0.05em] text-teal-deep mb-1.5">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3 py-2.5 rounded-lg border-[1.5px] border-teal-deep/25 bg-cream-soft text-sm focus:outline-2 focus:outline-teal focus:outline-offset-1"
              />
            </div>
            {error && <p className="font-mono text-xs text-rust">{error}</p>}
            <button
              type="submit"
              disabled={status === "sending"}
              className="w-full rounded-full bg-orange text-ink font-semibold text-sm py-3 shadow-[0_4px_12px_rgba(242,163,75,0.4)] disabled:opacity-40 transition-transform active:scale-[0.98]"
            >
              {status === "sending" ? "Sending…" : "Send sign-in link"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
