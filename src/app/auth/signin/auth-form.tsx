"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function AuthForm() {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (!isLogin && password !== confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    try {
      if (isLogin) {
        const result = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });

        if (result?.error) {
          setError("Invalid email or password");
        } else {
          router.push("/agent");
          router.refresh();
        }
      } else {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Registration failed");
        } else {
          const result = await signIn("credentials", {
            email,
            password,
            redirect: false,
          });

          if (result?.error) {
            setError("Registration successful, but login failed. Please sign in manually.");
            setIsLogin(true);
          } else {
            router.push("/agent");
            router.refresh();
          }
        }
      }
    } catch (error) {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-card/50 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl w-full transition-all duration-500">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-white mb-2">
          {isLogin ? "Welcome Agent" : "Register Agent"}
        </h1>
        <p className="text-sm text-gray-400">
          {isLogin
            ? "Enter credentials to access AgentOS runtime."
            : "Create new agent identity in the system."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="space-y-2">
          <label
            htmlFor="email"
            className="text-xs font-medium uppercase tracking-wider text-gray-500 ml-1"
          >
            Email Address
          </label>
          <div className="relative group">
            <input
              id="email"
              name="email"
              type="email"
              placeholder="name@company.com"
              required
              disabled={isLoading}
              className="w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-sm text-white transition-all placeholder:text-gray-600 focus:border-white/20 focus:bg-black/60 focus:outline-none focus:ring-2 focus:ring-white/10 disabled:opacity-50"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="password"
            className="text-xs font-medium uppercase tracking-wider text-gray-500 ml-1"
          >
            Password
          </label>
          <div className="relative group">
            <input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              required
              disabled={isLoading}
              className="w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-sm text-white transition-all placeholder:text-gray-600 focus:border-white/20 focus:bg-black/60 focus:outline-none focus:ring-2 focus:ring-white/10 disabled:opacity-50"
            />
          </div>
        </div>

        {!isLogin && (
          <div className="space-y-2 animate-in fade-in slide-in-from-top-4 duration-300">
            <label
              htmlFor="confirmPassword"
              className="text-xs font-medium uppercase tracking-wider text-gray-500 ml-1"
            >
              Confirm Password
            </label>
            <div className="relative group">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="••••••••"
                required
                disabled={isLoading}
                className="w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-sm text-white transition-all placeholder:text-gray-600 focus:border-white/20 focus:bg-black/60 focus:outline-none focus:ring-2 focus:ring-white/10 disabled:opacity-50"
              />
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center animate-in fade-in zoom-in-95">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="mt-4 w-full rounded-lg bg-white text-black px-4 py-3 text-sm font-bold shadow-lg hover:bg-gray-200 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Authenticating...
            </span>
          ) : isLogin ? (
            "Initialize Session"
          ) : (
            "Register Identity"
          )}
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-white/5 text-center">
        <p className="text-sm text-gray-400">
          {isLogin ? "New to AgentOS?" : "Already have an identity?"}
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
            }}
            className="ml-2 font-semibold text-white hover:text-gray-300 transition-colors focus:outline-none focus:underline"
          >
            {isLogin ? "Request Access" : "Sign In"}
          </button>
        </p>
      </div>
    </div>
  );
}