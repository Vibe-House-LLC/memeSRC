import React from 'react';
import { getSearchResults } from '@/app/api/getSearchResults';
import PaginatedResults from './PaginatedResults';
import SearchForm from '@/app/components/SearchForm';
import { getSearchIndexes } from '@/app/SearchPage';
import Background from '@/app/components/Background';
import { Metadata } from 'next';

// Update the V2ContentMetadata interface
interface V2ContentMetadata {
  colorMain: string;
  colorSecondary?: string;
  title: string;
  emoji: string;
  frameCount?: number;
}

export default async function ResultsPage({ params }: { params: { indexId: string; searchTerms: string } }) {
  const searchTerm = decodeURIComponent(params.searchTerms || '');
  const indexId = params.indexId || '_universal';

  // Fetch search results
  const { results } = await getSearchResults(searchTerm, indexId);

  // Fetch search indexes
  const searchIndexes = await getSearchIndexes();

  // Update the universalIndex object
  const universalIndex = {
    id: '_universal',
    v2ContentMetadata: {
      colorMain: '#FFFFFF',
      colorSecondary: '#000000', // Provide a default value or any color you prefer
      title: 'All Shows & Movies',
      emoji: '🌈',
      frameCount: 0,
    },
  };

  // Combine the indexes
  const allIndexes = [universalIndex, ...searchIndexes];
  const selectedIndex: {
    id: string;
    v2ContentMetadata: V2ContentMetadata;
  } = allIndexes.find((index) => index.id === indexId) || universalIndex;

  const mainColor =
    selectedIndex.id === '_universal'
      ? null
      : selectedIndex.v2ContentMetadata.colorMain;

  const secondaryColor = selectedIndex.v2ContentMetadata.colorSecondary;

  return (
    <div className="min-h-screen relative overflow-hidden pt-16 pb-16">
      {/* Background Component */}
      <Background mainColor={mainColor} />

      <div className="relative z-10">
        <div className="container mx-auto px-4">
          {/* Search Form */}
          <div className="mb-6 flex justify-center">
            <SearchForm
              indexId={indexId}
              searchIndexes={allIndexes}
              initialSearchTerm={searchTerm}
              size='large'
            />
          </div>

          {/* Apply text color directly to elements that need it */}
          <h1
            className={`text-base mb-6 ${
              selectedIndex.id === '_universal' ? 'text-black dark:text-white' : ''
            }`}
            style={selectedIndex.id !== '_universal' ? { color: secondaryColor } : undefined}
          >
            "<strong>{searchTerm}</strong>" in&nbsp;
            <a
              href={`/${selectedIndex.id}`}
              className={`font-bold underline ${
                selectedIndex.id === '_universal' ? 'text-black dark:text-white' : ''
              }`}
              style={selectedIndex.id !== '_universal' ? { color: secondaryColor } : undefined}
            >
              {selectedIndex.v2ContentMetadata.title}
            </a>
          </h1>

          <PaginatedResults initialResults={results} />
        </div>
      </div>
    </div>
  );
}

export async function generateMetadata(
  { searchParams }: { searchParams: { q?: string; index?: string } }
): Promise<Metadata> {
  const searchTerm = searchParams.q || '';
  const indexId = searchParams.index || '_universal';

  const searchIndexes = await getSearchIndexes();
  const universalIndex = {
    id: '_universal',
    v2ContentMetadata: {
      title: 'All Shows & Movies',
      // Ensure consistency by removing colorSecondary here as well
    },
  };

  const allIndexes = [universalIndex, ...searchIndexes];
  const selectedIndex = allIndexes.find((index) => index.id === indexId) || universalIndex;

  const indexTitle = selectedIndex.v2ContentMetadata.title;

  return {
    title: `${searchTerm} in ${indexTitle} • memeSRC`,
    description: `Search results for "${searchTerm}" in ${indexTitle}`,
  };
}
