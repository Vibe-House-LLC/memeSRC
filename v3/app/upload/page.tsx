// app/upload/page.tsx
'use client'

import { useState } from 'react';
import Link from 'next/link';

export default function UploadPage() {
  const [isRequesting, setIsRequesting] = useState(false);

  const handleRequestAccess = async () => {
    setIsRequesting(true);
    // Here you would typically send a request to your backend
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulating API call
    setIsRequesting(false);
    alert('Access requested! We\'ll be in touch soon.');
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full"> {/* Container for content */}
        <h1 className="text-4xl font-bold mb-4 text-center">Upload Something New</h1>
        
        <p className="text-lg text-center mb-8">
          We&apos;re testing new tools to make it easier for everyone to contribute new content.
        </p>
        
        <div className="flex justify-center mb-8">
          <button
            onClick={handleRequestAccess}
            disabled={isRequesting}
            className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg text-xl transition duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRequesting ? 'Requesting...' : 'Request Access'}
          </button>
        </div>
        
        <p className="text-center text-gray-400 text-sm">
          Don&apos;t forget you can also <Link href="/vote" className="underline hover:text-white">vote</Link> on requests,
          or <Link href="/donate" className="underline hover:text-white">donate</Link> to support <span className="font-semibold">memeSRC</span>&apos;s development.
        </p>
      </div>
    </div>
  );
}