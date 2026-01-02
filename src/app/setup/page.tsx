"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SetupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [checkingSetup, setCheckingSetup] = useState(true);

  // Check if setup is needed
  useEffect(() => {
    async function checkSetup() {
      try {
        const res = await fetch("/api/auth/setup");
        const data = await res.json();
        if (!data.setupRequired) {
          // Setup already complete, redirect to login
          router.replace("/login");
        }
      } catch {
        // If check fails, allow setup attempt
      } finally {
        setCheckingSetup(false);
      }
    }
    checkSetup();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to create account");
        return;
      }

      // Redirect to login on success
      router.push("/login");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (checkingSetup) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-zinc-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="relative flex h-screen flex-col">
      {/* Navbar - logo only */}
      <header className="flex items-center px-6 py-4">
        <Link href="/" className="font-heading gradient-shift text-xl">
          Avenge-Studio
        </Link>
      </header>

      {/* Main content - vertically centered */}
      <main className="flex flex-1 items-center justify-center">
        <div className="w-full max-w-md px-4">
          {/* Title */}
          <div className="mb-8 flex w-full flex-col text-center">
            <h1 className="text-xl font-semibold text-white">
              Welcome to Avenge-Studio
            </h1>
            <p className="mt-2 text-sm text-zinc-400">
              Create your admin account to get started
            </p>
          </div>

          {/* Form */}
          <form noValidate onSubmit={handleSubmit} className="w-full">
            <fieldset
              disabled={isLoading}
              className="relative flex w-full flex-col gap-4 disabled:animate-pulse disabled:cursor-wait"
            >
              {/* Error message */}
              {error && (
                <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm font-medium text-red-400">
                  {error}
                </div>
              )}

              {/* Name input */}
              <div className="grid w-full">
                <input
                  className="h-[42px] w-full rounded-xl border border-white/10 bg-black/40 px-4 text-sm font-medium text-white transition placeholder:text-zinc-400 hover:border-white/30 focus:border-pink-400/50 focus:bg-black/60 focus:outline-none backdrop-blur-sm"
                  placeholder="Name (optional)"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  name="name"
                  autoComplete="name"
                />
              </div>

              {/* Email input */}
              <div className="grid w-full">
                <input
                  className="h-[42px] w-full rounded-xl border border-white/10 bg-black/40 px-4 text-sm font-medium text-white transition placeholder:text-zinc-400 hover:border-white/30 focus:border-pink-400/50 focus:bg-black/60 focus:outline-none backdrop-blur-sm"
                  placeholder="Email"
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  name="email"
                  autoComplete="email"
                />
              </div>

              {/* Password input */}
              <div className="grid w-full">
                <input
                  className="h-[42px] w-full rounded-xl border border-white/10 bg-black/40 px-4 text-sm font-medium text-white transition placeholder:text-zinc-400 hover:border-white/30 focus:border-pink-400/50 focus:bg-black/60 focus:outline-none backdrop-blur-sm"
                  placeholder="Password"
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  name="password"
                  autoComplete="new-password"
                />
                <p className="mt-2 text-xs text-zinc-500">
                  Min 8 characters with uppercase, lowercase, number & special character
                </p>
              </div>

              {/* Submit button */}
              <input
                className="inline-grid h-12 w-full max-w-full cursor-pointer content-center items-center justify-center overflow-hidden rounded-xl border border-transparent bg-[#e8e8e8] text-sm font-medium text-ellipsis whitespace-nowrap text-[#131313] ring-transparent transition hover:bg-[#d4d4d4] focus:outline-none focus-visible:ring-2 disabled:cursor-wait disabled:bg-zinc-700 disabled:text-zinc-400"
                type="submit"
                value={isLoading ? "Creating account..." : "Create Account"}
              />
            </fieldset>
          </form>

          {/* Back link */}
          <div className="mt-4 text-center">
            <Link
              className="text-sm font-medium text-zinc-300 transition hover:brightness-75"
              href="/"
            >
              ← Back to home
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
