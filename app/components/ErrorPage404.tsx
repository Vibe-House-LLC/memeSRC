import React from 'react';
import Link from 'next/link';

const ErrorPage404: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <h1 className="text-4xl font-bold mb-4">404 - Not Found</h1>
      <p className="text-xl mb-8">Sorry, we couldn&apos;t find what you were looking for.</p>
      <Link href="/_universal" className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">
        Go back home
      </Link>
    </div>
  );
};

export default ErrorPage404;
