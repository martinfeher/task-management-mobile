const scrollByDaysKey = new Map<string, number>();

export function rememberCalendarGridScroll(daysKey: string, y: number) {
  scrollByDaysKey.set(daysKey, y);
}

export function recallCalendarGridScroll(daysKey: string) {
  return scrollByDaysKey.get(daysKey);
}

export function resolveCalendarGridScrollTarget(
  daysKey: string,
  defaultY: number,
) {
  const saved = recallCalendarGridScroll(daysKey);
  if (saved != null) {
    return saved;
  }

  rememberCalendarGridScroll(daysKey, defaultY);
  return defaultY;
}
