import { expect } from 'chai';
import { translate } from '../../src/js/boundary/language.js';

describe('Idioma de la interfaz', () => {
  it('conserva el español y traduce etiquetas en inglés', () => {
    expect(translate('Bandeja de consultas', 'es')).to.equal('Bandeja de consultas');
    expect(translate('Bandeja de consultas', 'en')).to.equal('Consultation inbox');
  });
  it('conserva nombres, documentos y contenido ajeno al diccionario', () => {
    for (const value of ['Carlos Martínez', 'Clínica Central GalenosSV', '01234567-8', 'Consulta médica general']) {
      expect(translate(value, 'en')).to.equal(value);
    }
  });
  it('traduce los prefijos sin alterar los valores del registro', () => {
    expect(translate('Paciente: Ana Rodríguez · Rol: Doctor', 'en')).to.equal('Patient: Ana Rodríguez · Role: Doctor');
    expect(translate('Ver detalle de Ana Rodríguez', 'en')).to.equal('View details for Ana Rodríguez');
  });
  it('mantiene los totales y el rango del mensaje de citas', () => {
    expect(translate('23 citas encontradas. Mostrando 21 a 23.', 'en')).to.equal('23 appointments found. Showing 21 to 23.');
    expect(translate('1–7 de 7 consultas', 'en')).to.equal('1–7 of 7 consultations');
  });
  it('traduce los errores públicos de identificación y validación', () => {
    expect(translate('Persona no encontrada', 'en')).to.equal('Person not found');
    expect(translate('Completa este campo obligatorio.', 'en')).to.equal('Complete this required field.');
  });
});
