import { Metadata } from 'next';
import SearchPage from './SearchPage';

export const metadata: Metadata = {
    title: "memeSRC",
    description: "Search millions of meme templates",
};

export default function HomePage() {
  return <SearchPage indexId="_universal" />
}
