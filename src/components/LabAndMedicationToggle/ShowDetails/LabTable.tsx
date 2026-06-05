import { forwardRef } from 'react';
import {
  TrendingDown as TrendingDownIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Tooltip,
  Zoom,
} from '@mui/material';
import dayjs from 'dayjs';
import { LabValue } from 'src/types/chart';
import { useTodaysLabValues } from './hooks';

type LabTableProps = {
  labValues: LabValue[];
  currentDay: dayjs.Dayjs;
  first: boolean;
};

export const LabTable = forwardRef<HTMLDivElement, LabTableProps>(
  ({ labValues, currentDay, first }, ref) => {
    const todaysLabValues = useTodaysLabValues({
      labValues,
      currentDay,
      first,
    });

    return (
      <TableContainer
        component={Paper}
        variant="outlined"
        sx={{ width: 'auto', minWidth: '340px', maxWidth: '100%', mt: 1, borderColor: 'divider' }}
        ref={ref}
      >
        <Table size="small">
          <TableBody>
            {todaysLabValues.map(({ current: lab, previous }) => (
              <TableRow key={lab.labTest} hover>
                <TableCell sx={{ fontSize: '0.8125rem', fontWeight: 600 }}>{lab.labTest}</TableCell>
                <TableCell align="right" sx={{ fontSize: '0.8125rem', fontFamily: 'monospace' }}>
                  {lab.value}
                </TableCell>
                <TableCell align="left" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                  {lab.unit}
                </TableCell>
                <TableCell align="right" sx={{ padding: '0' }}>
                  <TrendIndicator lab={lab} previous={previous} />
                </TableCell>
                <TableCell align="center" sx={{ fontSize: '0.75rem', color: 'text.secondary', fontFamily: 'monospace' }}>
                  {lab.referenceInterval || ''}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  }
);

LabTable.displayName = 'LabTable';

const TrendIndicator = ({
  lab,
  previous,
}: {
  lab: LabValue;
  previous?: LabValue;
}) => {
  if (!previous) {
    return null;
  }
  const { value } = lab;
  const { value: previousValue, date, time } = previous;

  const labValueNum = parseFloat(value);
  const previousValueNum = parseFloat(previousValue);
  if (isNaN(labValueNum) || isNaN(previousValueNum)) {
    return null;
  }

  if (labValueNum > previousValueNum) {
    return (
      <Tooltip
        slots={{ transition: Zoom }}
        enterDelay={500}
        leaveDelay={200}
        title={
          <span>
            Trending up from <strong>{previousValue}</strong> on{' '}
            <em>
              {date}&nbsp;{time}
            </em>
          </span>
        }
      >
        <TrendingUpIcon style={{ color: '#ff9800', marginLeft: '5px', fontSize: '1rem' }} />
      </Tooltip>
    );
  }

  if (labValueNum < previousValueNum) {
    return (
      <Tooltip
        slots={{ transition: Zoom }}
        enterDelay={500}
        leaveDelay={200}
        title={
          <span>
            Trending down from <strong>{previousValue}</strong> on{' '}
            <em>
              {date}&nbsp;{time}
            </em>
          </span>
        }
      >
        <TrendingDownIcon style={{ color: '#2196f3', marginLeft: '5px', fontSize: '1rem' }} />
      </Tooltip>
    );
  }

  return null;
};
