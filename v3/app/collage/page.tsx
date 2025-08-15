// /app/collage/page.tsx
"use client"

import { useEffect, useState } from 'react';
import { Grid, Grid2X2, Grid3X3, Ruler, Palette } from 'lucide-react';
import CollageBuilder from './CollageBuilder';

export default function CollagePage() {
  const [isAuthorized, setIsAuthorized] = useState(true); // In real app, check user subscription
  
  // In a real implementation, this would check the user's subscription status
  useEffect(() => {
    // Example: Check user subscription from API or context
    // If using useContext for auth, you'd check here
  }, []);

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-black text-white p-8 mt-12 flex flex-col items-center justify-center">
        <h1 className="text-4xl font-bold mb-4">Collage Builder</h1>
        <div className="bg-gray-900 p-8 rounded-lg max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4">Premium Feature</h2>
          <p className="mb-6">Access to the Collage Builder requires a premium subscription.</p>
          <img src="/assets/images/products/collage-tool.png" alt="Collage Tool Preview" className="mb-6 rounded-lg mx-auto" />
          <button 
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-md font-semibold"
            onClick={() => {/* Open subscription dialog */}}
          >
            Upgrade Now
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8 mt-12">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Collage Builder</h1>
          <p className="text-gray-400">Upload images and create beautiful photo collages with customizable layouts</p>
        </header>
        
        <div className="grid grid-cols-1 gap-6 mb-8">
          <div className="bg-gray-900 p-4 rounded-lg">
            <div className="flex flex-wrap gap-2 mb-2">
              <div className="flex items-center bg-gray-800 px-3 py-1 rounded-full">
                <Grid2X2 size={16} className="mr-2" />
                <span>Multiple layouts</span>
              </div>
              <div className="flex items-center bg-gray-800 px-3 py-1 rounded-full">
                <Ruler size={16} className="mr-2" />
                <span>Customizable borders</span>
              </div>
              <div className="flex items-center bg-gray-800 px-3 py-1 rounded-full">
                <Palette size={16} className="mr-2" />
                <span>Custom colors</span>
              </div>
            </div>
          </div>
        </div>

        <CollageBuilder />
      </div>
    </div>
  );
}
