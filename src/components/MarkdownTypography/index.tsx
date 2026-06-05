import { Box, Typography } from '@mui/material';

import { boxStyles } from './boxStyles';
import { parseMarkdown } from './parseMarkdown';
import { renderInlineMarkdown } from './renderInlineMarkdown';
import { Section } from './Section';

/**
 * Simple converter from markdown to Typography components for headers.
 */
export const MarkdownTypography = ({ content }: { content: string }) => {
  const { baseContent, sections } = parseMarkdown(content);

  return (
    <>
      {baseContent.length > 0 && (
        <Box sx={{ ...boxStyles }}>
          {baseContent.map((line, index) => {
            if (line.trim() === '') return null;
            const hasBlankAfter = baseContent[index + 1]?.trim() === '';
            return (
              <Typography
                key={index}
                variant="body1"
                sx={{
                  textAlign: 'left',
                  marginBottom: hasBlankAfter ? '0.6em' : '2px',
                  fontSize: '0.9375rem',
                  lineHeight: 1.6,
                }}
              >
                {renderInlineMarkdown(line)}
              </Typography>
            );
          })}
        </Box>
      )}
      {sections.map((section, index) => (
        <Section section={section} key={index} />
      ))}
    </>
  );
};
