"use client"

import React, { useState } from 'react';
import { Gamepad2 } from 'lucide-react';
import { Button } from '@/components/ui/Buttons';
import TextField from '@/components/ui/TextField';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { signIn } from 'aws-amplify/auth';

const SignInForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const searchParams = useSearchParams();
  const dest = searchParams.get('dest');

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const { isSignedIn } = await signIn({ username: email, password });
      if (isSignedIn) {
        window.location.reload();
      }
    } catch (err) {
      setError('Failed to sign in. Please check your credentials and try again.');
      console.error('Sign-in error:', err);
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-xl w-full mx-auto bg-gray-900 p-8 rounded-lg shadow-lg">
      <div className="flex flex-col items-center mb-8">
        <div className="bg-purple-600 p-4 rounded-full mb-6">
          <Gamepad2 className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-white text-center mb-2">Welcome back!</h2>
        <Link href={`/signup${dest ? `?dest=${dest}` : ''}`}>
          <p className="text-sm text-gray-400 text-center">
            New to memeSRC? <span className="text-purple-500 hover:underline">Create an account</span>
          </p>
        </Link>
      </div>
      <form className="space-y-6" onSubmit={handleSignIn}>
        <div className="space-y-4">
          <TextField
            label="Email address"
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <TextField
            label="Password"
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <Button type="submit" className="w-full text-lg py-4" disabled={isLoading}>
          {isLoading ? 'Signing in...' : 'Sign in'}
        </Button>
      </form>
      <div className="mt-6 text-center">
        <Link href={`/forgot${dest ? `?dest=${dest}` : ''}`} className="text-sm text-purple-500 hover:underline">
          Forgot your password?
        </Link>
      </div>
    </div>
  );
};

export default SignInForm;
