// Editar los ítems del diseño que no son una celda de valor (4.22-3): los atajos (columna y filas), el efecto de un interruptor y la ayuda de una celda. Variante y
// subtotal no tienen más campo que su nodo: no hay qué editar. Nada muta lo que recibe; lo que `validarDiseno()` rechaza tras un cambio queda aplicado y lo dice el editor.
import {
  EFECTOS_DE_INTERRUPTOR,
  MAXIMO_DE_ATAJOS,
  type CeldaDeDiseno,
  type Diseno,
  type ItemDeDiseno,
} from '../diseno'
import type { Definicion } from '../formula'
import type { NodosPorId } from './admite-nivel'
import { conSeccion } from './edicion-del-diseno'

export const MAXIMO_DE_LA_AYUDA = 300

export type AyudaDeCelda = NonNullable<CeldaDeDiseno['ayuda']>

// Cambia el primer ítem de ese tipo y nodo en la sección.
function enItem(
  diseno: Diseno,
  donde: { seccion: string; tipo: ItemDeDiseno['tipo']; nodo: string },
  cambiar: (item: ItemDeDiseno) => ItemDeDiseno,
): Diseno {
  const { tipo, nodo: nodoId } = donde
  return conSeccion(diseno, donde.seccion, (s) => {
    let hecho = false
    return {
      ...s,
      items: s.items.map((it) => {
        if (hecho || it.tipo !== tipo || it.nodo !== nodoId) return it
        hecho = true
        return cambiar(it)
      }),
    }
  })
}

// `filas` se acota a 1..12 (un valor que no es número deja el diseño igual); la columna es sólo la clave.
export function ponerAtajos(
  diseno: Diseno,
  seccionId: string,
  nodoId: string,
  cambios: { columna?: string; filas?: number },
): Diseno {
  const filas =
    cambios.filas === undefined || !Number.isFinite(cambios.filas)
      ? undefined
      : Math.min(MAXIMO_DE_ATAJOS, Math.max(1, Math.trunc(cambios.filas)))
  if (cambios.filas !== undefined && filas === undefined && cambios.columna === undefined) {
    return diseno
  }
  return enItem(diseno, { seccion: seccionId, tipo: 'atajos', nodo: nodoId }, (it) =>
    it.tipo === 'atajos'
      ? {
          ...it,
          ...(cambios.columna === undefined ? {} : { columna: cambios.columna }),
          ...(filas === undefined ? {} : { filas }),
        }
      : it,
  )
}

// Las columnas que la base permite para unos atajos: las claves de `match` del nodo `tabla` y su `columna`; la actual siempre va, para verla aunque venga de otro lado.
export function columnasParaAtajos(nodos: NodosPorId, nodoId: string, actual: string): string[] {
  const nodo = nodos.get(nodoId)
  const propias = nodo?.tipo === 'tabla' ? [...Object.keys(nodo.match), nodo.columna] : []
  return [...new Set([...propias, actual])]
}

export function ponerEfecto(
  diseno: Diseno,
  seccionId: string,
  nodoId: string,
  efecto: (typeof EFECTOS_DE_INTERRUPTOR)[number],
): Diseno {
  if (!EFECTOS_DE_INTERRUPTOR.includes(efecto)) return diseno
  return enItem(diseno, { seccion: seccionId, tipo: 'interruptor', nodo: nodoId }, (it) =>
    it.tipo === 'interruptor' ? { ...it, efecto } : it,
  )
}

// La ayuda es una tabla o un texto, no las dos: escribir una quita la otra; vacía, de blancos, sin tabla o `null` quita la clave. Un texto más largo se corta.
export function ponerAyuda(
  diseno: Diseno,
  seccionId: string,
  nodoId: string,
  ayuda: AyudaDeCelda | null,
): Diseno {
  const limpia = ((): AyudaDeCelda | null => {
    if (ayuda === null) return null
    if ('tabla' in ayuda) return ayuda.tabla === '' ? null : { tabla: ayuda.tabla }
    // Sin `trim()`: el texto se escribe letra a letra y un espacio al final es el de la palabra que sigue. Sólo blancos = sin ayuda.
    const texto = Array.from(ayuda.texto).slice(0, MAXIMO_DE_LA_AYUDA).join('')
    return texto.trim() === '' ? null : { texto }
  })()
  return enItem(diseno, { seccion: seccionId, tipo: 'celda', nodo: nodoId }, (it) => {
    if (it.tipo !== 'celda') return it
    const { ayuda: _anterior, ...resto } = it
    return limpia === null ? resto : { ...resto, ayuda: limpia }
  })
}

// Las tablas de referencia que nombran los nodos de la fórmula, en orden de aparición y sin repetir; la actual siempre va.
export function tablasParaAyuda(definicion: Definicion, actual?: string): string[] {
  const nombres = new Set<string>()
  for (const n of definicion.nodos) {
    if (n.tipo === 'tabla' || n.tipo === 'tramo') nombres.add(n.tabla)
    else if (n.tipo === 'calculo' && n.op === 'depreciar') nombres.add(n.tabla)
  }
  if (actual !== undefined) nombres.add(actual)
  return [...nombres]
}
