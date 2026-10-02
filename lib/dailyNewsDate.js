/** 日本時間のカレンダー日を YYYY-MM-DD で返す。 */
export function japanCalendarDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);

  const part = (type) => parts.find((value) => value.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

/** トップの速報欄用。公開日が日本時間の当日と一致する記事だけを返す。 */
export function filterNewsForJapanDay(items, now = new Date()) {
  const today = japanCalendarDate(now);
  return items.filter((item) => item && item.date === today);
}
