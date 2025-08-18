import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getSearchIndexes } from '@/app/SearchPage';
import { Metadata } from 'next';
import FrameActions from './FrameActions';
import FavoritesStar from '@/components/FavoritesStar';

interface FramePageProps {
  params: {
    showId: string;
    season: string;
    episode: string;
    frameNumber: string;
  };
}

interface V2ContentMetadata {
  colorMain: string;
  colorSecondary?: string;
  title: string;
  emoji: string;
  description?: string;
  frameCount?: number;
}

export async function generateMetadata({ params }: FramePageProps): Promise<Metadata> {
  const { showId, season, episode, frameNumber } = params;
  
  try {
    const searchIndexes = await getSearchIndexes();
    const showData = searchIndexes.find((index) => index.id === showId);
    const showTitle = showData?.v2ContentMetadata?.title || showId;
    
    return {
      title: `${showTitle} - S${season} E${episode} Frame ${frameNumber} | memeSRC`,
      description: `View frame ${frameNumber} from ${showTitle} Season ${season}, Episode ${episode}`,
    };
  } catch (error) {
    return {
      title: `Frame ${frameNumber} | memeSRC`,
      description: `View frame from Season ${season}, Episode ${episode}`,
    };
  }
}

export default async function FramePage({ params }: FramePageProps) {
  const { showId, season, episode, frameNumber } = params;
  
  // Validate and parse frame number
  const parsedFrameNumber = parseInt(frameNumber, 10);
  const isValidFrameNumber = !isNaN(parsedFrameNumber) && parsedFrameNumber > 0;
  const currentFrame = isValidFrameNumber ? parsedFrameNumber : 1;
  
  // Fetch search indexes to get show metadata
  const searchIndexes = await getSearchIndexes();
  const showData = searchIndexes.find((index) => index.id === showId);
  
  // Default values if show data is not found
  const defaultMetadata: V2ContentMetadata = {
    colorMain: '#6366f1',
    colorSecondary: '#f8fafc',
    title: showId,
    emoji: '📺',
    description: 'Unknown Show',
    frameCount: 0,
  };
  
  const metadata = showData?.v2ContentMetadata || defaultMetadata;
  const frameImageUrl = `https://v2-beta.memesrc.com/frame/${showId}/${season}/${episode}/${currentFrame}`;
  
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-6">
        {/* Header with navigation */}
        <div className="flex items-center justify-between mb-6">
          <Link 
            href={`/${showId}`}
            className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to {metadata.title}</span>
          </Link>
          
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span>{metadata.emoji}</span>
            <span>{metadata.title}</span>
            <FavoritesStar
              showId={showId}
              showTitle={metadata.title}
              showEmoji={metadata.emoji}
              size="small"
              className="ml-1"
            />
            <span>•</span>
            <span>S{season} E{episode}</span>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Frame Display */}
          <div className="lg:col-span-3">
            <div className="bg-gray-800 rounded-lg overflow-hidden">
              <div className="relative aspect-video bg-black">
                <Image
                  src={frameImageUrl}
                  alt={`Frame ${currentFrame} from ${metadata.title}`}
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </div>

            {/* Frame Navigation */}
            <div className="flex items-center justify-between mt-4">
              <Link 
                href={`/frame/${showId}/${season}/${episode}/${Math.max(1, currentFrame - 1)}`}
                className={currentFrame <= 1 ? 'pointer-events-none opacity-50' : ''}
              >
                <Button 
                  variant="outline" 
                  disabled={currentFrame <= 1}
                  className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Previous
                </Button>
              </Link>
              
              <div className="text-center">
                <div className="text-sm text-gray-400">Frame</div>
                <div className="text-lg font-mono">{currentFrame}</div>
              </div>
              
              <Link href={`/frame/${showId}/${season}/${episode}/${currentFrame + 1}`}>
                <Button 
                  variant="outline"
                  className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
                >
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Frame Info */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3">Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Show:</span>
                  <span>{metadata.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Season:</span>
                  <span>{season}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Episode:</span>
                  <span>{episode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Frame:</span>
                  <span>{currentFrame}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <FrameActions showId={showId} frameImageUrl={frameImageUrl} />
          </div>
        </div>
      </div>
    </div>
  );
} 