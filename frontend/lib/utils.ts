import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format pace in seconds per km to MM:SS format
 * @param paceSeconds - Pace in seconds per kilometer
 * @returns Formatted pace string (e.g., "5:30/km")
 */
export function formatPace(paceSeconds: number): string {
  if (!paceSeconds || paceSeconds <= 0) return '-';

  const minutes = Math.floor(paceSeconds / 60);
  const seconds = Math.round(paceSeconds % 60);

  return `${minutes}:${seconds.toString().padStart(2, '0')}/km`;
}
