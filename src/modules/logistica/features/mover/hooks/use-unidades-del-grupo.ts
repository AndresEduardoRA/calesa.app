'use client'

import { useEffect, useState } from 'react'
import type { ErrorApp } from '@/shared/lib/errores'
import type { UnidadDelGrupo } from '../../../entities/mover/grupo-del-lote'
import {
  leerUnidadesDelGrupo,
  NO_SE_LEYO_EL_GRUPO,
  type PedidoDelGrupo,
} from '../../../areas/mover/composicion.client'

export type LecturaDelGrupo =
  | { tipo: 'cargando' }
  | { tipo: 'error'; error: ErrorApp }
  | { tipo: 'listo'; unidades: UnidadDelGrupo[]; hayMas: boolean }

type Leida = {
  clave: string
  lectura:
    | { tipo: 'error'; error: ErrorApp }
    | { tipo: 'listo'; unidades: UnidadDelGrupo[]; hayMas: boolean }
}

// Las unidades de un contenedor o una reserva (6.04-3): una lectura al abrir el drawer, con la sesión de quien mira. Mientras no llega, «cargando»; «Reintentar» pide otra.
export function useUnidadesDelGrupo({ origenId, tipo, valor }: PedidoDelGrupo) {
  const [intento, setIntento] = useState(0)
  const [leida, setLeida] = useState<Leida | null>(null)
  const clave = `${origenId}|${tipo}|${valor}|${String(intento)}`
  useEffect(() => {
    let vigente = true
    void leerUnidadesDelGrupo({ origenId, tipo, valor })
      .catch(() => ({
        ok: false as const,
        error: { codigo: 'inesperado' as const, mensaje: NO_SE_LEYO_EL_GRUPO },
      }))
      .then((resultado) => {
        if (!vigente) return
        setLeida({
          clave,
          lectura: resultado.ok
            ? { tipo: 'listo', ...resultado.data }
            : { tipo: 'error', error: resultado.error },
        })
      })
    return () => {
      vigente = false
    }
  }, [origenId, tipo, valor, clave])
  const lectura: LecturaDelGrupo = leida?.clave === clave ? leida.lectura : { tipo: 'cargando' }
  return {
    lectura,
    reintentar: () => {
      setIntento((n) => n + 1)
    },
  }
}
