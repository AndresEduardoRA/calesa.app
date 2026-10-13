'use client'

import type { Seleccion } from '../seleccion'
import { useEnvioAPapelera } from './use-envio-a-papelera'
import { useSeleccion } from './use-seleccion'

type Fila = { id: string; actualizadoEn: string }

// Lo que el listado necesita para elegir filas: cuáles se pueden, cuáles están elegidas y cómo
// se cambian. Sin ninguna elegible, la columna de casillas no se dibuja.
export type SeleccionDelListado = {
  seleccionables: ReadonlySet<string>
  elegidas: Seleccion
  alternar: (id: string) => void
  alternarTodas: () => void
}

// El envío en lote desde el inventario: se eligen filas (sólo las que la persona puede enviar a
// la papelera) y se mandan juntas, cada una con su versión. Un envío es un lote.
export function usePapeleraDelListado(filas: readonly Fila[], eliminables: readonly string[]) {
  const puede = new Set(eliminables)
  const seleccionables = filas.filter((fila) => puede.has(fila.id)).map((fila) => fila.id)
  const seleccion = useSeleccion(seleccionables)
  const papelera = useEnvioAPapelera()

  async function enviar() {
    const elegidas = filas.filter((fila) => seleccion.elegidas.has(fila.id))
    if (elegidas.length > 0 && (await papelera.enviar(elegidas))) {
      seleccion.limpiar()
    }
  }

  const delListado: SeleccionDelListado = {
    seleccionables: new Set(seleccionables),
    elegidas: seleccion.elegidas,
    alternar: seleccion.alternar,
    alternarTodas: seleccion.alternarTodas,
  }
  return {
    seleccion: delListado,
    cantidad: seleccion.elegidas.size,
    enviar,
    limpiar: seleccion.limpiar,
    enCurso: papelera.enCurso,
  }
}
