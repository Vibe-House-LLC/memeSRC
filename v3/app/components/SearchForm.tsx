"use client"

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { DropdownSearchable } from '@/components/ui/dropdown-searchable'
import { Search, X, Loader2 } from 'lucide-react'
import { useFavorites } from '@/contexts/FavoritesContext'

interface SearchIndex {
  id: string;
  v2ContentMetadata: {
    colorMain: string;
    colorSecondary: string;
    title: string;
    emoji: string;
  };
}

interface SearchFormProps {
  indexId: string;
  searchIndexes: SearchIndex[];
  initialSearchTerm?: string;
  size?: 'small' | 'large';
}

export default function SearchForm({
  indexId,
  searchIndexes,
  initialSearchTerm = '',
  size = 'small',
}: SearchFormProps) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState<string>(initialSearchTerm)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [inputFocused, setInputFocused] = useState(false)
  const { favorites, isLoaded } = useFavorites();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    const encodedSearchTerm = encodeURIComponent(searchTerm)
    const url = `/${indexId}/search/${encodedSearchTerm}`
    router.push(url)
  }

  const handleSeriesChange = (newIndexId: string) => {
    if (searchTerm) {
      setIsLoading(true)
      const encodedSearchTerm = encodeURIComponent(searchTerm)
      const url = `/${newIndexId}/search/${encodedSearchTerm}`
      router.push(url)
    } else {
      router.push(`/${newIndexId}`);
    }
  }

  const handleClearSearch = () => {
    setSearchTerm('')
  }

  // Create options with favorites grouped at the top
  const createOptions = () => {
    const allOptions = searchIndexes.map(index => ({
      value: index.id,
      label: `${index.v2ContentMetadata.emoji} ${index.v2ContentMetadata.title}`,
      metadata: {
        title: index.v2ContentMetadata.title,
        emoji: index.v2ContentMetadata.emoji,
      },
    }));

    // If favorites aren't loaded yet or there are no favorites, return ungrouped options
    if (!isLoaded || favorites.length === 0) {
      return allOptions;
    }

    // Separate universal option and other options
    const universalOption = allOptions.find(option => option.value === '_universal');
    const otherOptions = allOptions.filter(option => option.value !== '_universal');

    // Get favorited options (excluding universal)
    const favoriteIds = new Set(favorites.map(fav => fav.id));
    const favoriteOptions = otherOptions.filter(option => 
      favoriteIds.has(option.value)
    );
    const nonFavoriteOptions = otherOptions.filter(option => 
      !favoriteIds.has(option.value)
    );

    // If no actual favorites found, return ungrouped
    if (favoriteOptions.length === 0) {
      return allOptions;
    }

    // Return structure with universal at top, then grouped favorites and remaining shows
    const result = [];
    
    // Add universal option in its own group at the top
    if (universalOption) {
      result.push({
        label: "Browse All",
        options: [universalOption],
      });
    }
    
    // Add favorites group
    result.push({
      label: "⭐ Favorites",
      options: favoriteOptions,
    });
    
    // Add remaining shows group
    result.push({
      label: "All Shows",
      options: nonFavoriteOptions,
    });

    return result;
  };

  const options = createOptions();

  // Updated gap classes:
  // - `gap-6` for stacking (small screens)
  // - `sm:gap-2` for side-by-side (larger screens)
  const formClasses = "flex flex-col sm:flex-row w-full max-w-5xl mx-auto gap-1"

  const dropdownClasses = "w-full sm:w-[32%]"

  const inputClasses = `w-full pr-20 text-base h-12 ${size === 'large' ? 'text-lg' : 'text-base'}`

  const buttonClasses = "absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-200"

  const clearButtonClasses = "absolute inset-y-0 right-8 flex items-center pr-2 text-gray-400 hover:text-gray-200"

  const iconSize = size === 'large' ? 24 : 20
  const clearIconSize = size === 'large' ? 4 : 2 

  return (
    <form onSubmit={handleSubmit} className={formClasses}>
      <div className={dropdownClasses}>
        <DropdownSearchable
          value={indexId}
          onChange={handleSeriesChange}
          options={options}
          placeholder="Select a series"
          size={size}
        />
      </div>
      <div className="relative flex flex-1">
        <Input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search for a quote..."
          className={inputClasses}
          onFocus={() => setInputFocused(true)}
          onBlur={() => setInputFocused(false)}
        />
        {searchTerm && (
          <button
            type="button"
            onClick={handleClearSearch}
            className={`${clearButtonClasses} absolute right-[3.25rem] top-1/2 transform -translate-y-1/2`}
          >
            <X className={`h-${clearIconSize} w-${clearIconSize}`} />
          </button>
        )}
        <button
          type="submit"
          className={`${buttonClasses} ${
            inputFocused
              ? 'bg-gray-900 rounded-r-lg rounded-l-none pl-3'
              : ''
          }`}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className={`h-${iconSize} w-${iconSize} animate-spin`} />
          ) : (
            <Search className={`h-${iconSize} w-${iconSize}`} />
          )}
        </button>
      </div>
    </form>
  )
}
