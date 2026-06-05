import { Box, Paper, PaperProps } from '@mui/material';
import { MarkdownTypography } from '../MarkdownTypography';
import { NoteHeader } from './NoteHeader';
import { ChartNote, LabValue, Medication } from 'src/types/chart';
import { LabAndMedicationToggle } from '../LabAndMedicationToggle';
import dayjs from 'dayjs';

export type NoteProps = PaperProps & {
  note: ChartNote;
  medications: Medication[];
  labValues: LabValue[];
  first: boolean;
  children?: React.ReactNode;
};

export const Note = ({ note, medications, labValues, first, children, ...props }: NoteProps) => {
  const { dateTime, noteType, author, content } = note;

  return (
    <Paper
      {...props}
      sx={{
        marginBottom: '10px',
        py: { xs: 2.5, sm: 4 },
        px: { xs: 2.5, sm: 6 },
        maxWidth: '680px',
        marginLeft: 'auto',
        marginRight: 'auto',
        textAlign: 'left',
        ...props.sx,
      }}
    >
      <Box sx={{ margin: 'auto' }}>
        <NoteHeader
          dateTime={dateTime}
          type={noteType}
          author={author}
        />
        <MarkdownTypography content={content} />
        
        {dateTime && (
          <LabAndMedicationToggle
            medications={medications}
            labValues={labValues}
            currentDay={dayjs(dateTime)}
            first={first}
          />
        )}
      </Box>
      {children}
    </Paper>
  );
};
