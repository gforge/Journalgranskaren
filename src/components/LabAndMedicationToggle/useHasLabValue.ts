import dayjs from 'dayjs';
import { LabValue } from 'src/types/chart';

export const useHasLabValue = ({
  labValues,
  currentDay,
  first,
}: {
  labValues: LabValue[];
  currentDay: dayjs.Dayjs;
  first: boolean;
}): boolean => {
  return !!labValues.some(({ date, time }) => {
    const labDateTime = dayjs(`${date} ${time}`);
    return first
      ? labDateTime.isBefore(currentDay, 'day') || labDateTime.isSame(currentDay, 'day')
      : labDateTime.isSame(currentDay, 'day');
  });
};
