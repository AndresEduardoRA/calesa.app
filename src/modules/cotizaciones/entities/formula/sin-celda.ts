// Lo que el diseño de la hoja no muestra (4.21-3b-1, C6; P1: guardar y avisar): `validar_diseno()` pide una celda a todo input, constante y opción (§5), también a
// las auxiliares de un número escrito en un texto, y publicar rechaza la que falta con `nodo_sin_seccion`. Guardar no la rechaza (sólo mira la forma del diseño):
// el editor avisa antes y después de guardar qué filas tendrá que mostrar el diseño. No reemplaza a `validarDiseno()` —no mira tonos ni niveles— y publicar
// sigue siendo la autoridad. Puro, O(nodos + ítems).
import type { Diseno } from '../diseno'
import type { Definicion } from '../formula'
import type { Nodo } from '../nodos'
import { filasDe } from './filas'

export type LoQueElDisenoNoMuestra = { tipo: 'sin_diseno' } | { tipo: 'filas'; filas: string[] }

export const TEXTO_SIN_DISENO =
  'Este borrador no tiene el diseño de la hoja: todavía no se puede publicar.'

// Cuántas filas se nombran en el aviso antes de «y N más».
const NOMBRADAS = 5

const pideCelda = (n: Nodo) => n.tipo === 'input' || n.tipo === 'constante' || n.tipo === 'opcion'

// Dónde se dibuja un nodo, con la regla del espejo (`registrar` de `validar-diseno-secciones.ts`): el `nodo` de todo ítem menos un `atajos`, y el `pct` sólo de una
// celda con `secundario` cuyo nodo es un `porcentaje_de`.
function aparecen(definicion: Definicion, diseno: Diseno): Set<string> {
  const porId = new Map(definicion.nodos.map((n) => [n.id, n]))
  const vistos = new Set<string>()
  for (const seccion of diseno.secciones) {
    for (const item of seccion.items) {
      if (item.tipo === 'atajos') continue
      vistos.add(item.nodo)
      const nodo = porId.get(item.nodo)
      if (item.tipo === 'celda' && item.secundario !== undefined && nodo?.tipo === 'calculo') {
        if (nodo.op === 'porcentaje_de') vistos.add(nodo.pct)
      }
    }
  }
  return vistos
}

// Los inputs, constantes y opciones que ningún ítem del diseño dibuja, en el orden de la fórmula.
export function nodosSinCelda(definicion: Definicion, diseno: Diseno): string[] {
  const vistos = aparecen(definicion, diseno)
  return definicion.nodos.filter((n) => pideCelda(n) && !vistos.has(n.id)).map((n) => n.id)
}

// Las filas dueñas de esos nodos (una auxiliar, la de su fila), en orden y sin repetir; sin diseño, el caso propio.
export function filasSinCelda(
  definicion: Definicion,
  diseno: Diseno | null,
): LoQueElDisenoNoMuestra {
  if (diseno === null) return { tipo: 'sin_diseno' }
  const faltan = new Set(nodosSinCelda(definicion, diseno))
  if (faltan.size === 0) return { tipo: 'filas', filas: [] }
  const filas = filasDe(definicion)
    .filter((f) => faltan.has(f.nodo.id) || f.auxiliares.some((a) => faltan.has(a)))
    .map((f) => f.nodo.id)
  return { tipo: 'filas', filas }
}

// El aviso con las etiquetas de esas filas: las cinco primeras y, si hay más, «y N más». Ninguna: nada que decir.
export function textoDeSinCelda(etiquetas: readonly string[]): string | null {
  if (etiquetas.length === 0) return null
  const nombradas = etiquetas
    .slice(0, NOMBRADAS)
    .map((e) => `«${e}»`)
    .join(', ')
  const resto = etiquetas.length > NOMBRADAS ? ` y ${String(etiquetas.length - NOMBRADAS)} más` : ''
  return `Para publicar, el diseño de la hoja tiene que mostrar: ${nombradas}${resto}. Puedes guardar igual.`
}
