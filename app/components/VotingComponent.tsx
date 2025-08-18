import React from 'react';
import VotingItem from './VotingItem';

interface Movie {
  id: number;
  title: string;
  image: string;
  upvotes: number;
  downvotes: number;
  description: string;
}

interface VotingComponentProps {
  movies: Movie[];
}

const VotingComponent: React.FC<VotingComponentProps> = ({ movies }) => {
  return (
    <div className="space-y-4">
      {movies.map((movie, index) => (
        <VotingItem key={movie.id} movie={movie} index={index + 1} />
      ))}
    </div>
  );
};

export default VotingComponent;
