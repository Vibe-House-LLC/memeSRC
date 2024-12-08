// /app/collage/page.tsx
import CollageTool from './CollageTool';

export default function CollagePage() {
  return (
    <div className="min-h-screen bg-black text-white p-8 mt-12">
      <h1 className="text-4xl font-bold mb-4">Create a collage</h1>
      
      <nav className="text-gray-400 mb-8">
        <span className="underline">Edit</span>
        <span className="mx-2">&gt;</span>
        <span>Collage Tool</span>
      </nav>
      
      <p className="mb-4">Add images to create a collage:</p>
      
      <CollageTool />
    </div>
  );
}
