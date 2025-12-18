import dayjs from 'dayjs';

function ruPlural(n: number, forms: [string, string, string]): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return forms[1];
  return forms[2];
}

/**
 * Возвращает человекопонятную строку на русском для переданной даты.
 * Принимает строку даты, Date или undefined.
 */
export function dateToHumanReadable(dateValue?: string | Date | null): string {
  if (!dateValue) return '';

  const ref = dayjs(dateValue);
  if (!ref.isValid()) return '';

  const now = dayjs();
  const diffDays = now.diff(ref, 'day');

  if (diffDays === 0) {
    const diffHours = now.diff(ref, 'hour');
    if (diffHours === 0) {
      const diffMinutes = Math.max(1, now.diff(ref, 'minute'));
      const form = ruPlural(diffMinutes, ['минуту', 'минуты', 'минут']);
      return diffMinutes === 1 ? `1 ${form} назад` : `${diffMinutes} ${form} назад`;
    }
    const form = ruPlural(diffHours, ['час', 'часа', 'часов']);
    return diffHours === 1 ? `1 ${form} назад` : `${diffHours} ${form} назад`;
  }

  if (diffDays === 1) return '1 день назад';
  if (diffDays < 7) {
    const form = ruPlural(diffDays, ['день', 'дня', 'дней']);
    return `${diffDays} ${form} назад`;
  }

  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    const form = ruPlural(weeks, ['неделю', 'недели', 'недель']);
    return `${weeks} ${form} назад`;
  }

  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    const form = ruPlural(months, ['месяц', 'месяца', 'месяцев']);
    return `${months} ${form} назад`;
  }

  const years = Math.floor(diffDays / 365);
  if (years <= 1) return 'Больше года назад';
  const form = ruPlural(years, ['год', 'года', 'лет']);
  return `${years} ${form} назад`;
}

/**
 * Форматирует длительность в человекопонятный вид (русский).
 * Пример: 90 -> "1 мин 30 с", 3600 -> "1 ч"
 */
export function formatDurationHuman(seconds?: number | null): string {
  if (seconds === undefined || seconds === null) return '—';
  const s = Number(seconds) || 0;
  if (s === 0) return '0 с';

  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const parts: string[] = [];
  if (h) parts.push(`${h} ч`);
  if (m) parts.push(`${m} мин`);
  if (sec) parts.push(`${sec} с`);
  return parts.join(' ');
}

export default dateToHumanReadable;
