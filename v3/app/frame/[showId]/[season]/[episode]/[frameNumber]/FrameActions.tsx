'use client';

import React from 'react';
import Link from 'next/link';
import { Copy, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FrameActionsProps {
  showId: string;
  frameImageUrl: string;
}

export default function FrameActions({ showId, frameImageUrl }: FrameActionsProps) {
  const handleCopyUrl = () => {
    navigator.clipboard.writeText(frameImageUrl);
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-3">Actions</h3>
      <div className="space-y-2">
        <Link href={`/${showId}/search/`} className="block">
          <Button variant="outline" className="w-full bg-transparent border-gray-600 text-white hover:bg-gray-700">
            Search Show
          </Button>
        </Link>
        
        <button 
          onClick={handleCopyUrl}
          className="w-full p-2 text-left text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded flex items-center gap-2"
        >
          <Copy className="w-4 h-4" />
          Copy Image URL
        </button>
        
        <a 
          href={frameImageUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="w-full p-2 text-left text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded flex items-center gap-2"
        >
          <ExternalLink className="w-4 h-4" />
          Open Image
        </a>
      </div>
    </div>
  );
} 