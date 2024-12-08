// app/edit/page.tsx
import Link from 'next/link';
import { UploadCloud, Image, Search, Wand2 } from 'lucide-react';

const tools = [
  {
    name: 'Upload Image',
    description: 'Choose your own image',
    icon: UploadCloud,
    link: '/upload',
  },
  {
    name: 'Create Collage',
    description: 'Combine multiple images',
    icon: Image,
    link: '/collage',
    badge: 'Early Access!',
  },
  {
    name: 'Search Images',
    description: 'Find 70 million+ on memeSRC',
    icon: Search,
    link: '/',
  },
  {
    name: 'Generate Image',
    description: 'Using memeSRC Magic',
    icon: Wand2,
    link: '/generate',
    badge: 'coming soon',
    disabled: true,
  },
];

export default function EditPage() {
  return (
    <div className="min-h-screen bg-black text-white p-8 mt-12">
      <h1 className="text-4xl font-bold mb-4">Meme Tools</h1>
      
      <nav className="text-gray-400 mb-8">
        <Link href="/" className="hover:text-white">Home</Link>
        <span className="mx-2">&gt;</span>
        <span>Editor</span>
      </nav>
      
      <div className="bg-green-900 text-green-100 p-4 rounded-lg mb-8">
        <p className="flex items-center">
          <span className="mr-2">✓</span>
          New: Check out the Collage tool (early access)!
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {tools.map((tool) => (
          <Link
            key={tool.name}
            href={tool.disabled ? '#' : tool.link}
            className={`block p-6 bg-gray-800 rounded-lg hover:bg-gray-700 transition ${tool.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className="flex justify-between items-start mb-4">
              <tool.icon className="h-8 w-8 text-white" />
              {tool.badge && (
                <span className={`px-2 py-1 text-xs font-semibold rounded ${tool.badge === 'Early Access!' ? 'bg-green-500 text-green-900' : 'bg-blue-500 text-blue-900'}`}>
                  {tool.badge}
                </span>
              )}
            </div>
            <h2 className="text-xl font-semibold mb-2">{tool.name}</h2>
            <p className="text-gray-400">{tool.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}