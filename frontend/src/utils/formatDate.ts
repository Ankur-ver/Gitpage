import { formatDistanceToNow, format, isValid, parseISO } from 'date-fns';

export const timeAgo = (date: string | Date): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(d)) return 'unknown';
  return formatDistanceToNow(d, { addSuffix: true });
};

export const formatDate = (date: string | Date, fmt = 'MMM d, yyyy'): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(d)) return 'unknown';
  return format(d, fmt);
};

export const formatDateTime = (date: string | Date): string =>
  formatDate(date, 'MMM d, yyyy HH:mm');