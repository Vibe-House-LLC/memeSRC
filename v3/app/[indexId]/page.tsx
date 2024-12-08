import { Metadata } from 'next';
import SearchPage from '../SearchPage';

export async function generateMetadata(
  { params }: { params: { indexId: string } }
): Promise<Metadata> {
  return {
    title: `${params.indexId} • memeSRC`,
    description: "Generated by create next app",
  };
}

export default function HomePage({ params }: { params: { indexId: string } }) {
  return <SearchPage indexId={params.indexId} />
}