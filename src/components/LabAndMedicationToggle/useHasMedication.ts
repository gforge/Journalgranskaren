import dayjs from 'dayjs';
import { Medication } from 'src/types/chart';

export const useHasMedication = ({
  medications,
  currentDay,
}: {
  medications: Medication[];
  currentDay: dayjs.Dayjs;
}): boolean => {
  return !!medications.some(({ date }) =>
    dayjs(date).isSame(currentDay, 'day')
  );
};
