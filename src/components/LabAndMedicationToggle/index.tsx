import { useState } from 'react';
import { Button, ButtonGroup, Tooltip, Box } from '@mui/material';
import {
  Science as ScienceIcon,
  Medication as MedicationIcon,
} from '@mui/icons-material';
import dayjs from 'dayjs';
import { LabValue, Medication } from 'src/types/chart';

import { ShowDetails } from './ShowDetails';
import { useHasLabValue } from './useHasLabValue';
import { useHasMedication } from './useHasMedication';

type LabAndMedicationToggleProps = {
  medications: Medication[];
  labValues: LabValue[];
  currentDay: dayjs.Dayjs;
  first: boolean;
  extraButtons?: React.ReactNode;
};

export const LabAndMedicationToggle = ({
  medications,
  labValues,
  currentDay,
  first,
  extraButtons,
}: LabAndMedicationToggleProps) => {
  const hasMeds = useHasMedication({
    medications,
    currentDay,
  });
  const hasLab = useHasLabValue({
    labValues,
    currentDay,
    first,
  });
  const [showMedication, setShowMedication] = useState(false);
  const [showLab, setShowLab] = useState(false);

  return (
    <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
      <ButtonGroup
        sx={{
          '& .MuiButton-root': {
            borderColor: 'divider',
            color: 'text.secondary',
            fontSize: '0.75rem',
            py: 0.5,
            px: 1.5,
            textTransform: 'none',
          },
          '& .MuiButton-root:hover': {
            borderColor: 'primary.main',
            color: 'primary.main',
            backgroundColor: 'transparent',
          },
          '& .MuiButton-root.Mui-disabled': {
            borderColor: 'divider',
            color: 'text.disabled',
          },
        }}
      >
        <Tooltip title={hasLab ? `Visa labbvärden för ${currentDay.format('YYYY-MM-DD')}` : 'Inga labbvärden för denna dag'}>
          <span>
            <Button
              variant={showLab ? 'contained' : 'outlined'}
              startIcon={<ScienceIcon sx={{ fontSize: '0.875rem !important' }} />}
              disabled={!hasLab}
              onClick={() => setShowLab(!showLab)}
              size="small"
            >
              Lab
            </Button>
          </span>
        </Tooltip>
        <Tooltip title={hasMeds ? `Visa läkemedel för ${currentDay.format('YYYY-MM-DD')}` : 'Inga läkemedelsförändringar för denna dag'}>
          <span>
            <Button
              variant={showMedication ? 'contained' : 'outlined'}
              startIcon={<MedicationIcon sx={{ fontSize: '0.875rem !important' }} />}
              disabled={!hasMeds}
              onClick={() => setShowMedication(!showMedication)}
              size="small"
            >
              Läkemedel
            </Button>
          </span>
        </Tooltip>
        {extraButtons}
      </ButtonGroup>
      
      <ShowDetails
        showLab={showLab}
        showMedication={showMedication}
        medications={medications}
        labValues={labValues}
        currentDay={currentDay}
        first={first}
      />
    </Box>
  );
};
export default LabAndMedicationToggle;
