'use client'

import { useEffect, useState } from 'react'
import { leerCamposDeAtributos, leerDiff } from '../../../composicion.client'
import type { DiffDeActividad } from '../../../entities/actividad'
import { clavesDeAtributos, type CampoDeAtributo } from '../../../entities/diff'

export type LecturaDelDiff =
  | { estado: 'leyendo' }
  | { estado: 'error' }
  | {
      estado: 'listo'
      diff: DiffDeActividad
      // Las etiquetas de `atributos`; sin ellas (no hay atributos o su lectura falló) las claves salen humanizadas.
      campos: ReadonlyMap<string, CampoDeAtributo> | undefined
    }

type Guardada = { clave: string; lectura: LecturaDelDiff }

// El diff del cambio abierto, leído al abrirlo (`actividad_diff`) y, si trae `atributos`, las etiquetas de esas claves. Una respuesta de otro
// cambio (se abrió otro mientras leía) se descarta. Un `?cambio=` que no es un id no lee nada: sin acceso. `sin_permiso` también es sin acceso.
export function useDiff(abierto: boolean, id: number | null) {
  const [intento, setIntento] = useState(0)
  const [guardada, setGuardada] = useState<Guardada | null>(null)
  const clave = `${String(id)}|${String(intento)}`

  useEffect(() => {
    if (!abierto || id === null) {
      return
    }
    let vigente = true
    const guardar = (lectura: LecturaDelDiff) => {
      if (vigente) {
        setGuardada({ clave, lectura })
      }
    }
    void (async () => {
      const leido = await leerDiff(id).catch(() => null)
      if (leido === null || (!leido.ok && leido.error.codigo !== 'sin_permiso')) {
        guardar({ estado: 'error' })
        return
      }
      if (!leido.ok) {
        guardar({ estado: 'listo', diff: { id, visible: false }, campos: undefined })
        return
      }
      const diff = leido.data
      const claves = clavesDeAtributos(diff)
      if (!diff.visible || claves.length === 0) {
        guardar({ estado: 'listo', diff, campos: undefined })
        return
      }
      const campos = await leerCamposDeAtributos({
        tabla: diff.tabla,
        origenId: diff.origenId,
        claves,
      }).catch(() => null)
      guardar({ estado: 'listo', diff, campos: campos?.ok ? campos.data : undefined })
    })()
    return () => {
      vigente = false
    }
  }, [abierto, id, clave])

  const lectura: LecturaDelDiff =
    id === null
      ? { estado: 'listo', diff: { id: 0, visible: false }, campos: undefined }
      : guardada?.clave === clave
        ? guardada.lectura
        : { estado: 'leyendo' }
  return {
    lectura,
    reintentar: () => {
      setIntento((n) => n + 1)
    },
  }
}
