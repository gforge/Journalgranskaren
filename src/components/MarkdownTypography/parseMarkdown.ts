import { normalizeMarkdownForDisplay } from './normalizeMarkdown';

export type MarkdownSection = {
  header: string;
  level: number;
  content: string[];
  sections: MarkdownSection[];
};

const countHashes = (header: string): number => {
  const match = /^#+/.exec(header);
  return match ? match[0].length : 0;
};

export const parseMarkdown = (
  content: string
): { baseContent: string[]; sections: MarkdownSection[] } => {
  const lines = normalizeMarkdownForDisplay(content)
    .split('\n')
    .map((line) => line.trim());
  const rootSections: MarkdownSection[] = [];
  const stack: MarkdownSection[] = [];
  const baseContent: string[] = [];

  lines.forEach((line) => {
    const level = countHashes(line);

    if (level > 0) {
      const newSection: MarkdownSection = {
        header: line,
        level: level,
        content: [],
        sections: [],
      };

      while (stack.length > 0 && stack[stack.length - 1].level >= level) {
        stack.pop();
      }

      if (stack.length === 0) {
        rootSections.push(newSection);
      } else {
        stack[stack.length - 1].sections.push(newSection);
      }

      stack.push(newSection);
    } else if (stack.length > 0) {
      stack[stack.length - 1].content.push(line);
    } else {
      baseContent.push(line);
    }
  });

  return {
    baseContent,
    sections: rootSections,
  };
};
