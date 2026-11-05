'use client'

import { parseAsString, useQueryStates, type Options } from 'nuqs'
import { useMemo } from 'react'
import { CLAVE_DE_PANEL } from '@/shared/lib/filtros'
import { abrirConVuelta, useVueltaDelFoco } from './vuelta-del-foco'

// Un modal o un panel que vive en la URL (`?panel=purgar&lote=<id>`): lo que se abre se puede recargar, se
// cierra con «atrás» y se comparte (.claude/rules/ui.md). `panel` es el valor de `?panel=` que lo abre y `claves`
// las otras claves de la URL que nombran lo que muestra (el lote, el lead): se escriben juntas al abrir y se
// borran juntas al cerrar.
//
// Un diálogo dentro de un panel que ya ocupa `?panel=` (el «Eliminar embudo» del panel de etapas) usa otra clave:
// `{ clave: 'eliminar' }` lo lleva en `?eliminar=embudo` y deja el `?panel=` como está.
//
// Abrir suma al historial; cerrar lo reemplaza. Tras recargar con el panel abierto, «atrás» devuelve el foco a quien lo abrió
// (`vuelta-del-foco.ts`). Sin `shallow: false`: abrirlo no necesita al servidor.
// Cuántas veces se abre, qué dato muestra y si ese dato existe lo resuelve quien lo usa
// (`useRevisionAlAbrir()`): acá sólo está la URL.
export function usePanelPorUrl(
  panel: string,
  claves: readonly string[] = [],
  { clave: clavePanel = CLAVE_DE_PANEL }: { clave?: string } = {},
) {
  const clavesJuntas = claves.join('\u0000')
  const parsers = useMemo(
    () =>
      Object.fromEntries(
        [clavePanel, ...(clavesJuntas === '' ? [] : clavesJuntas.split('\u0000'))].map((clave) => [
          clave,
          parseAsString,
        ]),
      ),
    [clavesJuntas, clavePanel],
  )
  const [valores, escribir] = useQueryStates(parsers)
  const opciones: Options = { history: 'push' }
  const abierto = valores[clavePanel] === panel
  useVueltaDelFoco(clavePanel, abierto)
  return {
    abierto,
    // La clave de la URL que nombra lo que el panel muestra (nula si falta).
    valor: (clave: string): string | null => valores[clave] ?? null,
    abrir: (nombrados: Readonly<Record<string, string>> = {}) => {
      const todos: Record<string, string | null> = Object.fromEntries(
        Object.keys(parsers).map((clave) => [clave, null]),
      )
      abrirConVuelta(
        clavePanel,
        () => escribir({ ...todos, ...nombrados, [clavePanel]: panel }, opciones),
        abierto,
      )
    },
    cerrar: () => {
      void escribir(Object.fromEntries(Object.keys(parsers).map((clave) => [clave, null])))
    },
  }
}
