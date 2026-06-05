import { Collapse, Stack } from '@mui/material';
import dayjs from 'dayjs';
import { LabValue, Medication } from 'src/types/chart';
import { useEffect, useRef } from 'react';

import { LabTable } from './LabTable';
import { MedicationTable } from './MedicationTable';

type ShowDetailsProp = {
  showLab: boolean;
  showMedication: boolean;
  medications: Medication[];
  labValues: LabValue[];
  currentDay: dayjs.Dayjs;
  first: boolean;
};

export const ShowDetails = ({
  showLab,
  showMedication,
  medications,
  labValues,
  currentDay,
  first,
}: ShowDetailsProp) => {
  const labRef = useRef<HTMLDivElement>(null);
  const medicationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (showLab && labRef.current) {
        labRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        });
      }
      if (showMedication && medicationRef.current) {
        medicationRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        });
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [showLab, showMedication]);

  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      sx={{ gap: 2, alignItems: 'start', flexWrap: 'wrap', width: '100%' }}
    >
      <Collapse
        in={showLab}
        unmountOnExit
        sx={{ width: { xs: '100%', md: 'auto' } }}
      >
        <LabTable
          labValues={labValues}
          currentDay={currentDay}
          first={first}
          ref={labRef}
        />
      </Collapse>

      <Collapse
        in={showMedication}
        unmountOnExit
        sx={{ width: { xs: '100%', md: 'auto' } }}
      >
        <MedicationTable
          medications={medications}
          currentDay={currentDay}
          ref={medicationRef}
        />
      </Collapse>
    </Stack>
  );
};
