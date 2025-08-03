export function setDateToTheFirstDateOfMonth(now: number) {
  const date = new Date(now);
  date.setDate(1);
  return date.getTime();
}

export function setDateToTheLastDateOfPreviousMonth(now: number) {
  const date = new Date(now);
  date.setDate(1);
  date.setDate(date.getDate() - 1);
  return date.getTime();
}

export function setDateToTheFirstDateOfPreviousMonth(now: number) {
  const date = new Date(now);
  date.setDate(1);
  date.setMonth(date.getMonth() - 1);
  return date.getTime();
}

export function setDateToTheFirstDateOfYear(now: number) {
  const date = new Date(now);
  date.setDate(1);
  date.setMonth(0);
  return date.getTime();
}

export function setDateToTheLastDateOfYear(now: number) {
  const date = new Date(now);
  date.setDate(1);
  date.setMonth(0);
  date.setFullYear(date.getFullYear() + 1);
  date.setDate(date.getDate() - 1);
  return date.getTime();
}

export function setDateToTheLastDateOfPreviousYear(now: number) {
  const date = new Date(now);
  date.setDate(1);
  date.setMonth(0);
  date.setDate(date.getDate() - 1);
  return date.getTime();
}

export function setDateToTheFirstDateOfPreviousYear(now: number) {
  const date = new Date(now);
  date.setDate(1);
  date.setMonth(0);
  date.setFullYear(date.getFullYear() - 1);
  return date.getTime();
}

export function normalizeEpochRange(startEpoch: number, endEpoch: number) {
  const date1 = new Date(startEpoch);
  date1.setHours(0);
  date1.setMinutes(0);
  date1.setSeconds(0);
  date1.setMilliseconds(0);
  startEpoch = date1.getTime();

  const date2 = new Date(endEpoch);
  date2.setHours(23);
  date2.setMinutes(59);
  date2.setSeconds(59);
  date2.setMilliseconds(999);
  endEpoch = date2.getTime();
  return [startEpoch, endEpoch];
}
export function normalizeEpochAsDate(epoch: number) {
  const date1 = new Date(epoch);
  date1.setHours(0);
  date1.setMinutes(0);
  date1.setSeconds(0);
  date1.setMilliseconds(0);
  return date1.getTime();
}

export function normalizeEpochAsDateAtTheEndOfDay(epoch: number) {
  const date1 = new Date(epoch);
  date1.setHours(23);
  date1.setMinutes(59);
  date1.setSeconds(59);
  date1.setMilliseconds(999);
  return date1.getTime();
}
