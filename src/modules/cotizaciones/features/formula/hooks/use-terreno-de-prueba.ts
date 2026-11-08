'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { fallo, type Resultado } from '@/shared/lib/errores'
import { leerElTerrenoDePrueba } from '../../../areas/formula/composicion.client'
import { TERRENO_VACIO, type TerrenoDePrueba } from '../../../entities/formula/terreno-de-prueba'

export type LecturaDelTerreno =
  { tipo: 'leyendo' } | { tipo: 'error' } | { tipo: 'lista'; terreno: TerrenoDePrueba }

type Pedido = { origenId: string; tablas: string[]; cambios: string[] }

const SIN_LEER = 'No pudimos leer los tipos de cambio y las tablas.'

// Lo de prueba de la vista previa del editor (4.21-3a-2, P5): los tipos de cambio y las tablas que la fórmula nombra, desde el navegador y con la sesión de quien
// edita. Se lee al montarse y otra vez sólo si cambia el **conjunto** de lo que la fórmula nombra (no al tipear ni al aplicar un texto) o con «Reintentar». Sin
// nada que leer no se pide nada. Sólo cuenta la respuesta del último pedido; la que llega con el editor cerrado se descarta. No se guarda en ninguna parte:
// los tipos de cambio son «de hoy».
export function useTerrenoDePrueba(pedido: Pedido): {
  estado: LecturaDelTerreno
  reintentar: () => void
} {
  const clave = JSON.stringify([pedido.origenId, pedido.tablas, pedido.cambios])
  const vacio = pedido.tablas.length === 0 && pedido.cambios.length === 0
  // Lo leído lleva la clave que lo pidió: otro conjunto es «leyendo» sin tocar el estado desde un efecto.
  const [leido, setLeido] = useState<{ clave: string; estado: LecturaDelTerreno } | null>(null)
  const ultimo = useRef(0)
  const actual = useRef(pedido)
  useEffect(() => {
    actual.current = pedido
  })

  const pedir = useCallback(() => {
    ultimo.current += 1
    const este = ultimo.current
    leerElTerrenoDePrueba(actual.current)
      .catch((): Resultado<TerrenoDePrueba> => fallo('inesperado', SIN_LEER))
      .then((resultado) => {
        if (este !== ultimo.current) return
        setLeido({
          clave,
          estado: resultado.ok ? { tipo: 'lista', terreno: resultado.data } : { tipo: 'error' },
        })
      })
      .catch(() => undefined)
  }, [clave])

  useEffect(() => {
    if (!vacio) pedir()
    return () => {
      ultimo.current += 1
    }
  }, [pedir, vacio])

  const estado: LecturaDelTerreno = vacio
    ? { tipo: 'lista', terreno: TERRENO_VACIO }
    : leido?.clave === clave
      ? leido.estado
      : { tipo: 'leyendo' }
  return {
    estado,
    reintentar: () => {
      setLeido(null)
      pedir()
    },
  }
}
