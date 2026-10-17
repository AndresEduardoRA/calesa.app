'use client'

import { debounce, parseAsString, useQueryStates } from 'nuqs'
import { useMemo, useTransition } from 'react'
import {
  CLAVE_DE_CURSOR,
  CLAVE_DE_PANEL,
  CLAVE_DE_POR_PAGINA,
  PANEL_DE_FILTROS,
  clavesDeUrl,
  escribirFiltro,
  hayFiltros,
  leerFiltros,
  limpiarFiltros,
  type DefFiltro,
  type EsquemaDeFiltros,
  type ValorDeFiltro,
  type ValoresDeFiltros,
} from '@/shared/lib/filtros'

const DEMORA_AL_TIPEAR_MS = 300

export type Filtros = {
  valores: ValoresDeFiltros
  hayFiltros: boolean
  // La lista se está volviendo a pedir con los filtros nuevos.
  pendiente: boolean
  cambiar: (def: DefFiltro, valor: ValorDeFiltro | null, opciones?: { tipeando?: boolean }) => void
  buscar: (texto: string) => void
  // Un cambio ya armado (quitar un chip).
  aplicar: (cambio: Record<string, string | null>) => void
  limpiar: () => void
  // De a cuántos ítems se ve la página: `?por=`. Vuelve a la primera y conserva filtros y búsqueda.
  aplicarPorPagina: (tamano: number) => void
  panelAbierto: boolean
  abrirPanel: () => void
  cerrarPanel: () => void
}

// El estado de los filtros de un listado, en la URL (`shallow: false`: el servidor vuelve a leer
// con ellos). Todas las claves son texto: qué significa cada una lo decide `leerFiltros()`, el
// mismo que usa la página en el servidor, así que las dos partes siempre leen igual.
export function useFiltros(esquema: EsquemaDeFiltros): Filtros {
  const parsers = useMemo(
    () =>
      Object.fromEntries(
        [...clavesDeUrl(esquema), CLAVE_DE_CURSOR, CLAVE_DE_PANEL, CLAVE_DE_POR_PAGINA].map(
          (clave) => [clave, parseAsString],
        ),
      ),
    [esquema],
  )
  const [pendiente, startTransition] = useTransition()
  const [parametros, setParametros] = useQueryStates(parsers, { shallow: false, startTransition })
  const valores = leerFiltros(esquema, parametros)

  function aplicar(cambio: Record<string, string | null>, tipeando = false) {
    void setParametros(
      { ...cambio, [CLAVE_DE_CURSOR]: null },
      tipeando ? { limitUrlUpdates: debounce(DEMORA_AL_TIPEAR_MS) } : undefined,
    )
  }

  return {
    valores,
    hayFiltros: hayFiltros(valores),
    pendiente,
    cambiar: (def, valor, opciones) => {
      aplicar(escribirFiltro(def, valor), opciones?.tipeando)
    },
    buscar: (texto) => {
      if (esquema.busqueda) {
        aplicar({ [esquema.busqueda.clave]: texto === '' ? null : texto }, true)
      }
    },
    aplicar: (cambio) => {
      aplicar(cambio)
    },
    limpiar: () => {
      aplicar(limpiarFiltros(esquema))
    },
    aplicarPorPagina: (tamano) => {
      aplicar({ [CLAVE_DE_POR_PAGINA]: String(tamano) })
    },
    panelAbierto: parametros[CLAVE_DE_PANEL] === PANEL_DE_FILTROS,
    // Abrir un panel suma al historial: «atrás» lo cierra.
    abrirPanel: () => {
      void setParametros({ [CLAVE_DE_PANEL]: PANEL_DE_FILTROS }, { history: 'push', shallow: true })
    },
    // Cerrar no cambia lo que se lista: alcanza con tocar la URL. Salvo que la lista todavía se
    // esté pidiendo con un filtro recién elegido: un cambio sólo de URL pisa esa navegación (la URL
    // queda con el filtro y la lista sin él), así que entonces cerrar también va al servidor.
    cerrarPanel: () => {
      void setParametros({ [CLAVE_DE_PANEL]: null }, { shallow: !pendiente })
    },
  }
}
