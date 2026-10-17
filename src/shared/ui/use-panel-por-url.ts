'use client'

import { parseAsString, useQueryStates, type Options } from 'nuqs'
import { useMemo } from 'react'
import { CLAVE_DE_PANEL } from '@/shared/lib/filtros'

// Un modal o un panel que vive en la URL (`?panel=purgar&lote=<id>`): lo que se abre se puede recargar, se
// cierra con «atrás» y se comparte (.claude/rules/ui.md). `panel` es el valor de `?panel=` que lo abre y `claves`
// las otras claves de la URL que nombran lo que muestra (el lote, el lead): se escriben juntas al abrir y se
// borran juntas al cerrar.
//
// Abrir suma al historial; cerrar lo reemplaza. Sin `shallow: false`: abrirlo no necesita al servidor.
// Cuántas veces se abre, qué dato muestra y si ese dato existe lo resuelve quien lo usa
// (`useRevisionAlAbrir()`): acá sólo está la URL.
export function usePanelPorUrl(panel: string, claves: readonly string[] = []) {
  const clavesJuntas = claves.join('\u0000')
  const parsers = useMemo(
    () =>
      Object.fromEntries(
        [CLAVE_DE_PANEL, ...(clavesJuntas === '' ? [] : clavesJuntas.split('\u0000'))].map(
          (clave) => [clave, parseAsString],
        ),
      ),
    [clavesJuntas],
  )
  const [valores, escribir] = useQueryStates(parsers)
  const opciones: Options = { history: 'push' }
  return {
    abierto: valores[CLAVE_DE_PANEL] === panel,
    // La clave de la URL que nombra lo que el panel muestra (nula si falta).
    valor: (clave: string): string | null => valores[clave] ?? null,
    abrir: (nombrados: Readonly<Record<string, string>> = {}) => {
      const todos: Record<string, string | null> = Object.fromEntries(
        Object.keys(parsers).map((clave) => [clave, null]),
      )
      void escribir({ ...todos, ...nombrados, [CLAVE_DE_PANEL]: panel }, opciones)
    },
    cerrar: () => {
      void escribir(Object.fromEntries(Object.keys(parsers).map((clave) => [clave, null])))
    },
  }
}
