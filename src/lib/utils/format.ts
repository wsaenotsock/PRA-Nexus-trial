/**
 * Formats millisecond durations into human readable units (ms, s, m, h)
 */
export function formatDuration(ms: number): string {
  if (ms === undefined || ms === null || isNaN(ms)) return '-';
  
  if (ms < 1000) {
    return `${ms.toFixed(1)} ms`;
  }
  
  const totalSeconds = ms / 1000;
  if (totalSeconds < 60) {
    return `${totalSeconds.toFixed(2)} s`;
  }
  
  const totalMinutes = totalSeconds / 60;
  if (totalMinutes < 60) {
    const m = Math.floor(totalMinutes);
    const s = (totalSeconds % 60).toFixed(1);
    return `${m}m ${s}s`;
  }
  
  const h = Math.floor(totalMinutes / 60);
  const m = Math.floor(totalMinutes % 60);
  const s = Math.floor(totalSeconds % 60);
  return `${h}h ${m}m ${s}s`;
}
