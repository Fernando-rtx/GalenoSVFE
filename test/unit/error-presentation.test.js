import { expect } from 'chai';
import DefaultError from '../../src/js/entity/DefaultError.js';
import { gestionError } from '../../src/js/boundary/modelos/dashboard-presentation.js';

describe('Mensajes seguros de errores', () => {
  it('presenta estados HTTP sin divulgar el cuerpo del servidor', () => {
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
  it('no presenta cancelación como fallo de usuario ni errores JavaScript como texto público', () => {
    expect(gestionError({ code: 'CANCELLED' })).to.equal('');
    expect(gestionError(new Error('token privado'))).not.to.contain('token privado');
  });
});

import DefaultResponse from '../../src/js/entity/DefaultResponse.js';
import { fixtureService, rejection } from '../helpers/http-fixture.js';

describe('Límites de respuesta', () => {
  it('rechaza una respuesta de transporte inválida sin clasificarla como error de conexión', async () => {
    const error = await rejection(fixtureService(async () => null).findRange(0, 1));
    expect(error.code).to.equal('INVALID_RESPONSE');
    expect(error.type).to.equal('processing');
  });
  it('impide representar HTTP 500 como una respuesta exitosa', () => {
    expect(() => new DefaultResponse({ status: 500, datos: [] })).to.throw(DefaultError);
  });
});

describe('Errores de atención académica', () => {
  it('distingue errores de datos, del servidor y de red sin mostrar detalles internos', () => {
    expect(gestionError({ type: 'http', status: 422 })).to.include('Revisa el formulario');
    expect(gestionError({ type: 'http', status: 500 })).to.include('error interno');
    expect(gestionError({ type: 'connection' })).to.include('conexión');
  });
});
