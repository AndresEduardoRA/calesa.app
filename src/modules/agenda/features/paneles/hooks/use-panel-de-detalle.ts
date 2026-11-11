'use client'

import { parseAsString, useQueryStates } from 'nuqs'

const PARSERS = {
  evento: parseAsString,
  tarea: parseAsString,
  editar: parseAsString,
}

// El panel de un evento o de una tarea (`?evento=<id>` / `?tarea=<id>`) y su modo de edición (`?editar=1`). Se abre por un enlace del
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
    cerrar: () => {
      void escribir({ evento: null, tarea: null, editar: null })
    },
  }
}
