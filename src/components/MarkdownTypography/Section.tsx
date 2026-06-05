import { KeyboardArrowDown } from '@mui/icons-material';
import { Box, Collapse, Stack, Typography } from '@mui/material';
import { useState } from 'react';

import { boxStyles } from './boxStyles';
import { MarkdownSection } from './parseMarkdown';
import { renderInlineMarkdown } from './renderInlineMarkdown';

const clinicalTextSx = {
  fontSize: '0.9375rem',
  lineHeight: 1.6,
  letterSpacing: '0.005em',
  textAlign: 'left' as const,
  whiteSpace: 'normal' as const,
  wordBreak: 'break-word' as const,
};

const sectionLabelSx = {
  fontSize: '0.875rem',
  lineHeight: 1.45,
  fontWeight: 600,
  color: 'text.secondary',
  whiteSpace: 'nowrap' as const,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  flexShrink: 0,
};

export const Section = ({
  section: { header, level, content, sections },
  secondary = false,
}: {
  section: MarkdownSection;
  secondary?: boolean;
}) => {
  const title = header.replace(/^#+\s*/, '');
  const nonEmptyContent = content.filter((l) => l.trim() !== '');
  const [expanded, setExpanded] = useState(true);

  const isFlattenable = nonEmptyContent.length === 0 && sections.length === 1;
  if (isFlattenable) {
    const child = sections[0];
    const childTitle = child.header.replace(/^#+\s*/, '');
    return (
      <Section
        section={{
          ...child,
          header: `${'#'.repeat(level)} ${title}, ${childTitle}`,
        }}
        secondary
      />
    );
  }

  const isSimple =
    secondary ||
    (nonEmptyContent.length <= 1 &&
      sections.length === 0 &&
      (nonEmptyContent.length === 0 || nonEmptyContent[0].length < 80));

  if (isSimple) {
    return (
      <Box sx={{ ...boxStyles, paddingTop: '1px', paddingBottom: '1px' }}>
        {nonEmptyContent.length === 1 ? (
          <Typography sx={clinicalTextSx}>
            <Box
              component="span"
              sx={{ fontWeight: 600, color: 'text.secondary' }}
            >
              {renderInlineMarkdown(title)}:
            </Box>{' '}
            <Box
              component="span"
              sx={{ fontWeight: 400, color: 'text.primary' }}
            >
              {renderInlineMarkdown(nonEmptyContent[0])}
            </Box>
          </Typography>
        ) : (
          <Typography sx={sectionLabelSx}>
            {renderInlineMarkdown(title)}
          </Typography>
        )}
      </Box>
    );
  }

  return (
    <Box sx={{ ...boxStyles }}>
      <Stack
        direction="row"
        spacing={0.5}
        onClick={() => setExpanded((e) => !e)}
        sx={{
          cursor: 'pointer',
          userSelect: 'none',
          paddingTop: '1px',
          paddingBottom: '1px',
          alignItems: 'center',
        }}
      >
        <KeyboardArrowDown
          sx={{
            fontSize: '0.875rem',
            color: 'text.disabled',
            flexShrink: 0,
            transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)',
            transition: 'transform 0.15s ease',
          }}
        />
        <Typography sx={sectionLabelSx}>
          {renderInlineMarkdown(title)}
        </Typography>
      </Stack>
      <Collapse in={expanded} timeout={150}>
        {nonEmptyContent.length > 0 && (
          <Box sx={{ paddingLeft: '1rem', paddingTop: '1px' }}>
            {content.map((line, index) => {
              if (line.trim() === '') return null;
              const hasBlankAfter = content[index + 1]?.trim() === '';
              return (
                <Typography
                  key={index}
                  sx={{
                    ...clinicalTextSx,
                    marginBottom: hasBlankAfter ? '0.5em' : 0,
                  }}
                >
                  {renderInlineMarkdown(line)}
                </Typography>
              );
            })}
          </Box>
        )}
        {sections.map((subSection, subKey) => (
          <Section section={subSection} key={subKey} secondary />
        ))}
      </Collapse>
    </Box>
  );
};
