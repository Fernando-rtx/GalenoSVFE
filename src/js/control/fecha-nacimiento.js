import DefaultError from '../entity/DefaultError.js';
import { isCalendarDate } from './rest-validators.js';
import { fechaClinica } from './AcademicCareControl.js';

/** Fecha escrita en español; no permite la normalización silenciosa de Date. */
export function normalizarFechaNacimiento(value, hoy = fechaClinica()) {
  const text = String(value ?? '').trim();
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  let error;
  if (!text) error = 'Escribe la fecha de nacimiento en formato DD/MM/AAAA.';
  else if (!match) error = 'Usa el formato DD/MM/AAAA, por ejemplo 05/09/1998.';
  const date = match ? `${match[3]}-${match[2]}-${match[1]}` : null;
  if (!error && !isCalendarDate(date)) error = 'La fecha de nacimiento no existe. Revisa el día, mes y año.';
  if (!error && date < '1900-01-01') error = 'La fecha de nacimiento debe ser desde el 01/01/1900.';
  if (!error && date > hoy) error = 'La fecha de nacimiento no puede ser futura.';
  if (error) throw DefaultError.validation(error, 'INVALID_BIRTH_DATE');
  return date;
}
