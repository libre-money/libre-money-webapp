import {
  setDateToTheFirstDateOfYear,
  setDateToTheFirstDateOfPreviousYear,
  setDateToTheLastDateOfPreviousYear,
  setDateToTheFirstDateOfMonth,
  setDateToTheFirstDateOfPreviousMonth,
  setDateToTheLastDateOfPreviousMonth,
  setDateToTheLastDateOfYear,
} from "./date-utils";

export const getStartAndEndEpochFromPreset = (newPreset: string) => {
  console.log(newPreset);
  const range = { startEpoch: 0, endEpoch: 0 };
  if (newPreset === "current-year") {
    range.startEpoch = setDateToTheFirstDateOfYear(Date.now());
    range.endEpoch = setDateToTheLastDateOfYear(Date.now());
    return range;
  } else if (newPreset === "previous-year") {
    range.startEpoch = setDateToTheFirstDateOfPreviousYear(Date.now());
    range.endEpoch = setDateToTheLastDateOfPreviousYear(Date.now());
    return range;
  } else if (newPreset === "current-month") {
    range.startEpoch = setDateToTheFirstDateOfMonth(Date.now());
    range.endEpoch = Date.now();
    return range;
  } else if (newPreset === "previous-month") {
    range.startEpoch = setDateToTheFirstDateOfPreviousMonth(Date.now());
    range.endEpoch = setDateToTheLastDateOfPreviousMonth(Date.now());
    return range;
  } else if (newPreset === "all-time") {
    range.startEpoch = 0;
    range.endEpoch = Date.now();
    return range;
  } else {
    return null;
  }
};
