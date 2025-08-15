import MemeSRCLogo from '@/components/MemeSRCLogo';
import SearchForm from './components/SearchForm'
import RainbowBackground from './components/RainbowBackground'
import ErrorPage404 from './components/ErrorPage404'
import FavoritesStar from '@/components/FavoritesStar';

interface SearchIndex {
  id: string;
  v2ContentMetadata: {
    colorMain: string;
    colorSecondary: string;
    title: string;
    emoji: string;
    frameCount?: number;
  };
}

interface SearchPageProps {
  indexId: string;
}

export async function getSearchIndexes(): Promise<SearchIndex[]> {
  const API_BASE_URL = process.env.NODE_ENV === 'production'
    ? 'https://main.d27o29hxxdagr.amplifyapp.com'
    : 'https://localhost:3000';

  const response = await fetch(`${API_BASE_URL}/api/search-indexes`, {
    next: { revalidate: 120 } // Revalidate every 120 seconds (2 minutes)
  });

  if (!response.ok) {
    throw new Error('Failed to fetch search indexes');
  }

  return response.json();
}

async function checkIndexValidity(indexId: string, indexes: SearchIndex[]): Promise<boolean> {
  return indexes.some(index => index.id === indexId) || indexId === '_universal';
}

export default async function SearchPage({ indexId }: SearchPageProps) {
  const searchIndexes = await getSearchIndexes()
  const isValidIndex = await checkIndexValidity(indexId, searchIndexes)

  if (!isValidIndex) {
    return <ErrorPage404 />;
  }

  const universalIndex = {
    id: '_universal',
    v2ContentMetadata: {
      colorMain: '#FFFFFF',
      colorSecondary: '#FFFFFF',
      title: 'All Shows & Movies',
      emoji: '🌈',
      frameCount: 0, // Add frameCount with initial value 0
    },
  }

  const allIndexes = [universalIndex, ...searchIndexes]
  const selectedIndex = allIndexes.find(index => index.id === indexId) || universalIndex

  const mainColor = selectedIndex.id === '_universal' ? null : selectedIndex.v2ContentMetadata.colorMain
  const secondaryColor = selectedIndex.v2ContentMetadata.colorSecondary
  const pageTitle = selectedIndex.id === '_universal' ? 'memeSRC' : selectedIndex.v2ContentMetadata.title

  // Calculate total frame count for universal search
  const totalFrameCount = searchIndexes.reduce((total, index) => total + (index.v2ContentMetadata.frameCount || 0), 0)

  // Update universalIndex frameCount
  universalIndex.v2ContentMetadata.frameCount = totalFrameCount

  // Determine the search text based on the selected index
  let searchText = ''
  if (selectedIndex.id === '_universal') {
    searchText = `Search ${totalFrameCount.toLocaleString()}+ templates`
  } else {
    const frameCount = selectedIndex.v2ContentMetadata.frameCount || 0
    searchText = `Search ${frameCount.toLocaleString()} meme templates from ${pageTitle}`
  }

  return (
    <div className="min-h-[100dvh] relative overflow-hidden flex flex-col items-center justify-between p-4">
      {mainColor ? (
        <div className="absolute inset-0" style={{ backgroundColor: mainColor }} />
      ) : (
        <RainbowBackground />
      )}

      <div className="relative z-10 w-full max-w-3xl flex flex-col items-center flex-grow justify-center">
        <div className="flex flex-col items-center mb-4 sm:mb-6">
          <div className="w-[160px] h-[64px] relative mb-2 flex justify-center items-center">
            <MemeSRCLogo color={secondaryColor} />
          </div>
          <div className="flex items-center gap-3">
            <h1 
              className="text-3xl sm:text-4xl font-bold drop-shadow-sm text-center"
              style={{ color: secondaryColor }}
            >
              {pageTitle}
            </h1>
            {selectedIndex.id !== '_universal' && (
              <FavoritesStar
                showId={selectedIndex.id}
                showTitle={selectedIndex.v2ContentMetadata.title}
                showEmoji={selectedIndex.v2ContentMetadata.emoji}
                size="medium"
              />
            )}
          </div>
        </div>

        <SearchForm indexId={indexId} searchIndexes={allIndexes} size="large" />
        <p 
          className="text-center mt-3 mb-4 sm:mb-6 text-lg font-bold"
          style={{ color: secondaryColor }}
        >
          {searchText}
        </p>
      </div>
    </div>
  )
}
