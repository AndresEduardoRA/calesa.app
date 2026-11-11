'use client'

import { parseAsString, useQueryStates } from 'nuqs'

const PARSERS = {
  panel: parseAsString,
  evento: parseAsString,
  tarea: parseAsString,
  recordatorio: parseAsString,
  editar: parseAsString,
}

// El panel de un evento, una tarea o un recordatorio (`?evento=<id>` / `?tarea=<id>` / `?recordatorio=<id>`) y su modo de edición (`?editar=1`). Se abre por un enlace del
// servidor (la página lee el detalle por id). Cerrar vuelve a pedir la página sin esas claves para que lo que el servidor dibuja siga a la
// URL; entrar y salir de «editar» sólo cambia el cuerpo del mismo panel y no pide nada.
export function usePanelDeDetalle() {
  const [valores, escribir] = useQueryStates(PARSERS, { shallow: false, history: 'replace' })
  return {
    editando: valores.editar === '1',
    editar: () => {
      void escribir({ editar: '1' }, { shallow: true })
    },
    dejarDeEditar: () => {
      void escribir({ editar: null }, { shallow: true })
    },
    // Tras crear: cierra el panel de alta y abre el detalle de lo creado, pidiendo la página al servidor (que lee el detalle por id).
    abrirEvento: (id: string) => {
      void escribir({ panel: null, evento: id, tarea: null, recordatorio: null, editar: null })
    },
    abrirTarea: (id: string) => {
      void escribir({ panel: null, evento: null, tarea: id, recordatorio: null, editar: null })
    },
    cerrar: () => {
      void escribir({ evento: null, tarea: null, recordatorio: null, editar: null })
    },
  }
}
