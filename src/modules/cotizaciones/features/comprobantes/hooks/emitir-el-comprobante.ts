import { enviarAccion } from '@/shared/lib/enviar-accion'
import { MENSAJE_SIN_CONEXION, MENSAJE_SIN_RESPUESTA, type ErrorApp } from '@/shared/lib/errores'
import { avisarExito } from '@/shared/ui/toasts'
import { numeroDeComprobante } from '../../../entities/comprobantes/comprobante'
import { emitirComprobante } from '../actions/emitir'

// Emitir el comprobante desde la guardada (4.26-2), como marcar final: llama a la action directo, sin `useAction` (el JS en frío de la guardada está al tope).
// Cuando entra, la página se vuelve a dibujar sin el botón y el diálogo se desmonta: por eso todo pasa acá, antes de volver, en este orden: (1) cierra la URL,
// (2) avisa con el número que puso la base y (3) vuelve. El refresco ya llegó con la respuesta (`revalidatePath`).

export type FalloDeEmitir = { error: ErrorApp; recargar: boolean }

const NO_SE_EMITIO = 'No se pudo emitir el comprobante.'
const NO_SABEMOS = 'No sabemos si se emitió: recarga para verlo.'
const SIN_LLEGAR = new Set([MENSAJE_SIN_CONEXION, MENSAJE_SIN_RESPUESTA])

// Lo que se dice dentro del diálogo, con el texto de la base. La versión que cambió, un vigente colado o una final que dejó de ser activa piden recargar; un error
// que no sabemos si entró, también; uno que no llegó al servidor, no.
function falloDe(error: ErrorApp, sinRed: boolean): FalloDeEmitir {
  if (error.codigo === 'conflicto' || error.codigo === 'regla') {
    return { error, recargar: true }
  }
  if (error.codigo === 'inesperado' && !sinRed && !SIN_LLEGAR.has(error.mensaje)) {
    return { error: { codigo: 'inesperado', mensaje: NO_SABEMOS }, recargar: true }
  }
  return { error, recargar: false }
}

// Devuelve nulo si entró (ya cerró la URL y avisó), o lo que hay que decir adentro.
export async function emitirElComprobante(pedido: {
  cotizacionId: string
  actualizadoEn: string
  cerrar: () => void
}): Promise<FalloDeEmitir | null> {
  const resultado = await enviarAccion(
    emitirComprobante({
      cotizacionId: pedido.cotizacionId,
      cotizacionEsperada: pedido.actualizadoEn,
    }),
    NO_SE_EMITIO,
  )
  if (!resultado.ok) {
    return falloDe(resultado.error, 'sinRed' in resultado)
  }
  pedido.cerrar()
  avisarExito(
    `Emitiste el comprobante ${numeroDeComprobante(resultado.data.serie, resultado.data.numero)}.`,
  )
  return null
}
