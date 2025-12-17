"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
    <div className="w-full transition-all duration-500">
      
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <AnimatePresence mode="wait">
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-3 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg text-center"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-xs font-medium text-black/60 uppercase tracking-wider">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="name@example.com"
              required
              disabled={isLoading}
              className="h-11 bg-white border-black/10 focus-visible:ring-black/20"
            />
          </div>
          
          <div className="space-y-2">
             <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-medium text-black/60 uppercase tracking-wider">Password</Label>
                {isLogin && (
                  <button type="button" className="text-xs text-black/40 hover:text-black transition-colors">
                    Forgot?
                  </button>
                )}
             </div>
            <Input
              id="password"
              name="password"
              type="password"
              required
              disabled={isLoading}
              className="h-11 bg-white border-black/10 focus-visible:ring-black/20"
            />
          </div>

          <AnimatePresence>
            {!isLogin && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2 overflow-hidden"
              >
                <Label htmlFor="confirmPassword" className="text-xs font-medium text-black/60 uppercase tracking-wider">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required={!isLogin}
                  disabled={isLoading}
                  className="h-11 bg-white border-black/10 focus-visible:ring-black/20"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <Button 
          type="submit" 
          disabled={isLoading} 
          className="h-12 w-full mt-2 text-sm font-medium tracking-wide shadow-lg shadow-black/5 hover:shadow-black/10 transition-all"
        >
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : isLogin ? (
            "Sign In"
          ) : (
            "Create Account"
          )}
        </Button>
      </form>

      <div className="mt-8 text-center">
        <button
          type="button"
          onClick={() => {
            setIsLogin(!isLogin);
            setError(null);
          }}
          className="text-sm text-black/50 hover:text-black transition-colors"
        >
          {isLogin ? (
            <>
              New to AgentOS? <span className="font-medium text-black underline underline-offset-4">Create account</span>
            </>
          ) : (
            <>
              Already have an account? <span className="font-medium text-black underline underline-offset-4">Sign in</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
