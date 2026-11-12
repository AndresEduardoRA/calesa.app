'use client'

import { useEffect, useState } from 'react'
import { fallo, type ErrorApp } from '@/shared/lib/errores'
import {
  leerOpcionesDeGasto,
  NO_SE_CARGARON_LAS_OPCIONES,
  type OpcionesDeGasto,
} from '../../../areas/dinero/composicion.client'

type Lectura =
  | { tipo: 'cargando' }
  | { tipo: 'error'; error: ErrorApp; reintentar: () => void }
  | { tipo: 'listo'; opciones: OpcionesDeGasto }

// Las categorías, monedas y tipos de cambio del formulario (6.11-1): se leen al abrirse el panel (la lectura se recuerda un rato, así la segunda apertura es inmediata). `apertura`
// cambia con cada apertura: una que falló vuelve a intentarlo.
export function useOpcionesDeGasto(abierto: boolean, apertura: number): Lectura {
  const [lectura, setLectura] = useState<
    | { tipo: 'cargando' }
    | { tipo: 'error'; error: ErrorApp }
    | { tipo: 'listo'; opciones: OpcionesDeGasto }
  >({ tipo: 'cargando' })
  const [pedido, setPedido] = useState(0)
  useEffect(() => {
    if (!abierto) {
      return
    }
    let vigente = true
    void leerOpcionesDeGasto()
      .catch(() => fallo('inesperado', NO_SE_CARGARON_LAS_OPCIONES))
      .then((resultado) => {
        if (vigente) {
          setLectura(
            resultado.ok
              ? { tipo: 'listo', opciones: resultado.data }
              : { tipo: 'error', error: resultado.error },
          )
        }
      })
    return () => {
      vigente = false
    }
  }, [abierto, apertura, pedido])
  return lectura.tipo === 'error'
    ? {
        ...lectura,
        reintentar: () => {
          setLectura({ tipo: 'cargando' })
          setPedido((n) => n + 1)
        },
      }
    : lectura
}
