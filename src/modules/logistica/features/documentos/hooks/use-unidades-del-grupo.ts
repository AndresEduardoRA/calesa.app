'use client'

import { useCallback, useEffect, useState } from 'react'
import { fallo, type ErrorApp, type Resultado } from '@/shared/lib/errores'
import {
  leerTiposDeLaUnidad,
  leerUnidadesDelGrupo,
  NO_SE_CARGARON_LAS_UNIDADES_DEL_GRUPO,
  type UnidadDelGrupo,
} from '../../../areas/documentos/composicion.client'
import type { TipoDeDocumento } from '../../../entities/documentos/documento'
import type { GrupoDeLogistica } from '../../../entities/nucleo/grupo'

export type DatoDelGrupo = {
  unidades: UnidadDelGrupo[]
  hayMas: boolean
  // Los tipos de la primera unidad (D26).
  tipos: TipoDeDocumento[]
}

export type LecturaDelGrupo =
  { tipo: 'cargando' } | { tipo: 'error'; error: ErrorApp } | { tipo: 'listo'; dato: DatoDelGrupo }

async function leerTodo(grupo: GrupoDeLogistica): Promise<Resultado<DatoDelGrupo>> {
  const unidades = await leerUnidadesDelGrupo(grupo)
  if (!unidades.ok) return unidades
  const primera = unidades.data.unidades[0]
  if (!primera) return { ok: true, data: { ...unidades.data, tipos: [] } }
  const tipos = await leerTiposDeLaUnidad({ tipo: 'vehiculo', origenId: primera.origenId })
  if (!tipos.ok) return tipos
  return { ok: true, data: { ...unidades.data, tipos: tipos.data } }
}

// Las unidades de un grupo y los tipos de documento de la primera, para subirles un documento a todas (6.06-3). Se lee al montarse el hueco; «Reintentar» vuelve a leer. Una respuesta
// que llega tarde se descarta.
export function useUnidadesDelGrupo(grupo: GrupoDeLogistica) {
  const { tipo, id } = grupo
  const [lectura, setLectura] = useState<LecturaDelGrupo>({ tipo: 'cargando' })
  const [intento, setIntento] = useState(0)

  useEffect(() => {
    let vigente = true
    void leerTodo({ tipo, id })
      .catch(() => fallo('inesperado', NO_SE_CARGARON_LAS_UNIDADES_DEL_GRUPO))
      .then((resultado) => {
        if (!vigente) return
        setLectura(
          resultado.ok
            ? { tipo: 'listo', dato: resultado.data }
            : { tipo: 'error', error: resultado.error },
        )
      })
    return () => {
      vigente = false
    }
  }, [tipo, id, intento])

  const reintentar = useCallback(() => {
    setLectura({ tipo: 'cargando' })
    setIntento((n) => n + 1)
  }, [])
  return { lectura, reintentar }
}
