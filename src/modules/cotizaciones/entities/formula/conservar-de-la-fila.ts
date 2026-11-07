// Lo que una fila conserva de la vieja al recompilarse, y lo que suelta (4.21-1, C5): la raíz que compila `compilarExpresion()` lleva el `texto` y,
// de la fila vieja, lo que el destino del compilador no lleva. Puro.
import type { Nodo } from '../nodos'

// Los campos propios de la operación o del tipo: los reemplaza el texto y nunca se dicen «soltados».
const ESTRUCTURALES = new Set([
  'op',
  'de',
  'pct',
  'n',
  'tabla',
  'sobre',
  'columna',
  'match',
  'clave',
  'campo',
  'opciones',
  'por_defecto',
])
const esSi = (n: Nodo) => n.tipo === 'calculo' && n.op === 'si'
const sePierde = (v: unknown) => v !== undefined && v !== false

// `seccion` y `color`, siempre (los admite todo tipo); `sobrescribible`, si la nueva es un cálculo; `condicion` sólo como interruptor: en un SI (el
// viejo o el nuevo) es la bandera y la decide el texto, nunca pasa de interruptor a bandera ni al revés.
function conservados(raiz: Nodo, v: Record<string, unknown>, viejo: Nodo): Record<string, unknown> {
  const dejar: Record<string, unknown> = {}
  for (const k of ['seccion', 'color']) if (v[k] !== undefined) dejar[k] = v[k]
  if (raiz.tipo === 'calculo' && v['sobrescribible'] !== undefined)
    dejar['sobrescribible'] = v['sobrescribible']
  if (!esSi(raiz) && !esSi(viejo) && v['condicion'] !== undefined)
    dejar['condicion'] = v['condicion']
  return dejar
}

// Lo que la fila tenía y la nueva no lleva: un interruptor que un SI nuevo reemplaza por su bandera, y todo campo que ya no está. La bandera de un SI
// viejo no es un soltado (el texto nuevo la quitó).
function soltadosDe(
  raiz: Nodo,
  nodo: Record<string, unknown>,
  v: Record<string, unknown>,
  viejo: Nodo,
): string[] {
  const soltados: string[] = []
  if (esSi(raiz) && !esSi(viejo) && v['condicion'] !== undefined) soltados.push('condicion')
  for (const k of Object.keys(v)) {
    const sigue = k in nodo || k === 'id' || k === 'tipo' || ESTRUCTURALES.has(k)
    if (sigue || (k === 'condicion' && esSi(viejo))) continue
    if (sePierde(v[k])) soltados.push(k)
  }
  return soltados
}

export function conservar(
  raiz: Nodo,
  viejo: Nodo | null,
  texto: string,
): { nodo: Nodo; soltados: string[] } {
  const base: Record<string, unknown> = { ...raiz, texto }
  if (viejo === null) return { nodo: base as Nodo, soltados: [] }
  const v = viejo as Record<string, unknown>
  const nodo = { ...base, ...conservados(raiz, v, viejo) }
  return { nodo: nodo as Nodo, soltados: soltadosDe(raiz, nodo, v, viejo) }
}
