'use client'

import { useEffect, useState } from 'react'
import { fallo, type ErrorApp } from '@/shared/lib/errores'
import {
  leerUnidadesDelGrupo,
  NO_SE_CARGARON_LAS_UNIDADES,
  type UnidadesDelGrupo,
} from '../../../areas/dinero/composicion.client'
import type { GrupoDeLogistica } from '../../../entities/nucleo/grupo'

type Lectura =
  | { tipo: 'cargando' }
  | { tipo: 'error'; error: ErrorApp; reintentar: () => void }
  | { tipo: 'listo'; dato: UnidadesDelGrupo }

// Las unidades del grupo que se leen al montar el hueco (6.11-4), con la sesión de quien mira. «Reintentar» vuelve a leer.
export function useUnidadesDelGrupo(grupo: GrupoDeLogistica): Lectura {
  const [pedido, setPedido] = useState(0)
  const [lectura, setLectura] = useState<
    | { tipo: 'cargando' }
    | { tipo: 'error'; error: ErrorApp }
    | { tipo: 'listo'; dato: UnidadesDelGrupo }
  >({ tipo: 'cargando' })
  useEffect(() => {
    let vigente = true
    void leerUnidadesDelGrupo(grupo)
      .catch(() => fallo('inesperado', NO_SE_CARGARON_LAS_UNIDADES))
      .then((resultado) => {
        if (vigente) {
          setLectura(
            resultado.ok
              ? { tipo: 'listo', dato: resultado.data }
              : { tipo: 'error', error: resultado.error },
          )
        }
      })
    return () => {
      vigente = false
    }
  }, [grupo, pedido])
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
