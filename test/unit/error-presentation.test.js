import { expect } from 'chai';
import DefaultError from '../../src/js/entity/DefaultError.js';
import { gestionError } from '../../src/js/boundary/modelos/dashboard-presentation.js';

suite('Mensajes seguros de errores', () => {
  test('distingue sesión expirada, acceso denegado y servidor desconectado', () => {
    expect(gestionError({ status: 401 })).to.include('sesión');
    expect(gestionError({ status: 403 })).to.include('no permite');
    expect(gestionError({ type: 'connection' })).to.include('conectar');
    for (const error of [{ status: 401 }, { status: 403 }, { type: 'connection' }])
      expect(gestionError(error)).not.to.include('No hay consultas');
  });
  test('presenta estados HTTP sin divulgar el cuerpo del servidor', () => {
    for (const status of [400, 401, 403, 404, 409, 422, 500]) {
      const error = new DefaultError({
        type: 'http',
        code: 'HTTP_ERROR',
        status,
        message: 'interno',
        details: { mensaje: 'SQL contraseña token' },
        headers: { Authorization: 'secreto' },
      });
      expect(gestionError(error)).to.be.a('string').and.not.equal('');
      expect(gestionError(error)).not.to.match(/SQL|contraseña token/);
      expect(JSON.stringify(error)).not.to.match(/secreto|SQL/);
    }
  });
  test('no presenta cancelación como fallo de usuario ni errores JavaScript como texto público', () => {
    expect(gestionError({ code: 'CANCELLED' })).to.equal('');
    expect(gestionError(new Error('token privado'))).not.to.contain('token privado');
  });
});

import DefaultResponse from '../../src/js/entity/DefaultResponse.js';
import { fixtureService, rejection } from '../helpers/http-fixture.js';

suite('Límites de respuesta', () => {
  test('rechaza una respuesta de transporte inválida sin clasificarla como error de conexión', async () => {
    const error = await rejection(fixtureService(async () => null).findRange(0, 1));
    expect(error.code).to.equal('INVALID_RESPONSE');
    expect(error.type).to.equal('processing');
  });
  test('impide representar HTTP 500 como una respuesta exitosa', () => {
    expect(() => new DefaultResponse({ status: 500, datos: [] })).to.throw(DefaultError);
  });
});

suite('Errores de atención académica', () => {
  test('distingue errores de datos, del servidor y de red sin mostrar detalles internos', () => {
    expect(gestionError({ type: 'http', status: 422 })).to.include('Revisa el formulario');
    expect(gestionError({ type: 'http', status: 500 })).to.include('error interno');
    expect(gestionError({ type: 'connection' })).to.include('conexión');
  });
});
