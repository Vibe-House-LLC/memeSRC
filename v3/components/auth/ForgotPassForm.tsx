'use client'

import React, { useState } from 'react';
import { Gamepad2, ArrowLeft, Mail, Lock } from 'lucide-react';
import { Button } from '@/components/ui/Buttons';
import TextField from '@/components/ui/TextField';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { resetPassword, confirmResetPassword, ResetPasswordOutput } from 'aws-amplify/auth';

const ForgotPassForm = () => {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'REQUEST' | 'CONFIRM'>('REQUEST');
  const [resetPasswordOutput, setResetPasswordOutput] = useState<ResetPasswordOutput | null>(null);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const dest = searchParams.get('dest');

  const handleRequestReset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const output = await resetPassword({ username: email });
      setResetPasswordOutput(output);
      
      if (output.nextStep.resetPasswordStep === 'CONFIRM_RESET_PASSWORD_WITH_CODE') {
        setStep('CONFIRM');
      } else if (output.nextStep.resetPasswordStep === 'DONE') {
        // This case is unlikely in most configurations, but we'll handle it just in case
        setError('Password reset completed. Please sign in with your new password.');
        setTimeout(() => router.push(`/signin${dest ? `?dest=${dest}` : ''}`), 3000);
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmReset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    try {
      await confirmResetPassword({
        username: email,
        confirmationCode: code,
        newPassword: newPassword,
      });
      // Redirect to sign in page after successful password reset
      router.push(`/signin${dest ? `?dest=${dest}` : ''}`);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md w-full mx-auto bg-gray-900 p-8 rounded-lg shadow-lg">
      <div className="flex flex-col items-center mb-8">
        <div className="bg-purple-600 p-4 rounded-full mb-6">
          <Gamepad2 className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-white text-center mb-2">
          {step === 'REQUEST' ? 'Forgot Password' : 'Reset Password'}
        </h2>
        <p className="text-sm text-gray-400 text-center">
          {step === 'REQUEST' 
            ? 'Enter your email address for instructions to reset your password.'
            : 'Enter the code from your email and your new password.'}
        </p>
      </div>
      
      {step === 'REQUEST' ? (
        <form className="space-y-6" onSubmit={handleRequestReset}>
          <TextField
            label="Email address"
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button type="submit" className="w-full text-lg py-4" disabled={isLoading}>
            <Mail className="mr-2 h-5 w-5" />
            {isLoading ? 'Sending...' : 'Send Reset Instructions'}
          </Button>
        </form>
      ) : (
        <form className="space-y-6" onSubmit={handleConfirmReset}>
          <TextField
            label="Confirmation Code"
            id="code"
            name="code"
            type="text"
            required
            placeholder="Enter the code from your email"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <TextField
            label="New Password"
            id="newPassword"
            name="newPassword"
            type="password"
            required
            placeholder="Enter your new password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <TextField
            label="Confirm New Password"
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            placeholder="Confirm your new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button type="submit" className="w-full text-lg py-4" disabled={isLoading}>
            <Lock className="mr-2 h-5 w-5" />
            {isLoading ? 'Resetting...' : 'Reset Password'}
          </Button>
        </form>
      )}
      
      <div className="mt-6 flex justify-center">
        <Link href={`/signin${dest ? `?dest=${dest}` : ''}`} className="flex items-center text-sm text-purple-500 hover:underline">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Sign In
        </Link>
      </div>
    </div>
  );
};

export default ForgotPassForm;
