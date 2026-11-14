'use client'

import { useCallback, useRef, useState } from 'react'
import type { CargaDeImagenes, ImagenDelVisor } from './tipos'

export type EstadoDeImagenes =
  | { estado: 'sin_pedir' }
  | { estado: 'leyendo' }
  | { estado: 'listas'; imagenes: readonly ImagenDelVisor[] }
  | { estado: 'fallo' }

// Las imágenes de una entidad, pedidas una sola vez y recién cuando alguien las quiere ver (`pedir()` al interactuar): una lista nunca baja las
// fotos de todas sus filas. Un fallo deja pedir de nuevo.
export function useImagenes(cargar: CargaDeImagenes) {
  const [estado, setEstado] = useState<EstadoDeImagenes>({ estado: 'sin_pedir' })
  const enVuelo = useRef(false)
  const pedir = useCallback(() => {
    if (enVuelo.current || estado.estado === 'listas' || estado.estado === 'leyendo') return
    enVuelo.current = true
    setEstado({ estado: 'leyendo' })
    void cargar()
      .then((imagenes) => {
        setEstado(imagenes === null ? { estado: 'fallo' } : { estado: 'listas', imagenes })
      })
      .catch(() => {
        setEstado({ estado: 'fallo' })
      })
      .finally(() => {
        enVuelo.current = false
      })
  }, [cargar, estado.estado])
  return { ...estadoConImagenes(estado), pedir }
}

function estadoConImagenes(estado: EstadoDeImagenes) {
  return {
    estado,
    imagenes: estado.estado === 'listas' ? estado.imagenes : null,
  }
}
