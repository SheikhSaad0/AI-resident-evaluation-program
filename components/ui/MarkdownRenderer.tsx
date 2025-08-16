// components/ui/MarkdownRenderer.tsx
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
  content: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h3: ({ node, ...props }) => <h3 className="heading-md text-gradient mb-4" {...props} />,
        h4: ({ node, ...props }) => <h4 className="heading-sm text-gradient mb-3" {...props} />,
        p: ({ node, ...props }) => <p className="text-text-secondary leading-relaxed mb-4" {...props} />,
        ul: ({ node, ...props }) => <ul className="list-disc list-inside space-y-2 mb-4 text-text-tertiary" {...props} />,
        li: ({ node, ...props }) => <li className="pl-2" {...props} />,
        strong: ({ node, ...props }) => <strong className="font-bold text-text-primary" {...props} />,
        hr: ({ node, ...props }) => <hr className="border-glass-border my-6" {...props} />,
      }}
    >
      {content}
    </ReactMarkdown>
  );
};

export default MarkdownRenderer;