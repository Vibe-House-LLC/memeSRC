// File: src/app/components/MarkdownRenderer.tsx

import React from 'react';
import ReactMarkdown, { Components } from 'react-markdown';

// Custom type for the code component props
type CodeComponentProps = Components['code'] & { inline?: boolean };

const markdownComponents: Components = {
  h1: ({node, ...props}) => <h1 className="text-4xl font-bold mb-6" {...props} />,
  h2: ({node, ...props}) => <h2 className="text-3xl font-semibold mt-8 mb-4" {...props} />,
  h3: ({node, ...props}) => <h3 className="text-2xl font-semibold mt-6 mb-3" {...props} />,
  h4: ({node, ...props}) => <h4 className="text-xl font-semibold mt-4 mb-2" {...props} />,
  h5: ({node, ...props}) => <h5 className="text-lg font-semibold mt-3 mb-2" {...props} />,
  h6: ({node, ...props}) => <h6 className="text-base font-semibold mt-2 mb-1" {...props} />,
  p: ({node, ...props}) => <p className="mb-4" {...props} />,
  ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-4" {...props} />,
  ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-4" {...props} />,
  li: ({node, ...props}) => <li className="mb-2" {...props} />,
  a: ({node, ...props}) => <a className="text-blue-600 dark:text-blue-400 hover:underline" {...props} />,
  blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-gray-300 dark:border-gray-700 pl-4 py-2 mb-4 italic" {...props} />,
  pre: ({node, ...props}) => <pre className="mb-4" {...props} />,
  em: ({node, ...props}) => <em className="italic" {...props} />,
  strong: ({node, ...props}) => <strong className="font-bold" {...props} />,
};

interface MarkdownRendererProps {
  markdown: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ markdown, className = "" }) => {
  return (
    <div className={`max-w-4xl mx-auto p-4 text-black dark:text-white ${className}`}>
      <ReactMarkdown components={markdownComponents}>
        {markdown}
      </ReactMarkdown>
    </div>
  );
};
