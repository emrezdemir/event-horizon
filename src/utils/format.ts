export function timeAgo(ms: number | null | undefined): string {
  if (ms == null) return '';
  const diff = Date.now() - ms;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'şimdi';
  if (m < 60) return `${m} dk`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} sa`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} gün`;
  const date = new Date(ms);
  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}

export function formatDate(ms: number | null | undefined): string {
  if (ms == null) return '';
  return new Date(ms).toLocaleString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
