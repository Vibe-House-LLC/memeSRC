"use client"

import React, { useState } from 'react';
import { Gamepad2 } from 'lucide-react';
import { Button } from '@/components/ui/Buttons';
import TextField from '@/components/ui/TextField';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signUp } from 'aws-amplify/auth';

const SignUpForm = () => {
  const [formState, setFormState] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState<string>('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const dest = searchParams.get('dest');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormState({ ...formState, [e.target.name]: e.target.value });
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    try {
      const { isSignUpComplete, nextStep } = await signUp({
        username: formState.email,
        password: formState.password,
        options: {
          userAttributes: {
            email: formState.email,
            given_name: formState.firstName,
            family_name: formState.lastName,
          },
          autoSignIn: {
            enabled: true
          }
        },
      });

      if (nextStep.signUpStep === 'CONFIRM_SIGN_UP') {
        router.push(`/verify?email=${encodeURIComponent(formState.email)}${dest ? `&dest=${dest}` : ''}`);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred');
      }
    }
  };

  return (
    <div className="max-w-xl w-full mx-auto bg-gray-900 p-8 rounded-lg shadow-lg">
      <div className="flex flex-col items-center mb-8">
        <div className="bg-purple-600 p-4 rounded-full mb-6">
          <Gamepad2 className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-white text-center mb-2">Join memeSRC!</h2>
        <Link href={`/signin${dest ? `?dest=${dest}` : ''}`}>
          <p className="text-sm text-gray-400 text-center">
            Already have an account? <span className="text-purple-500 hover:underline">Sign in</span>
          </p>
        </Link>
      </div>
      <form className="space-y-6" onSubmit={handleSignUp}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <TextField
              label="First name"
              id="firstName"
              name="firstName"
              type="text"
              required
              placeholder="First name"
              value={formState.firstName}
              onChange={handleInputChange}
            />
            <TextField
              label="Last name"
              id="lastName"
              name="lastName"
              type="text"
              required
              placeholder="Last name"
              value={formState.lastName}
              onChange={handleInputChange}
            />
          </div>
          <TextField
            label="Email address"
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="Email address"
            value={formState.email}
            onChange={handleInputChange}
          />
          <TextField
            label="Password"
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            placeholder="Password (6+ characters)"
            value={formState.password}
            onChange={handleInputChange}
          />
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <Button type="submit" className="w-full text-lg py-4">
          Create account
        </Button>
      </form>
      <p className="mt-6 text-sm text-gray-400 text-center">
        By signing up, I agree to <Link href="#" className="text-purple-500 hover:underline">Terms of service</Link> and <Link href="#" className="text-purple-500 hover:underline">Privacy policy</Link>.
      </p>
    </div>
  );
};

export default SignUpForm;
