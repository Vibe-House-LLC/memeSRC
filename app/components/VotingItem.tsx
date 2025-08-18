// VotingItem.tsx
'use client';

import React, { useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import Image from 'next/image';

interface Movie {
  id: number;
  title: string;
  image: string;
  upvotes: number;
  downvotes: number;
  description: string;
}

interface VotingItemProps {
  movie: Movie;
  index: number;
}

const VotingItem: React.FC<VotingItemProps> = ({ movie, index }) => {
  const [upvotes, setUpvotes] = useState(movie.upvotes);
  const [downvotes, setDownvotes] = useState(movie.downvotes);

  const handleUpvote = () => setUpvotes(upvotes + 1);
  const handleDownvote = () => setDownvotes(downvotes + 1);

  const totalVotes = upvotes - downvotes;

  return (
    <div className="flex items-center space-x-4 p-4 bg-gray-800 rounded-lg text-white">
      <div className="text-gray-500 font-bold">#{index}</div>
      <Image 
        src={movie.image} 
        alt={movie.title} 
        width={48}
        height={64}
        className="object-cover rounded" 
      />
      <div className="flex-grow">
        <h3 className="text-lg font-bold">{movie.title}</h3>
        <p className="text-sm">
          <span className="text-green-500">↑ {upvotes}</span>{' '}
          <span className="text-red-500">↓ {downvotes}</span>
        </p>
        <p className="text-sm text-gray-400 line-clamp-2">{movie.description}</p>
      </div>
      <div className="flex flex-col items-center">
        <button onClick={handleUpvote} className="p-1 hover:bg-gray-700 rounded">
          <ChevronUp size={20} className="text-green-500" />
        </button>
        <span className="text-lg font-bold">{totalVotes}</span>
        <button onClick={handleDownvote} className="p-1 hover:bg-gray-700 rounded">
          <ChevronDown size={20} className="text-red-500" />
        </button>
      </div>
    </div>
  );
};

export default VotingItem;
