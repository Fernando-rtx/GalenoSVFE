import { expect } from 'chai';
import sinon from 'sinon';
import OrdenControl from '../../src/js/control/OrdenControl.js';
import { DefaultResponse } from '../../src/js/index.js';
const response=datos=>new DefaultResponse({datos,status:200,totalDatos:datos.length});
const step={idConsultaProcedimientoPaso:'paso-sintetico'};
const order={idOrdenExamen:'orden-sintetica'};
describe('Órdenes y resultados — coordinación unitaria sintética',()=>{
 let control,ordenDAO,resultadoDAO;
 beforeEach(()=>{
  ordenDAO={findRange:sinon.stub().resolves(response([])),create:sinon.stub().resolves(response([]))};
  resultadoDAO={findRange:sinon.stub().resolves(response([])),create:sinon.stub().resolves(response([]))};
  const dashboard={subscribe:fn=>{fn({idClinica:'clinica-sintetica',idConsulta:'consulta-sintetica'});return()=>{};}};
  control=new OrdenControl({ordenDAO,resultadoDAO,dashboard,contexto:{puedeEscribir:true}});
 });
 afterEach(()=>control.destroy());
 it('no permite editar filas de órdenes anteriores mientras carga resultados de otro padre',async()=>{
  control.set({paso:step,rows:[order]});let finish;
  resultadoDAO.findRange.returns(new Promise(resolve=>{finish=resolve;}));
  const pending=control.results(order);expect(control.state.rows).to.deep.equal([]);
  expect(resultadoDAO.findRange.firstCall.args[2].query).to.deep.equal({idClinica:'clinica-sintetica',idOrden:'orden-sintetica'});
  finish(response([{idExamenResultado:'resultado-sintetico'}]));await pending;
  expect(control.state.rows[0].idExamenResultado).to.equal('resultado-sintetico');
 });
 it('un fallo de persistencia conserva el formulario y no comunica éxito',async()=>{
  control.set({paso:step});control.edit();const error=new Error('Fallo sintético');ordenDAO.create.rejects(error);
  await control.save({indicaciones:'Prueba'});
  expect(control.state.editor).not.to.equal(null);expect(control.state.error).to.equal(error);expect(control.state.message).to.equal('');sinon.assert.notCalled(ordenDAO.findRange);
 });
 it('la sesión lectora no crea órdenes aunque invoque directamente el Control',async()=>{
  control.contexto={puedeEscribir:false};control.set({paso:step});control.edit();await control.save({indicaciones:'Prueba'});
  expect(control.state.editor).to.equal(null);sinon.assert.notCalled(ordenDAO.create);
 });
});
