// Cuándo se purga lo que está en la papelera de cotizaciones (4.24-2): el job la vacía cuando vence `creado_en + papelera_dias` del lote. Y lo que dice
// el diálogo de purgarla antes (4.24-2b): nombra lo que se borra y, si es un lote de varios, pide tipear.
import type { LoteDeCotizaciones } from './lotes'

const UN_DIA = 86_400_000

// Días enteros que faltan; cero = ya venció y lo toma la próxima pasada del job.
export function diasParaLaPurga(purgaEl: string, ahora: string): number {
  const faltan = (new Date(purgaEl).getTime() - new Date(ahora).getTime()) / UN_DIA
  return faltan > 0 ? Math.ceil(faltan) : 0
}

export function textoDePurga(dias: number): string {
  if (dias <= 0) {
    return 'Se purga en la próxima pasada'
  }
  return dias === 1 ? 'Se purga mañana' : `Se purga en ${String(dias)} días`
}

// Lo que hay que tipear para purgar un lote de varios: ata la confirmación a su tamaño.
export function palabraDePurga(cantidad: number): string {
  return `purgar ${String(cantidad)}`
}

export type TextosDeLaPurga = {
  titulo: string
  descripcion: string
  etiqueta: string
  // Sin palabra, se confirma con el botón (una sola).
  palabra: string | undefined
}

// Cuántos títulos se dicen antes de resumir el resto.
const TITULOS_A_LA_VISTA = 5

const LO_QUE_SE_VA = 'con sus revisiones, comentarios y adjuntos'
const SIN_VUELTA = 'No se puede deshacer ni restaurar.'

// Qué se purga, dicho con títulos: el diálogo de lo irreversible nombra el objeto. Un lote de varios se cuenta entero (`enPapelera`) aunque se vean sus
// primeras; los títulos, de las que se ven.
export function textosDeLaPurga(objetivo: {
  lote: Pick<LoteDeCotizaciones, 'enPapelera' | 'cotizaciones'>
  cotizacionId?: string | undefined
}): TextosDeLaPurga {
  const { lote, cotizacionId } = objetivo
  const una = cotizacionId ? lote.cotizaciones.find((c) => c.id === cotizacionId) : undefined
  const cuales = una ? [una] : lote.cotizaciones
  const cuantas = una ? 1 : lote.enPapelera
  const [primera] = cuales
  if (cuantas <= 1 && primera) {
    return {
      titulo: `Purgar «${primera.titulo}»`,
      descripcion: `Se borra para siempre, ${LO_QUE_SE_VA}. ${SIN_VUELTA}`,
      etiqueta: 'Purgar',
      palabra: undefined,
    }
  }
  const titulos = cuales.slice(0, TITULOS_A_LA_VISTA).map((c) => `«${c.titulo}»`)
  const resto = cuantas - titulos.length
  return {
    titulo: `Purgar el lote de ${String(cuantas)}`,
    descripcion: `Se borran para siempre, ${LO_QUE_SE_VA}: ${titulos.join(', ')}${resto > 0 ? ` y ${String(resto)} más` : ''}. ${SIN_VUELTA}`,
    etiqueta: `Purgar las ${String(cuantas)}`,
    palabra: palabraDePurga(cuantas),
  }
}
