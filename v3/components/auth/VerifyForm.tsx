'use client'

import React, { useState, useRef, useCallback, ChangeEvent, ClipboardEvent, FormEvent, KeyboardEvent, useEffect } from 'react';
import { ArrowLeft, Fingerprint, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/Buttons';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { confirmSignUp, resendSignUpCode, autoSignIn } from 'aws-amplify/auth';
import TextField from '@/components/ui/TextField';

const VerifyForm = () => {
  const [verificationCode, setVerificationCode] = useState<string[]>(Array(6).fill(''));
  const [email, setEmail] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const router = useRouter();
  const searchParams = useSearchParams();
  const dest = searchParams.get('dest');

  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [searchParams]);

  const setInputRef = useCallback((index: number) => (el: HTMLInputElement | null) => {
    inputRefs.current[index] = el;
  }, []);

  const handleChange = (index: number) => (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 1) {
      const newCode = [...verificationCode];
      newCode[index] = value;
      setVerificationCode(newCode);
      if (value.length === 1 && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyDown = (index: number) => (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newCode = [...verificationCode];
    for (let i = 0; i < 6; i++) {
      newCode[i] = pastedText[i] || '';
    }
    setVerificationCode(newCode);
    inputRefs.current[pastedText.length < 6 ? pastedText.length : 5]?.focus();
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    const code = verificationCode.join('');
    
    try {
      const { isSignUpComplete } = await confirmSignUp({
        username: email,
        confirmationCode: code,
      });
      if (isSignUpComplete) {
        try {
          await autoSignIn();
          if (dest) {
            router.push(decodeURIComponent(dest));
          } else {
            router.push('/account');
          }
        } catch (autoSignInError) {
          console.error('Auto sign-in failed:', autoSignInError);
          router.push(`/signin${dest ? `?dest=${dest}` : ''}`);
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setError('');
    setIsLoading(true);
    try {
      await resendSignUpCode({ username: email });
      console.log('Verification code resent successfully');
      // You can add a success message here
    } catch (err: unknown) {
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
    <div className="max-w-md mx-auto bg-gray-900 p-8 rounded-lg shadow-lg">
      <div className="flex flex-col items-center mb-8">
        <div className="bg-purple-600 p-4 rounded-full mb-6">
          <ShieldCheck className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-white text-center mb-2">Verify Your Account</h2>
        <p className="text-sm text-gray-400 text-center">
          We emailed a code to <b>{email}</b>
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        {!searchParams.get('email') && (
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
        )}
        <div className="flex justify-between space-x-2">
          {verificationCode.map((digit, index) => (
            <input
              key={index}
              ref={setInputRef(index)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={handleChange(index)}
              onKeyDown={handleKeyDown(index)}
              onPaste={index === 0 ? handlePaste : undefined}
              className="w-12 h-12 text-center text-2xl bg-gray-800 border border-gray-700 rounded-md text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              required
              disabled={isLoading}
            />
          ))}
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <Button className="w-full text-lg py-3" type="submit" disabled={verificationCode.join('').length !== 6 || isLoading || !email}>
          <Fingerprint className='mr-2' />
          {isLoading ? 'Verifying...' : 'Verify Account'}
        </Button>
      </form>
      <div className="mt-6 flex justify-between items-center">
        <Link href={`/signin${dest ? `?dest=${dest}` : ''}`} className="flex items-center text-sm text-purple-500 hover:underline">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Sign In
        </Link>
        <button 
          className="text-sm text-purple-500 hover:underline"
          onClick={handleResendCode}
          disabled={isLoading || !email}
        >
          Resend Code
        </button>
      </div>
    </div>
  );
};

export default VerifyForm;
