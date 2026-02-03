// Helpers to keep time-entry editing/creation consistent across timezones.
//
// The app stores timestamps in the backend as ISO instants (UTC). When an admin types a local
// time (e.g. 11:13 in Spain), we must convert that local time to a UTC instant before saving.
// Otherwise, displaying with the browser's timezone will appear shifted (+1h/+2h).

export function buildUtcIsoFromLocalDateAndTime(dateYYYYMMDD: string, timeHHMM: string): string {
  const [year, month, day] = dateYYYYMMDD.split('-').map((v) => Number(v));
  const [hour, minute] = timeHHMM.split(':').map((v) => Number(v));

  const local = new Date(year, (month || 1) - 1, day || 1, hour || 0, minute || 0, 0, 0);
  if (Number.isNaN(local.getTime())) {
    throw new Error(`Invalid date/time: ${dateYYYYMMDD} ${timeHHMM}`);
  }

  return local.toISOString();
}

// For <input type="time"> values we want the LOCAL HH:MM representation of an ISO timestamp.
export function getLocalTimeHHMMFromIso(isoString: string | null): string {
  if (!isoString) return '';

  const d = new Date(isoString);
  if (!Number.isNaN(d.getTime())) {
    return d.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }

  // Fallback for unexpected formats
  const match = isoString.match(/T(\d{2}:\d{2})/);
  return match?.[1] ?? '';
}
