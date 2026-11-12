// Lo que el inspector y la fila dibujan de las salidas (5.06): los chips «→ Embarcado · Embarcar» y las constantes de la URL de «Quitar». Puro.
import type { FaseParaConfigurar, FlujoParaConfigurar, TransicionParaConfigurar } from '../flujo'
import { salidasDe } from './formulario-de-salida'

// `?eliminar=salida&salida=<id>`: el diálogo de quitar una salida, sobre un inspector que ya ocupa `?fase=`.
export const CLAVE_ELIMINAR = 'eliminar'
export const PANEL_ELIMINAR_SALIDA = 'salida'
export const CLAVE_DE_LA_SALIDA_A_QUITAR = 'salida'
export const MOTIVO_DE_SALIDA_NO_DISPONIBLE = 'Esa salida ya no está en esta fase.'

// Cuántos chips lleva una fila: la lista completa está en el inspector.
export const CHIPS_POR_FILA = 3

export const ACCION_POR_OMISION = 'Mover'

export type ChipDeSalida = { id: string; texto: string; color: string; jubilada: boolean }

export type ChipsDeLaFila = { chips: ChipDeSalida[]; resto: number }

// «Embarcar → Embarcado» o, sin acción, «Mover → Embarcado».
export function descripcionDeSalida(salida: TransicionParaConfigurar, destino: string): string {
  return `${salida.accion ?? ACCION_POR_OMISION} → ${destino}`
}

export function nombreDelDestino(flujo: FlujoParaConfigurar, salida: TransicionParaConfigurar) {
  return flujo.fases.find((f) => f.id === salida.aFaseId)?.nombre ?? 'otra fase'
}

// Los chips de una fila: un chip por salida («→ Embarcado · Embarcar»; sin acción, «→ Embarcado»), con el color de la fase destino. Con más de
// `CHIPS_POR_FILA`, los primeros y cuántas faltan.
export function chipsDeLaFila(flujo: FlujoParaConfigurar, fase: FaseParaConfigurar): ChipsDeLaFila {
  const todos = salidasDe(flujo, fase.id).map((salida): ChipDeSalida => {
    const destino = flujo.fases.find((f) => f.id === salida.aFaseId)
    const nombre = destino?.nombre ?? 'otra fase'
    return {
      id: salida.id,
      texto: salida.accion ? `→ ${nombre} · ${salida.accion}` : `→ ${nombre}`,
      color: destino?.color ?? 'transparent',
      jubilada: destino ? !destino.activa : false,
    }
  })
  return {
    chips: todos.slice(0, CHIPS_POR_FILA),
    resto: Math.max(0, todos.length - CHIPS_POR_FILA),
  }
}
