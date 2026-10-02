export interface DatedNewsItem {
  date?: string | null;
}

export function japanCalendarDate(now?: Date): string;
export function filterNewsForJapanDay<T extends DatedNewsItem>(items: T[], now?: Date): T[];
