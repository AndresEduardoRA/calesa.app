import type { AccionesDeUnAviso } from '@/shared/lib/acciones-del-aviso'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { MENSAJE_SIN_CONEXION, MENSAJE_SIN_RESPUESTA, type ErrorApp } from '@/shared/lib/errores'
import { avisarConDeshacer, avisarError, avisarExito } from '@/shared/ui/toasts'
import type { CotizacionAprobable, ResultadoDeAprobar } from '../../../entities/aprobada/tipos'
import { aprobarCotizacion } from '../actions/aprobar'

// Aprobar desde la guardada. Llama a la action directo, sin `useAction` (el JS en frío de la guardada está al tope: `e2e/presupuesto-js.spec.ts`) y sin refrescar la
// página (remontaría lo tipeado en la hoja): quien llama aplica lo devuelto con `alCambiar`. Es reversible: se aprueba de una y el aviso ofrece «Deshacer» 10 s, que
// aprueba la anterior con la versión que devolvió la base.

const NO_SE_APROBO = 'No se pudo aprobar la cotización.'
const SIN_RED = 'Sin conexión: no se aprobó. Reintenta cuando vuelva.'
const NO_SABEMOS = 'No sabemos si se aprobó: recarga para verlo.'
const SIN_LLEGAR = new Set([MENSAJE_SIN_CONEXION, MENSAJE_SIN_RESPUESTA])
const RECARGAR: AccionesDeUnAviso = {
  acciones: [{ tipo: 'recargar', etiqueta: 'Recargar' }],
  pedido: null,
}

export type PedidoDeAprobar = {
  id: string
  numero: number
  actualizadoEn: string
  // La cotización pasó a ser la aprobada (`true`) o dejó de serlo por «Deshacer» (`false`).
  alCambiar: (aprobada: boolean) => void
}

// Lo que se dice: el texto de la base si lo escribió para la persona; si no llegó al servidor, que no se aprobó; si llegó y no sabemos cómo terminó, que recargue.
function falloDe(error: ErrorApp, sinRed: boolean): { error: ErrorApp; recargar: boolean } {
  if (error.codigo === 'conflicto') {
    return { error, recargar: true }
  }
  if (sinRed || (error.codigo === 'inesperado' && SIN_LLEGAR.has(error.mensaje))) {
    return { error: { codigo: 'inesperado', mensaje: SIN_RED }, recargar: false }
  }
  if (error.codigo === 'inesperado') {
    return { error: { codigo: 'inesperado', mensaje: NO_SABEMOS }, recargar: true }
  }
  return { error, recargar: false }
}

async function enviar(id: string, actualizadoEn: string) {
  const resultado = await enviarAccion<ResultadoDeAprobar>(
    aprobarCotizacion({ id, actualizadoEn }),
    NO_SE_APROBO,
  )
  if (resultado.ok) {
    return resultado.data
  }
  const { error, recargar } = falloDe(resultado.error, 'sinRed' in resultado)
  avisarError(error, recargar ? { acciones: RECARGAR } : {})
  return null
}

async function deshacer(anterior: CotizacionAprobable, alCambiar: (aprobada: boolean) => void) {
  if ((await enviar(anterior.id, anterior.actualizadoEn)) === null) {
    return
  }
  alCambiar(false)
  avisarExito(`Volvió a ser la aprobada la n.º ${String(anterior.numero)}.`)
}

// Devuelve cuando terminó (entró o se dijo por qué no); nunca lanza.
export async function aprobarLaCotizacion(pedido: PedidoDeAprobar): Promise<void> {
  const resultado = await enviar(pedido.id, pedido.actualizadoEn)
  if (resultado === null) {
    return
  }
  pedido.alCambiar(true)
  const dicho = `La n.º ${String(pedido.numero)} es la aprobada del vehículo.`
  const { anterior } = resultado
  if (anterior === null) {
    avisarExito(dicho)
    return
  }
  avisarConDeshacer(dicho, () => {
    void deshacer(anterior, pedido.alCambiar)
  })
}
