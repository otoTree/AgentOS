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

export default function RegisterPage({ onNavigate }: { onNavigate: (page: 'login' | 'register') => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((state) => state.login);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await apiClient.authRegister({ name, email, password });
      login(data.user, data.token);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-white p-4">
      <Card className="w-full max-w-sm border-black/[0.06] shadow-[0_2px_8px_rgba(0,0,0,0.04)] bg-white">
        <CardHeader className="space-y-1 pb-6 pt-8">
          <CardTitle className="text-2xl font-light text-center tracking-tight text-black">Create an account</CardTitle>
          <CardDescription className="text-center text-black/50 text-sm">
            Enter your details to create your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-black/70 text-xs uppercase tracking-wider font-medium">Full Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                required
                className="bg-transparent border-black/10 focus-visible:ring-black/5 placeholder:text-black/20 h-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-black/70 text-xs uppercase tracking-wider font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                required
                className="bg-transparent border-black/10 focus-visible:ring-black/5 placeholder:text-black/20 h-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-black/70 text-xs uppercase tracking-wider font-medium">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Create a password"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                required
                className="bg-transparent border-black/10 focus-visible:ring-black/5 placeholder:text-black/20 h-10"
              />
            </div>
            {error && <div className="text-sm text-red-500">{error}</div>}
            <Button className="w-full bg-black hover:bg-black/80 text-white h-10 font-normal tracking-wide transition-opacity" type="submit" disabled={loading}>
              {loading ? 'Creating account...' : 'Create account'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center pb-8">
          <p className="text-sm text-black/40">
            Already have an account?{' '}
            <button
              onClick={() => onNavigate('login')}
              className="font-medium text-black underline-offset-4 hover:underline transition-all"
            >
              Sign in
            </button>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
