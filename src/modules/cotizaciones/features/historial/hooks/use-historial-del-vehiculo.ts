'use client'

import { useEffect, useRef, useState } from 'react'
import { fallo, type ErrorApp, type Resultado } from '@/shared/lib/errores'
import { leerCursor, TOPE_DE_LO_CARGADO, type Pagina } from '@/shared/lib/paginacion'
import { leerHistorialDelVehiculo } from '../../../composicion-historial.client'
import type { CotizacionDelHistorial } from '../../../entities/historial-del-vehiculo'

// Lo que se ve del historial: sin leer (plegado y nunca abierto), la primera página en camino, leído (con lo que se agregó por «Ver más») o fallido.
// `error` es el del último pedido: sin filas es la primera página; con filas, la que se pidió con «Ver más» (lo leído se queda).
type Estado = {
  filas: CotizacionDelHistorial[]
  siguiente: string | null
  leido: boolean
  cargando: boolean
  error: ErrorApp | null
}

const SIN_LEER: Estado = { filas: [], siguiente: null, leido: false, cargando: false, error: null }

// El historial de cotizaciones de un vehículo: se lee al desplegarlo (nunca con el panel), de a `TAMANO_DE_VER_MAS` por cursor y hasta `TOPE_DE_LO_CARGADO`.
// La posición no va a la URL. Una respuesta de un pedido que ya no es el último (otro «Ver más», otro vehículo, el componente ya no está) se descarta.
export function useHistorialDelVehiculo(vehiculoId: string) {
  const [abierto, setAbierto] = useState(false)
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
    leerHistorialDelVehiculo({ vehiculoId, cursor })
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
    abierto,
    ...estado,
    // En el tope de lo cargado: hay más, pero no se pide (el aviso lo dice).
    enElTope: estado.siguiente !== null && estado.filas.length >= TOPE_DE_LO_CARGADO,
    hayMasParaPedir,
    alternar: () => {
      setAbierto(!abierto)
      if (!abierto && !estado.leido && !estado.cargando && estado.error === null) {
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
