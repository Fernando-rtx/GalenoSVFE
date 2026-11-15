/** Proyección de enlaces persistidos: no deduce secuencias por fechas o índices. */
export function arbolHistorial(group) {
  const nodes = new Map();
  for (const step of group.pasos || []) {
    if (!['COMPLETADO', 'RETROCEDIDO'].includes(step.estado)) continue;
    const id = step.idPaso || `ejecucion-${step.idConsultaProcedimientoPaso}`;
    if (!nodes.has(id)) nodes.set(id, { id, nombre: step.nombre, ejecuciones: [], children: [] });
    nodes.get(id).ejecuciones.push(step);
  }
  const incoming = new Set();
  const edges = new Set();
  for (const edge of group.secuencias || []) {
    if (!nodes.has(edge.idPasoOrigen) || !nodes.has(edge.idPasoDestino)) continue;
    const key = `${edge.idPasoOrigen}/${edge.idPasoDestino}/${edge.tipoSecuencia}`;
    if (edges.has(key)) continue;
    edges.add(key);
    nodes.get(edge.idPasoOrigen).children.push(edge);
    incoming.add(edge.idPasoDestino);
  }
  const visited = new Set();
  function visit(id, path = new Set(), relation = null) {
    const node = nodes.get(id);
    if (visited.has(id))
      return { id, nombre: node.nombre, referencia: true, ciclo: path.has(id), relation };
    visited.add(id);
    const next = new Set(path).add(id);
    return {
      ...node,
      relation,
      ejecuciones: [...node.ejecuciones].sort((a, b) =>
        (a.fechaInicio || '').localeCompare(b.fechaInicio || ''),
      ),
      children: node.children.map((edge) => visit(edge.idPasoDestino, next, edge.tipoSecuencia)),
    };
  }
  const roots = [...nodes.keys()].filter((id) => !incoming.has(id)).map((id) => visit(id));
  // Si el catálogo tiene un ciclo o referencias incompletas se conservan los registros,
  // con el enlace señalado; no se crea una cadena clínica alternativa.
  for (const id of nodes.keys()) if (!visited.has(id)) roots.push(visit(id));
  return roots;
}
