// Las reglas puras del panel «Personalizar» del tablero: mover un widget, mostrarlo u ocultarlo y qué se guarda. Cero I/O.
import { aplicarPreferencia, type PreferenciaDeWidgets, type WidgetDelCatalogo } from './widgets'

// Una fila del panel: el orden de la lista es el orden de la persona (ocultos incluidos).
export type Fila = { clave: string; oculto: boolean }
export type DireccionDeMovimiento = 'subir' | 'bajar'

// Cambia de lugar con la vecina. En un extremo, o con una clave que no está, devuelve la misma lista.
export function moverFila<F extends Fila>(
  filas: readonly F[],
  clave: string,
  direccion: DireccionDeMovimiento,
): readonly F[] {
  const indice = filas.findIndex((fila) => fila.clave === clave)
  const destino = direccion === 'subir' ? indice - 1 : indice + 1
  const actual = filas[indice]
  const vecina = filas[destino]
  if (indice < 0 || !actual || !vecina) {
    return filas
  }
  const nuevas = [...filas]
  nuevas[indice] = vecina
  nuevas[destino] = actual
  return nuevas
}

export function alternarOculto<F extends Fila>(filas: readonly F[], clave: string): readonly F[] {
  return filas.map((fila) => (fila.clave === clave ? { ...fila, oculto: !fila.oculto } : fila))
}

// Lo que se guarda como `tablero.widgets`: todas las claves en orden y cuáles están ocultas.
export function aPreferencia(filas: readonly Fila[]): { orden: string[]; ocultos: string[] } {
  return {
    orden: filas.map((fila) => fila.clave),
    ocultos: filas.filter((fila) => fila.oculto).map((fila) => fila.clave),
  }
}

// Las filas que ofrece el panel: lo que la persona puede ver, en su orden, con los ocultos en su lugar. Una clave que
// ya no existe no sale; un widget nuevo que la preferencia no nombra queda al final.
export function filasDesde(
  visibles: readonly WidgetDelCatalogo[],
  preferencia: PreferenciaDeWidgets | null,
): readonly Fila[] {
  const ocultos = new Set(preferencia?.ocultos ?? [])
  const enOrden = aplicarPreferencia(
    visibles,
    preferencia && { orden: preferencia.orden, ocultos: [] },
  )
  return enOrden.mostrados.map((widget) => ({
    clave: widget.clave,
    oculto: ocultos.has(widget.clave),
  }))
}
