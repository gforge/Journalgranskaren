import dayjs from 'dayjs';
import { LabValue, Medication } from 'src/types/chart';
import { useMemo } from 'react';

export const useTodaysLabValues = ({
  labValues,
  currentDay,
  first,
}: {
  labValues: LabValue[];
  currentDay: dayjs.Dayjs;
  first: boolean;
}): {
  current: LabValue;
  previous: LabValue | undefined;
}[] =>
  useMemo(() => {
    const todays = labValues.filter(({ date }) =>
      first
        ? dayjs(date).isSame(currentDay, 'day') || dayjs(date).isBefore(currentDay, 'day')
        : dayjs(date).isSame(currentDay, 'day')
    );

    return todays.map((lab) => {
      const sameTest = labValues.filter(
        (l) =>
          l.labTest === lab.labTest &&
          `${l.date} ${l.time}` !== `${lab.date} ${lab.time}`
      );
      return {
        current: lab,
        previous: sameTest
          .filter(({ date, time }) =>
            dayjs(`${date} ${time}`).isBefore(dayjs(`${lab.date} ${lab.time}`))
          )
          .sort((a, b) =>
            dayjs(`${b.date} ${b.time}`).diff(dayjs(`${a.date} ${a.time}`))
          )[0], // Sort descending by date/time to find the immediate previous value
      };
    });
  }, [labValues, first, currentDay]);

export const useTodaysMedications = (
  medications: Medication[],
  currentDay: dayjs.Dayjs
): {
  current: Medication;
  previous: Medication | undefined;
}[] =>
  useMemo(() => {
    const todaysMedications = medications.filter((med) =>
      dayjs(med.date).isSame(currentDay, 'day')
    );

    return todaysMedications.map((current) => {
      const previousMedications = medications
        .filter(
          (med) =>
            med.medication === current.medication &&
            dayjs(med.date).isBefore(currentDay, 'day')
        )
        .sort((a, b) => dayjs(b.date).diff(dayjs(a.date)));

      return {
        current,
        previous: previousMedications[0] || undefined,
      };
    });
  }, [medications, currentDay]);
