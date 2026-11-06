'use client'

import { useEffect, useRef, useState } from 'react'
import { fallo, type ErrorApp, type Resultado } from '@/shared/lib/errores'
import { leerCursor, TOPE_DE_LO_CARGADO, type Pagina } from '@/shared/lib/paginacion'
import {
  leerCotizacionesDelLead,
  leerHistorialDelVehiculo,
} from '../../../composicion-historial.client'
import type { CotizacionDelHistorial, ListaDe } from '../../../entities/historial-del-vehiculo'

// Lo que se ve de las páginas: sin leer, la primera en camino, leído (con lo que se agregó por «Ver más») o fallido.
// `error` es el del último pedido: sin filas es la primera página; con filas, la que se pidió con «Ver más» (lo leído se queda).
type Estado = {
  filas: CotizacionDelHistorial[]
  siguiente: string | null
  leido: boolean
  cargando: boolean
  error: ErrorApp | null
}

const SIN_LEER: Estado = { filas: [], siguiente: null, leido: false, cargando: false, error: null }

// Las páginas del historial de cotizaciones de un vehículo o de un lead (`de`), de a `TAMANO_DE_VER_MAS` por cursor y hasta `TOPE_DE_LO_CARGADO`. La posición no va a la URL.
// Una respuesta de un pedido que ya no es el último (otro «Ver más», otra lista, el componente ya no está, el primer montaje de `StrictMode`) se descarta:
// ese `ultimo` es el único guardián, y lo comparten el panel de la hoja (que lee al desplegar) y la pestaña de la ficha (que lee al montarse).
export function usePaginasDelHistorial(de: ListaDe) {
  const [estado, setEstado] = useState<Estado>(SIN_LEER)
  const ultimo = useRef(0)

  useEffect(
    () => () => {
      ultimo.current = -1
    },
    [],
  )

  const leer = (cursorDeLaUrl: string | null) => {
    ultimo.current += 1
    const pedido = ultimo.current
    setEstado((antes) => ({ ...antes, cargando: true, error: null }))
    const cursor = leerCursor(cursorDeLaUrl)
    // Cada lector se nombra sólo en su rama, al llamarlo.
    const lectura =
      'vehiculo' in de
        ? leerHistorialDelVehiculo({ vehiculoId: de.vehiculo, cursor })
        : leerCotizacionesDelLead({ leadId: de.lead, cursor })
    lectura
      .catch((): Resultado<Pagina<CotizacionDelHistorial>> =>
        fallo('inesperado', 'No se pudo cargar el historial.'),
      )
      .then((resultado) => {
        if (pedido !== ultimo.current) {
          return
        }
        setEstado((antes) =>
          resultado.ok
            ? {
                filas: [...antes.filas, ...resultado.data.filas],
                siguiente: resultado.data.siguiente,
                leido: true,
                cargando: false,
                error: null,
              }
            : { ...antes, cargando: false, error: resultado.error },
        )
      })
      .catch(() => undefined)
  }

  const hayMasParaPedir = estado.siguiente !== null && estado.filas.length < TOPE_DE_LO_CARGADO
  return {
    ...estado,
    // En el tope de lo cargado: hay más, pero no se pide (el aviso lo dice).
    enElTope: estado.siguiente !== null && estado.filas.length >= TOPE_DE_LO_CARGADO,
    hayMasParaPedir,
    // La primera página, una vez: no vuelve a pedir lo leído, lo que va en camino ni lo que falló (eso es «Reintentar»).
    leerLaPrimera: () => {
      if (!estado.leido && !estado.cargando && estado.error === null) {
        leer(null)
      }
    },
    verMas: () => {
      if (hayMasParaPedir && !estado.cargando) {
        leer(estado.siguiente)
      }
    },
    reintentar: () => {
      if (!estado.cargando) {
        leer(estado.leido ? estado.siguiente : null)
      }
    },
  }
}

export type PaginasDelHistorial = ReturnType<typeof usePaginasDelHistorial>
