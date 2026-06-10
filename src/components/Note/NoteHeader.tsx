import { Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';

export interface NoteHeaderProps {
  type: string;
  dateTime: string;
  author: string;
}

/**
 * Formats a dateTime string for display in the note header.
 * Shows only the date when the time component is midnight (i.e. the source
 * data had no time information), otherwise shows date + time.
 */
function formatNoteDateTime(raw: string): string {
  const d = dayjs(raw);
  if (!d.isValid()) return raw; // Unparseable: show as-is
  // If time is exactly 00:00 (midnight), the source likely had date-only data
  if (d.hour() === 0 && d.minute() === 0 && d.second() === 0) {
    return d.format('YYYY-MM-DD');
  }
  return d.format('YYYY-MM-DD HH:mm');
}

export const NoteHeader = ({ type, dateTime, author }: NoteHeaderProps) => {
  const { t } = useTranslation();

  const displayType = type === 'Note' ? t('defaultNoteType') : type;
  const displayAuthor = author === 'Unspecified' ? t('unspecifiedAuthor') : author;

  const formattedDate = dateTime ? formatNoteDateTime(dateTime) : '';
  const metaText = formattedDate ? `${formattedDate} · ${displayAuthor}` : displayAuthor;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 2,
        paddingBottom: '8px',
        marginBottom: '4px',
        borderBottom: '1px solid',
        borderColor: 'divider',
        flexWrap: 'wrap',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Typography
          variant="subtitle1"
          component="div"
          sx={{ fontWeight: 600, lineHeight: 1.3 }}
        >
          {displayType}
        </Typography>
      </Box>
      <Box sx={{ flexShrink: 0 }}>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ fontWeight: 400, whiteSpace: 'nowrap' }}
        >
          {metaText}
        </Typography>
      </Box>
    </Box>
  );
};
