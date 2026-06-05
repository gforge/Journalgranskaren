const lineStartHeadingPattern = /^([ \t]*#{1,6})(?!#)(?=\S)/gm;
const lineStartBulletPattern = /^([ \t]*\*)(?!\*)(?=\S)/gm;
const boldPattern = /\*\*[ \t]*([^*\n]*?\S)[ \t]*\*\*/g;
const italicPattern = /(^|[^*])\*[ \t]*([^*\n]*?\S)[ \t]*\*/g;

export function normalizeMarkdownForDisplay(markdown: string): string {
  return markdown
    .replace(lineStartHeadingPattern, '$1 ')
    .replace(lineStartBulletPattern, '$1 ')
    .replace(boldPattern, '**$1**')
    .replace(italicPattern, '$1*$2*');
}
