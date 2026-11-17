import { expect } from 'chai';
import { normalizarFechaNacimiento } from '../../src/js/control/fecha-nacimiento.js';
const hoy = '2026-11-17';
suite('Fecha de nacimiento escrita a mano', () => {
  test('convierte DD/MM/AAAA sin depender del formato de Safari', () => {
    expect(normalizarFechaNacimiento('05/09/1998', hoy)).to.equal('1998-09-05');
  });
  test('acepta el día bisiesto del año 2000 y rechaza el de 1900', () => {
    expect(normalizarFechaNacimiento('29/02/2000', hoy)).to.equal('2000-02-29');
    expect(() => normalizarFechaNacimiento('29/02/1900', hoy)).to.throw('no existe');
  });
  test('rechaza días y meses inexistentes en lugar de normalizarlos', () => {
    expect(() => normalizarFechaNacimiento('31/04/2000', hoy)).to.throw('no existe');
    expect(() => normalizarFechaNacimiento('10/13/2000', hoy)).to.throw('no existe');
  });
  test('rechaza texto parcial o un formato distinto del indicado', () => {
    expect(() => normalizarFechaNacimiento('17/11/', hoy)).to.throw('DD/MM/AAAA');
    expect(() => normalizarFechaNacimiento('2000-01-01', hoy)).to.throw('DD/MM/AAAA');
  });
  test('respeta el mínimo y la fecha actual exigidos por el backend', () => {
    expect(() => normalizarFechaNacimiento('31/12/1899', hoy)).to.throw('01/01/1900');
    expect(normalizarFechaNacimiento('01/01/1900', hoy)).to.equal('1900-01-01');
    expect(normalizarFechaNacimiento('17/11/2026', hoy)).to.equal(hoy);
    expect(() => normalizarFechaNacimiento('18/11/2026', hoy)).to.throw('futura');
  });
  test('informa que falta una fecha obligatoria', () => {
    expect(() => normalizarFechaNacimiento('', hoy)).to.throw('Escribe la fecha');
  });
});
