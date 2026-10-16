export const siteName = import.meta.env.VITE_APP_NAME || 'Queue System';

// whole minutes for display; avg_serve_time is at least 60s, so 0 means nobody ahead
export function formatMinutes(min) {
  return String(Math.max(0, Math.round(min)));
}
