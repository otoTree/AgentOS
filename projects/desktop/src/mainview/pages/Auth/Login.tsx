import React, { useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { apiClient } from '../../../bun/api';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card';

export default function LoginPage({ onNavigate }: { onNavigate: (page: 'login' | 'register') => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((state) => state.login);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await apiClient.authLogin({ username, password });
      login(data.user, data.token);
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-white p-4">
      <Card className="w-full max-w-sm border-black/[0.06] shadow-[0_2px_8px_rgba(0,0,0,0.04)] bg-white">
        <CardHeader className="space-y-1 pb-6 pt-8">
          <CardTitle className="text-2xl font-light text-center tracking-tight text-black">Sign in</CardTitle>
          <CardDescription className="text-center text-black/50 text-sm">
            Enter your credentials to access AgentOS
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-black/70 text-xs uppercase tracking-wider font-medium">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
                required
                className="bg-transparent border-black/10 focus-visible:ring-black/5 placeholder:text-black/20 h-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-black/70 text-xs uppercase tracking-wider font-medium">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                required
                className="bg-transparent border-black/10 focus-visible:ring-black/5 placeholder:text-black/20 h-10"
              />
            </div>
            {error && <div className="text-sm text-red-500">{error}</div>}
            <Button className="w-full bg-black hover:bg-black/80 text-white h-10 font-normal tracking-wide transition-opacity" type="submit" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center pb-8">
          <p className="text-sm text-black/40">
            Don't have an account?{' '}
            <button
              onClick={() => onNavigate('register')}
              className="font-medium text-black underline-offset-4 hover:underline transition-all"
            >
              Register
            </button>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
