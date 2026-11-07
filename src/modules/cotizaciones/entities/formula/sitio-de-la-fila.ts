// Dónde va la fila que se compila (4.21-1, C3): la que ya existe, o una nueva tras otra fila (o al principio). Puro.
import type { Formula } from '../formula'
import { esquemaId } from '../nodos'
import type { Nodo } from '../nodos'
import type { Fila } from './filas'

export type DestinoDeLaFila =
  { existente: string } | { id: string; etiqueta: string; despuesDe: string | null }

export type ErrorDeSitio = {
  codigo: 'fila_inexistente' | 'id_invalido' | 'id_ocupado' | 'tipo_no_editable'
  mensaje: string
}

// `desde`..`hasta` son los lugares de `definicion.nodos` que la fila ocupa hoy (sus auxiliares y su raíz; vacío si es nueva); `destino` es lo que el
// compilador no lleva en el texto y la fila conserva.
export type Sitio = {
  fila: Fila | null
  viejo: Nodo | null
  desde: number
  hasta: number
  destino: Record<string, unknown>
}

const CON_DESTINO = ['formato', 'descripcion', 'grupo', 'salida', 'bucket', 'solo_en']

function deLaExistente(filas: readonly Fila[], id: string): Sitio | ErrorDeSitio {
  const fila = filas.find((f) => f.nodo.id === id)
  if (fila === undefined)
    return { codigo: 'fila_inexistente', mensaje: `La fila «${id}» no existe.` }
  // Sólo una constante o un cálculo se escribe como texto: volver otra cosa (una bandera que un SI nombra) rompería la fórmula lejos de donde se escribió.
  if (fila.nodo.tipo !== 'constante' && fila.nodo.tipo !== 'calculo')
    return {
      codigo: 'tipo_no_editable',
      mensaje: `La fila «${fila.nodo.etiqueta}» no se escribe como texto: no es un cálculo ni una constante.`,
    }
  const o = fila.nodo as Record<string, unknown>
  const destino: Record<string, unknown> = { id, etiqueta: fila.nodo.etiqueta }
  for (const k of CON_DESTINO) if (o[k] !== undefined) destino[k] = o[k]
  return { fila, viejo: fila.nodo, desde: fila.desde, hasta: fila.posicion + 1, destino }
}

function deLaNueva(
  formula: Formula,
  filas: readonly Fila[],
  d: { id: string; etiqueta: string; despuesDe: string | null },
): Sitio | ErrorDeSitio {
  if (!esquemaId.safeParse(d.id).success)
    return { codigo: 'id_invalido', mensaje: `«${d.id}» no es un nombre válido para una fila.` }
  if (
    formula.definicion.nodos.some((n) => n.id === d.id) ||
    Object.hasOwn(formula.params.constantes, d.id)
  )
    return { codigo: 'id_ocupado', mensaje: `Ya hay una fila llamada «${d.id}».` }
  const tras = d.despuesDe === null ? null : filas.find((f) => f.nodo.id === d.despuesDe)
  if (tras === undefined)
    return { codigo: 'fila_inexistente', mensaje: `La fila «${d.despuesDe ?? ''}» no existe.` }
  const en = tras === null ? 0 : tras.posicion + 1
  return {
    fila: null,
    viejo: null,
    desde: en,
    hasta: en,
    destino: { id: d.id, etiqueta: d.etiqueta },
  }
}

export function sitioDe(
  formula: Formula,
  filas: readonly Fila[],
  destino: DestinoDeLaFila,
): Sitio | ErrorDeSitio {
  return 'existente' in destino
    ? deLaExistente(filas, destino.existente)
    : deLaNueva(formula, filas, destino)
}
