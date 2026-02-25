export type OpeningHoursPeriod = {
  open?: { day?: number; hour?: number; minute?: number };
  close?: { day?: number; hour?: number; minute?: number };
};

export type OpeningHours = {
  periods?: OpeningHoursPeriod[];
  weekdayDescriptions?: string[];
};

type OpenStatusSummary = {
  isOpenNow: boolean | null;
  nextOpenLabel: string | null;
};

const MINUTES_IN_DAY = 24 * 60;
const MINUTES_IN_WEEK = 7 * MINUTES_IN_DAY;
const DEFAULT_UTC_OFFSET_MINUTES = 540;

const toMinutes = (hour?: number, minute?: number) =>
  (hour ?? 0) * 60 + (minute ?? 0);

const toWeekMinutes = (day?: number, minutes?: number) =>
  (day ?? 0) * MINUTES_IN_DAY + (minutes ?? 0);

const DAY_LABELS_JA = ["日", "月", "火", "水", "木", "金", "土"];

const formatTime = (minutes: number) => {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
};

export const parseTimeInput = (value: string): number | null => {
  if (!value) return null;
  const match = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return hour * 60 + minute;
};

export const getLocalDayMinutes = (
  date: Date,
  utcOffsetMinutes?: number | null
) => {
  const offsetMinutes = utcOffsetMinutes ?? DEFAULT_UTC_OFFSET_MINUTES;
  const localMs = date.getTime() + offsetMinutes * 60_000;
  const local = new Date(localMs);
  const day = local.getUTCDay();
  const minutes = local.getUTCHours() * 60 + local.getUTCMinutes();
  return { day, minutes };
};

export const isOpenAt = (
  openingHours: OpeningHours | null | undefined,
  day: number,
  minutes: number
): boolean | null => {
  const periods = openingHours?.periods ?? [];
  if (periods.length === 0) return null;

  const target = day * MINUTES_IN_DAY + minutes;

  for (const period of periods) {
    const open = period.open;
    const close = period.close;
    if (!open || !close || open.day == null || close.day == null) continue;

    const openMinutes = toMinutes(open.hour, open.minute);
    const closeMinutes = toMinutes(close.hour, close.minute);
    const openWeek = toWeekMinutes(open.day, openMinutes);
    let closeWeek = toWeekMinutes(close.day, closeMinutes);

    if (closeWeek <= openWeek) {
      closeWeek += MINUTES_IN_WEEK;
    }

    let targetWeek = target;
    if (targetWeek < openWeek) {
      targetWeek += MINUTES_IN_WEEK;
    }

    if (targetWeek >= openWeek && targetWeek < closeWeek) {
      return true;
    }
  }

  return false;
};

export const isOpenOnDay = (
  openingHours: OpeningHours | null | undefined,
  day: number
): boolean | null => {
  const periods = openingHours?.periods ?? [];
  if (periods.length === 0) return null;

  const dayStart = day * MINUTES_IN_DAY;
  const dayEnd = dayStart + MINUTES_IN_DAY;

  for (const period of periods) {
    const open = period.open;
    const close = period.close;
    if (!open || !close || open.day == null || close.day == null) continue;

    const openMinutes = toMinutes(open.hour, open.minute);
    const closeMinutes = toMinutes(close.hour, close.minute);
    const openWeek = toWeekMinutes(open.day, openMinutes);
    let closeWeek = toWeekMinutes(close.day, closeMinutes);

    if (closeWeek <= openWeek) {
      closeWeek += MINUTES_IN_WEEK;
    }

    const overlaps = (start: number, end: number) =>
      openWeek < end && closeWeek > start;

    if (
      overlaps(dayStart, dayEnd) ||
      overlaps(dayStart + MINUTES_IN_WEEK, dayEnd + MINUTES_IN_WEEK)
    ) {
      return true;
    }
  }

  return false;
};

export const isClosedOnDay = (
  openingHours: OpeningHours | null | undefined,
  day: number
): boolean | null => {
  const result = isOpenOnDay(openingHours, day);
  return result === null ? null : !result;
};

export const isOpenNow = (
  openingHours: OpeningHours | null | undefined,
  utcOffsetMinutes: number | null | undefined,
  now = new Date()
): boolean | null => {
  const { day, minutes } = getLocalDayMinutes(now, utcOffsetMinutes);
  return isOpenAt(openingHours, day, minutes);
};

export const isOpenAtTimeInput = (
  openingHours: OpeningHours | null | undefined,
  utcOffsetMinutes: number | null | undefined,
  timeInput: string,
  now = new Date()
): boolean | null => {
  const minutes = parseTimeInput(timeInput);
  if (minutes == null) return null;
  const { day } = getLocalDayMinutes(now, utcOffsetMinutes);
  return isOpenAt(openingHours, day, minutes);
};

export const getOpenStatusSummary = (
  openingHours: OpeningHours | null | undefined,
  utcOffsetMinutes: number | null | undefined,
  now = new Date()
): OpenStatusSummary => {
  const periods = openingHours?.periods ?? [];
  const isOpen = isOpenNow(openingHours, utcOffsetMinutes, now);
  if (periods.length === 0) {
    return { isOpenNow: null, nextOpenLabel: null };
  }

  const current = getLocalDayMinutes(now, utcOffsetMinutes);
  const currentWeekMinutes = toWeekMinutes(current.day, current.minutes);
  let nextOpenWeekMinutes: number | null = null;

  for (const period of periods) {
    const open = period.open;
    if (!open || open.day == null) continue;
    const openWeekMinutes = toWeekMinutes(open.day, toMinutes(open.hour, open.minute));
    const candidates = [openWeekMinutes, openWeekMinutes + MINUTES_IN_WEEK];
    for (const candidate of candidates) {
      if (candidate <= currentWeekMinutes) continue;
      if (nextOpenWeekMinutes == null || candidate < nextOpenWeekMinutes) {
        nextOpenWeekMinutes = candidate;
      }
    }
  }

  if (nextOpenWeekMinutes == null) {
    return { isOpenNow: isOpen, nextOpenLabel: null };
  }

  const diff = nextOpenWeekMinutes - currentWeekMinutes;
  const dayOffset = Math.floor(diff / MINUTES_IN_DAY);
  const openDay = Math.floor((nextOpenWeekMinutes % MINUTES_IN_WEEK) / MINUTES_IN_DAY);
  const openMinutes = nextOpenWeekMinutes % MINUTES_IN_DAY;
  const prefix =
    dayOffset <= 0 ? "本日" : dayOffset === 1 ? "明日" : `${DAY_LABELS_JA[openDay]}曜`;

  return {
    isOpenNow: isOpen,
    nextOpenLabel: `${prefix} ${formatTime(openMinutes)}`,
  };
};
