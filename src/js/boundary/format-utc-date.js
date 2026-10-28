const formatter = new Intl.DateTimeFormat('es-SV', {
  dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC'
});

export function formatUtcDate(value) {
  if (value == null || value === '') return 'Sin especificar';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Sin especificar' : `${formatter.format(date)} UTC`;
}
