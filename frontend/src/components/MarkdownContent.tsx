import React from 'react';
import ReactMarkdown from 'react-markdown';

interface MarkdownContentProps {
  content: string;
  className?: string;
}

const MarkdownContent: React.FC<MarkdownContentProps> = ({ content, className = '' }) => {
  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown
        components={{
        // Paragraph
        p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
        
        // Headings
        h1: ({ children }) => <h1 className="text-2xl font-bold mb-3 text-white">{children}</h1>,
        h2: ({ children }) => <h2 className="text-xl font-bold mb-2 text-white">{children}</h2>,
        h3: ({ children }) => <h3 className="text-lg font-semibold mb-2 text-white">{children}</h3>,
        
        // Lists
        ul: ({ children }) => <ul className="list-disc list-inside mb-3 space-y-1">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal list-inside mb-3 space-y-1">{children}</ol>,
        li: ({ children }) => <li className="ml-4">{children}</li>,
        
        // Text formatting
        strong: ({ children }) => <strong className="font-bold text-white">{children}</strong>,
        em: ({ children }) => <em className="italic">{children}</em>,
        
        // Links
        a: ({ href, children }) => (
          <a 
            href={href} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-blue-400 hover:text-blue-300 underline"
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </a>
        ),
        
        // Code
        code: ({ children, className }) => {
          const isInline = !className;
          if (isInline) {
            return (
              <code className="bg-gray-800 text-blue-300 px-1.5 py-0.5 rounded text-sm font-mono">
                {children}
              </code>
            );
          }
          return (
            <code className="block bg-gray-800 text-gray-300 p-3 rounded-lg overflow-x-auto text-sm font-mono mb-3">
              {children}
            </code>
          );
        },
        
        // Blockquote
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-blue-500 pl-4 py-2 mb-3 text-gray-400 italic">
            {children}
          </blockquote>
        ),
        
        // Horizontal rule
        hr: () => <hr className="border-gray-700 my-4" />,
      }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownContent;
