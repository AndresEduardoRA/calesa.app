// Un rechazo de la base dicho en una frase corta de tú (6.04). La base manda el código en el `hint`; la frase es nuestra, salvo el conflicto, que trae el nombre de
// quien movió y se muestra tal cual.
import { MENSAJE_INESPERADO } from '@/shared/lib/errores'
import { faltaDeRequisito } from './requisitos'
import type { RequisitoVista } from './vista-previa'

export type RechazoDeMover = { codigo: string | null; motivo: string | null }

export type ContextoDelMotivo = {
  // Los bloqueantes sin cumplir de la vista previa de esa unidad, si se tienen.
  faltan?: readonly RequisitoVista[]
}

/** «Falta: BL aprobado, Contenedor.» */
export function textoDeLoQueFalta(faltan: readonly RequisitoVista[]): string {
  return `Falta: ${faltan.map(faltaDeRequisito).join(', ')}.`
}

// Una frase fija por código; `requisitos` y `conflicto` se arman con lo que trae la base.
const FRASE_POR_CODIGO: Record<string, string> = {
  rol: 'Tu rol no puede mover a esta fase.',
  transicion: 'Esta fase ya no es un destino posible. Recarga.',
  nota: 'Esta fase pide una nota interna.',
  acceso: 'Ya no tienes acceso a esta unidad.',
  unidad: 'Elige una unidad.',
}

function dePorFaltas(texto: string | null, faltan: readonly RequisitoVista[] | undefined): string {
  if (faltan && faltan.length > 0) return textoDeLoQueFalta(faltan)
  return texto ?? 'Faltan requisitos para entrar a esa fase.'
}

/** La frase para un rechazo de mover. Lo no conocido: el texto de la base si se puede leer, o el genérico. */
export function motivoLegible(
  { codigo, motivo }: RechazoDeMover,
  contexto: ContextoDelMotivo = {},
): string {
  const texto = (motivo ?? '').trim() || null
  if (codigo === 'requisitos') return dePorFaltas(texto, contexto.faltan)
  if (codigo === 'conflicto') return texto ?? 'Otra persona movió esta unidad mientras la veías.'
  const fija = codigo === null ? undefined : FRASE_POR_CODIGO[codigo]
  return fija ?? texto ?? MENSAJE_INESPERADO
}
