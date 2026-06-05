import { forwardRef } from 'react';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Tooltip,
} from '@mui/material';
import dayjs from 'dayjs';
import { Medication } from 'src/types/chart';
import { useTodaysMedications } from './hooks';

type MedicationTableProps = {
  medications: Medication[];
  currentDay: dayjs.Dayjs;
};

export const MedicationTable = forwardRef<HTMLDivElement, MedicationTableProps>(
  ({ medications, currentDay }, ref) => {
    const todaysMedications = useTodaysMedications(medications, currentDay);

    return (
      <TableContainer
        component={Paper}
        variant="outlined"
        sx={{ width: 'auto', minWidth: '340px', maxWidth: '100%', mt: 1, borderColor: 'divider' }}
        ref={ref}
      >
        <Table size="small">
          <TableBody>
            {todaysMedications.map(
              ({
                current: {
                  medication,
                  strength,
                  unit,
                  timesPerDay,
                },
                previous,
              }) => (
                <TableRow key={`${medication}-${strength}-${unit}`} hover>
                  <TableCell sx={{ fontSize: '0.8125rem', fontWeight: 600 }}>{medication}</TableCell>
                  <TableCell
                    align="right"
                    sx={{ paddingRight: '0px', fontFamily: 'monospace', fontSize: '0.8125rem' }}
                  >
                    {strength}
                  </TableCell>
                  <TableCell
                    align="left"
                    sx={{ paddingLeft: '5px', fontSize: '0.75rem', color: 'text.secondary' }}
                  >
                    {unit}
                  </TableCell>
                  <TimesPerDayCell
                    currentTimesPerDay={timesPerDay}
                    previousTimesPerDay={previous?.timesPerDay}
                  />
                </TableRow>
              )
            )}
          </TableBody>
        </Table>
      </TableContainer>
    );
  }
);

MedicationTable.displayName = 'MedicationTable';

type TimesPerDayCellProps = {
  currentTimesPerDay?: string | null;
  previousTimesPerDay?: string | null;
};

const TimesPerDayCell = ({
  currentTimesPerDay,
  previousTimesPerDay,
}: TimesPerDayCellProps) => {
  if (!currentTimesPerDay) {
    return <TableCell align="center" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>-</TableCell>;
  }

  if (!previousTimesPerDay || previousTimesPerDay === currentTimesPerDay) {
    return <TableCell align="center" sx={{ fontSize: '0.75rem', color: 'text.secondary', fontWeight: 500 }}>{currentTimesPerDay}</TableCell>;
  }

  return (
    <TableCell align="center" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
      <Tooltip title={`Previously ${previousTimesPerDay}`}>
        <span style={{ fontWeight: 600, borderBottom: '1px dotted' }}>{currentTimesPerDay} *</span>
      </Tooltip>
    </TableCell>
  );
};
