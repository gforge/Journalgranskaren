import { Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

export interface NoteHeaderProps {
  type: string;
  dateTime: string;
  author: string;
}

export const NoteHeader = ({ type, dateTime, author }: NoteHeaderProps) => {
  const { t } = useTranslation();

  const displayType = type === 'Note' ? t('defaultNoteType') : type;
  const displayAuthor = author === 'Unspecified' ? t('unspecifiedAuthor') : author;

  const metaText = dateTime ? `${dateTime} · ${displayAuthor}` : displayAuthor;

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
