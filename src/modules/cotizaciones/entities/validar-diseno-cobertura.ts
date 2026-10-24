// §4 a §6 de `validarDiseno()`, cuando ya se vio todo el diseño: los atajos contra la celda de su nodo, lo que la hoja tiene que
// dibujar sí o sí (todo input y constante, la variante, las banderas que condicionan algo) y los tonos de los grupos.
import { buscar, esta, recorrer } from './medidor'
import { fallo, type FalloDeDiseno } from './motivos-de-diseno'
import type { Estado, Indice } from './validar-diseno-contexto'

// §4. Un atajos va sobre la celda de su nodo (o el porcentaje que ella muestra) y con sus mismos niveles: un nodo no aparece en dos
// secciones con niveles distintos.
export function revisarAtajos(ix: Indice, e: Estado): FalloDeDiseno | undefined {
  for (const a of recorrer(e.atajos, ix.m)) {
    const dibujo = buscar(e.apariciones, a.nodo, ix.m)
    if (dibujo === undefined) return fallo('atajos_sin_celda', { donde: a.nodo })
    if (dibujo.ver !== a.ver || dibujo.editar !== a.editar) {
      return fallo('nodo_con_dos_niveles', { donde: a.nodo })
    }
  }
  return undefined
}

// §5, en el orden de la fórmula. Un input y una constante se editan en una celda; la variante, en sus chips (sin ellos el motor falla en
// cada cálculo si no tiene opción por defecto, y con una no se podría cambiar); y una bandera que condiciona algo, en su interruptor.
export function revisarCobertura(ix: Indice, e: Estado): FalloDeDiseno | undefined {
  for (const n of recorrer(ix.def.nodos, ix.m)) {
    const pide =
      n.tipo === 'input' ||
      n.tipo === 'constante' ||
      n.tipo === 'opcion' ||
      (n.tipo === 'bandera' &&
        (esta(ix.condicionadas, n.id, ix.m) || esta(ix.requeridas, n.id, ix.m)))
    if (pide && buscar(e.apariciones, n.id, ix.m) === undefined) {
      return fallo('nodo_sin_seccion', { donde: n.id })
    }
  }
  return undefined
}

// §6. El tono de cada grupo de la fórmula está en el catálogo de la empresa.
export function revisarTonos(ix: Indice): FalloDeDiseno | undefined {
  for (const g of recorrer(ix.def.grupos ?? [], ix.m)) {
    if (!esta(ix.tonos, g.tono, ix.m)) return fallo('tono_inexistente', { donde: g.id })
  }
  return undefined
}
