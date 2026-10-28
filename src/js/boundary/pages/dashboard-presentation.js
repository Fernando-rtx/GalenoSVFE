// La tabla, el detalle y las tarjetas comparten el mismo formato UTC.
export { formatUtcDate as formatDate } from '../format-utc-date.js';

export function consultaCardModel(consulta) {
  const { idConsulta, personaNombre, rolNombre, clinicaNombre, fechaInicio, fechaFin } = consulta;
  return { idConsulta, personaNombre, rolNombre, clinicaNombre, fechaInicio, fechaFin };
}

export function errorMessage(error) {
  if (error.code === 'BASE_URL_REQUIRED' || error.code === 'INVALID_CONFIG') return 'La conexión al servidor aún no está configurada.';
  if (error.code === 'TIMEOUT') return 'El servidor tardó demasiado. Intenta nuevamente.';
  if (error.code === 'CANCELLED') return 'La solicitud se canceló. Puedes volver a cargar los datos.';
  if (error.type === 'connection') return 'No se pudo conectar con el servidor. Revisa la conexión y vuelve a intentar.';
  if (error.type === 'validation') return 'Revisa los filtros, la clínica y la consulta seleccionada.';
  if (error.type === 'processing') return 'La respuesta del servidor no tiene el formato esperado.';
  if (error.status === 404) return 'El registro no está disponible en la clínica seleccionada.';
  if (error.status === 403) return 'El servidor no permite esta solicitud.';
  if (error.status === 422) return 'El servidor rechazó los parámetros. Revisa los filtros y el tamaño de página.';
  return 'No se pudieron cargar los datos. Intenta nuevamente.';
}
