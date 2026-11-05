import { resultadoDeCrear, type ErrorDeCrear, type ResultadoDeCrear } from './guardado'

// Lo que vuelve de `cotizacion_guardar()` (4.15-3): lo de `cotizacion_crear()` (`resultadoDeCrear`: la respuesta tiene la misma forma, y los códigos de la hoja, los mismos) más
// tres casos propios, que se leen **antes**:
// - PT409 sin `details`: el conflicto de versión. Su mensaje (`_conflicto_de_edicion`) sólo nombra a una persona y cuándo, y es lo único de la base que se muestra.
// - 22023 `intento_reusado`: el mismo guardado con otros datos.
// - 22023 con `hint` `vehiculo` y sin `details`: el vehículo se compara antes que la versión (`cotizacion_guardar`); como la hoja no lo cambia, la cotización cambió de vehículo o
//   pasó a final. `resultadoDeCrear` lo leería como «Este origen pide un vehículo para guardar.», que engaña aquí.
// Un D2 (la fórmula o un tipo de cambio) no puede llegar de guardar: si llega, es «otro».
const LARGO_MAXIMO_DEL_MENSAJE = 300
const ESTE_CAMBIO = 'Esta cotización cambió.'

// Los tres casos propios de guardar, leídos del error antes que lo de crear; nulo si es otro.
function rechazoPropio(error: ErrorDeCrear): ResultadoDeCrear | null {
  const details = error.details || null
  const hint = error.hint || null
  if (error.code === 'PT409' && details === null) {
    const mensaje = error.message.trim().slice(0, LARGO_MAXIMO_DEL_MENSAJE)
    return { tipo: 'rechazo', motivo: 'version_cambiada', mensaje: mensaje || ESTE_CAMBIO }
  }
  if (error.code === '22023' && details === 'intento_reusado') {
    return { tipo: 'rechazo', motivo: 'guardado_reusado' }
  }
  if (error.code === '22023' && details === null && hint === 'vehiculo') {
    return { tipo: 'rechazo', motivo: 'cotizacion_cambio' }
  }
  return null
}

export function resultadoDeGuardar(respuesta: {
  data: unknown
  error: ErrorDeCrear | null
}): ResultadoDeCrear {
  const { error } = respuesta
  const propio = error?.code ? rechazoPropio(error) : null
  if (propio !== null) {
    return propio
  }
  const resultado = resultadoDeCrear(respuesta)
  const esUnD2 =
    resultado.tipo === 'rechazo' &&
    (resultado.motivo === 'desactualizada_formula' ||
      resultado.motivo === 'desactualizada_tipo_cambio')
  return esUnD2 ? { tipo: 'rechazo', motivo: 'otro' } : resultado
}
