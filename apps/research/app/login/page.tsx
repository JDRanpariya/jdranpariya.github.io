"use client";

import { useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const passphrase = String(form.get("passphrase") ?? "");
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          passphrase,
          returnTo: searchParams.get("returnTo") ?? "/library/great-minds",
        }),
      });
      const result = (await response.json()) as { error?: string; returnTo?: string };
      if (!response.ok) throw new Error(result.error ?? "Unable to sign in.");
      window.location.assign(result.returnTo ?? "/library/great-minds");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to sign in.");
      setSubmitting(false);
    }
  }

  return (
    <main className="page-frame flex min-h-dvh items-center py-12">
      <form onSubmit={submit} className="mx-auto w-full max-w-sm">
        <p className="ui-label">Private research library</p>
        <h1 className="mt-3 text-3xl font-bold">Sign in</h1>
        <label className="mt-8 block font-sans text-sm" htmlFor="passphrase">
          Admin passphrase
        </label>
        <input
          id="passphrase"
          name="passphrase"
          type="password"
          autoComplete="current-password"
          autoFocus
          required
          className="library-search mt-2 w-full appearance-none bg-transparent py-3 font-sans text-base text-ink"
        />
        {error ? <p className="mt-3 font-sans text-sm text-danger">{error}</p> : null}
        <button
          type="submit"
          disabled={submitting}
          className="mt-6 bg-ink px-5 py-3 font-sans text-sm text-bg disabled:opacity-50"
        >
          {submitting ? "Signing in…" : "Continue"}
        </button>
      </form>
    </main>
  );
}
