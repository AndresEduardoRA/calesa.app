'use client'

import { useCallback, useState } from 'react'
import type { Formula } from '../../../entities/formula'
import {
  aplicarGrupo,
  type CambiosDelGrupo,
  type ErrorDelGrupo,
  type FilaQueEntro,
  type FilaQuitada,
} from '../../../entities/formula/grupos'

// El grupo abierto en la sección «Grupos» y, tras un «Aplicar» que no entró, sus errores por campo.
export type GrupoAbierto = { id: string; errores: ErrorDelGrupo[] }
// Lo que el último «Aplicar» que entró movió de filas, para decirlo una vez en la tarjeta de su grupo.
export type MovidasDelGrupo = { grupoId: string; entraron: FilaQueEntro[]; quitadas: FilaQuitada[] }

// Editar un grupo de la fórmula de trabajo (4.21-3c, C2, C4 y C5): una sola cosa abierta a la vez (quién puede abrir lo decide el editor). «Aplicar» pasa por
// `aplicarGrupo()`: un error deja el formulario abierto con sus errores; si entra, la fórmula de trabajo pasa a la nueva (`alAplicar`), que el editor valida y calcula.
export function useGruposDelEditor({
  trabajo,
  enCurso,
  alAplicar,
}: {
  trabajo: Formula
  // Se está guardando el borrador: nada se aplica.
  enCurso: boolean
  alAplicar: (formula: Formula) => void
}) {
  const [abierto, setAbierto] = useState<GrupoAbierto | null>(null)
  const [movidas, setMovidas] = useState<MovidasDelGrupo | null>(null)

  const aplicar = useCallback(
    (cambios: CambiosDelGrupo, tonos: ReadonlySet<string>) => {
      if (abierto === null || enCurso) return
      const r = aplicarGrupo(trabajo, abierto.id, cambios, tonos)
      if (!r.ok) {
        setAbierto({ id: abierto.id, errores: r.errores })
        return
      }
      alAplicar(r.formula)
      setAbierto(null)
      setMovidas({ grupoId: abierto.id, entraron: r.entraron, quitadas: r.quitadas })
    },
    [abierto, enCurso, trabajo, alAplicar],
  )

  return {
    abierto,
    movidas,
    abrir: (id: string) => {
      setMovidas(null)
      setAbierto({ id, errores: [] })
    },
    cancelar: () => {
      setAbierto(null)
    },
    aplicar,
  }
}
