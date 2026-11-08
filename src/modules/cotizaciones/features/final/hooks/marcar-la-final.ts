import { enviarAccion } from '@/shared/lib/enviar-accion'
import { MENSAJE_SIN_CONEXION, MENSAJE_SIN_RESPUESTA, type ErrorApp } from '@/shared/lib/errores'
import { avisarExito } from '@/shared/ui/toasts'
import { marcarFinal } from '../actions/marcar-final'

// Marcar final desde la guardada (4.25-2). Llama a la action directo, sin `useAction` (el diálogo lleva su «en curso»): el JS en frío de la guardada está al
// tope. Cuando entra, la página se vuelve a dibujar sin el botón y el diálogo se desmonta: por eso todo lo que sigue pasa acá, antes de volver, y en este
// orden: (1) cierra la URL, (2) avisa (el `<Toaster>` vive en el layout) y (3) vuelve. El refresco ya llegó con la respuesta (`revalidatePath`).

export type FalloDeMarcar = { error: ErrorApp; recargar: boolean }

const NO_SE_MARCO = 'No se pudo marcar la final.'
const OTRA_FINAL = 'Otra cotización de este vehículo ya es la final. Recarga para verla.'
const NO_SABEMOS = 'No sabemos si se marcó: recarga para verlo.'
const SIN_LLEGAR = new Set([MENSAJE_SIN_CONEXION, MENSAJE_SIN_RESPUESTA])

// Lo que se dice dentro del diálogo. El 23505 del índice (otra final se confirmó mientras se marcaba) no trae texto legible: se traduce acá. Un error que no
// sabemos si entró pide recargar; uno que no llegó al servidor, no.
function falloDe(error: ErrorApp, sinRed: boolean): FalloDeMarcar {
  if (error.codigo === 'conflicto') {
    return { error, recargar: true }
  }
  if (error.codigo === 'duplicado') {
    return { error: { codigo: 'duplicado', mensaje: OTRA_FINAL }, recargar: true }
  }
  if (error.codigo === 'inesperado' && !sinRed && !SIN_LLEGAR.has(error.mensaje)) {
    return { error: { codigo: 'inesperado', mensaje: NO_SABEMOS }, recargar: true }
  }
  return { error, recargar: false }
}

// Devuelve nulo si entró (ya cerró la URL y avisó), o lo que hay que decir adentro.
export async function marcarLaFinal(pedido: {
  id: string
  numero: number
  cerrar: () => void
}): Promise<FalloDeMarcar | null> {
  const resultado = await enviarAccion<null>(marcarFinal({ id: pedido.id }), NO_SE_MARCO)
  if (!resultado.ok) {
    return falloDe(resultado.error, 'sinRed' in resultado)
  }
  pedido.cerrar()
  avisarExito(
    `Marcaste la n.º ${String(pedido.numero)} como final. Si el vehículo tenía otras, están en tu papelera.`,
  )
  return null
}
