'use client'

import { useEffect, useRef, useState } from 'react'
import { fallo, type ErrorApp, type Resultado } from '@/shared/lib/errores'
import { TOPE_DE_LO_CARGADO } from '@/shared/lib/paginacion'
import { leerPaginaDeVersiones } from '../../../areas/formula/composicion.client'
import type { PaginaConAutores } from '../../../entities/formula/versiones'

type Estado = {
  pagina: PaginaConAutores
  // «Ir a la versión N»: la lista empieza en N. Nulo: empieza en la más nueva.
  desde: number | null
  cargando: boolean
  error: ErrorApp | null
  // El último pedido, para «Reintentar»: con `reemplaza`, el de «Ir a la versión» (lo leído se cambia); si no, el de «Ver más» (se suma).
  ultimoPedido: { cursor: number; reemplaza: boolean; desde: number | null } | null
}

function trasLeer(
  antes: Estado,
  resultado: Resultado<PaginaConAutores>,
  reemplaza: boolean,
  desde: number | null,
): Estado {
  if (!resultado.ok) {
    return { ...antes, cargando: false, error: resultado.error }
  }
  const pagina = reemplaza
    ? resultado.data
    : {
        filas: [...antes.pagina.filas, ...resultado.data.filas],
        siguiente: resultado.data.siguiente,
      }
  return { ...antes, pagina, desde, cargando: false, error: null }
}

// Las versiones de la fórmula de un origen: la primera página llega del servidor y «Ver más» lee las siguientes desde el navegador, de a `TAMANO_DE_VER_MAS` por cursor
// (el número de la última) y hasta `TOPE_DE_LO_CARGADO`; en el tope, «Ir a la versión» es el camino a lo antiguo. Un pedido a la vez; la respuesta de uno que ya no es el
// último (otro «Ir a la versión», «Volver a la más nueva», el componente ya no está) se descarta. La posición no va a la URL: al recargar vuelve a la más nueva.
// Otro origen es otro componente (la pestaña lleva `key` con el origen).
export function usePaginasDeVersiones(origenId: string, inicial: PaginaConAutores) {
  const [estado, setEstado] = useState<Estado>({
    pagina: inicial,
    desde: null,
    cargando: false,
    error: null,
    ultimoPedido: null,
  })
  const ultimo = useRef(0)

  useEffect(
    () => () => {
      ultimo.current = -1
    },
    [],
  )

  const leer = (cursor: number, reemplaza: boolean, desde: number | null) => {
    ultimo.current += 1
    const pedido = ultimo.current
    setEstado((antes) => ({
      ...antes,
      cargando: true,
      error: null,
      ultimoPedido: { cursor, reemplaza, desde },
    }))
    leerPaginaDeVersiones({ origenId, cursor })
      .catch((): Resultado<PaginaConAutores> =>
        fallo('inesperado', 'No se pudieron cargar más versiones.'),
      )
      .then((resultado) => {
        if (pedido !== ultimo.current) {
          return
        }
        setEstado((antes) => trasLeer(antes, resultado, reemplaza, desde))
      })
      .catch(() => undefined)
  }

  const { pagina } = estado
  const hayMasParaPedir = pagina.siguiente !== null && pagina.filas.length < TOPE_DE_LO_CARGADO
  return {
    filas: pagina.filas,
    desde: estado.desde,
    cargando: estado.cargando,
    error: estado.error,
    // En el tope: hay más, pero no se pide (el aviso lo dice y ofrece «Ir a la versión»).
    enElTope: pagina.siguiente !== null && pagina.filas.length >= TOPE_DE_LO_CARGADO,
    hayMasParaPedir,
    verMas: () => {
      if (hayMasParaPedir && pagina.siguiente !== null && !estado.cargando) {
        leer(pagina.siguiente, false, estado.desde)
      }
    },
    // `cursor` sale de `cursorDeIrA()`: la versión pedida + 1.
    irA: (cursor: number) => {
      leer(cursor, true, cursor - 1)
    },
    // La primera página que dio el servidor, sin volver a pedirla.
    volverALaMasNueva: () => {
      ultimo.current += 1
      setEstado({ pagina: inicial, desde: null, cargando: false, error: null, ultimoPedido: null })
    },
    reintentar: () => {
      const pedido = estado.ultimoPedido
      if (pedido && !estado.cargando) {
        leer(pedido.cursor, pedido.reemplaza, pedido.desde)
      }
    },
  }
}

export type PaginasDeVersiones = ReturnType<typeof usePaginasDeVersiones>
