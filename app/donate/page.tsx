import Link from 'next/link';
import Image from 'next/image';

export default function DonatePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-red-900 to-yellow-900">
      <div className="bg-gray-800 bg-opacity-80 p-8 rounded-3xl shadow-2xl max-w-md w-full text-center">
        <div className="mb-6">
          <Image
            src="https://v1.memesrc.com/vh_logo_white.png"
            alt="Vibe House Logo"
            width={100}
            height={100}
            className="mx-auto"
          />
        </div>
        
        <h1 className="text-white text-3xl font-bold mb-4">
          Help support memeSRC
        </h1>
        
        <p className="text-gray-300 mb-6">
          Your support keeps memeSRC alive and thriving. Thank you!
        </p>
        
        <Link href="https://memesrc.com/donate" target="_blank" passHref>
          <button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-full text-lg mb-6 transition duration-300 ease-in-out transform hover:scale-105">
            Donate Now
          </button>
        </Link>
        
        <div className="text-gray-400 text-sm">
          Powered by Vibe House
        </div>
      </div>
    </div>
  );
}