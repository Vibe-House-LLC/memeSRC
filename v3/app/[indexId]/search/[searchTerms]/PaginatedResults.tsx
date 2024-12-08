'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { SearchResult } from '@/app/api/getSearchResults';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2 } from 'lucide-react';

interface PaginatedResultsProps {
  initialResults: SearchResult[];
}

export default function PaginatedResults({ initialResults }: PaginatedResultsProps) {
  const [visibleResults, setVisibleResults] = useState<SearchResult[]>(initialResults.slice(0, 12));
  const [page, setPage] = useState(1);
  const resultsPerPage = 12;
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set());

  const loadMore = () => {
    const nextPage = page + 1;
    const startIndex = (nextPage - 1) * resultsPerPage;
    const endIndex = startIndex + resultsPerPage;
    setVisibleResults([...visibleResults, ...initialResults.slice(startIndex, endIndex)]);
    setPage(nextPage);
  };

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {visibleResults.map((result: SearchResult, index: number) => (
          <div key={index} className="relative group">
            <Image
              src={`https://v2-beta.memesrc.com/frame/${result.cid}/${result.season}/${result.episode}/${result.start_frame}`}
              alt={`Frame from ${result.cid} S${result.season} E${result.episode}`}
              width={400}
              height={225}
              className="w-full h-auto object-cover rounded-lg shadow-lg"
              onLoad={() => setLoadedImages(prev => new Set(prev).add(index))}
            />
            {!loadedImages.has(index) && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Skeleton className="absolute inset-0 rounded-lg" />
                <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
              </div>
            )}
            {/* Subtitle overlay */}
            <div className="absolute bottom-0 w-full bg-black bg-opacity-60 text-white text-center py-2 px-4">
              <p className="text-sm">{result.subtitle_text}</p>
            </div>
            {/* Metadata */}
            <div className="absolute top-0 left-0 bg-black bg-opacity-60 text-white text-sm p-2 rounded-tr-lg rounded-bl-lg">
              <p className="font-semibold">{result.cid}</p>
              <p>
                Season {result.season}, Episode {result.episode}
              </p>
            </div>
          </div>
        ))}
      </div>
      {visibleResults.length < initialResults.length && (
        <div className="mt-8 text-center">
          <Button onClick={loadMore} variant="default">
            Load More
          </Button>
        </div>
      )}
    </>
  );
}
