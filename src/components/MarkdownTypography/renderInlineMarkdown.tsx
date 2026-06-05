import React from 'react';
import { normalizeMarkdownForDisplay } from './normalizeMarkdown';

const inlinePattern = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;

export function renderInlineMarkdown(text: string): React.ReactNode {
  const parts = normalizeMarkdownForDisplay(text).split(inlinePattern);
  if (parts.length === 1) return text;

  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
}
