'use client'

import { useEffect, useState } from 'react'
import type { LecturaDeLaTarjeta } from '../../../entities/tarjeta/lectura-de-la-tarjeta'
import { leerTarjeta } from '../../../areas/tarjeta/composicion.client'

export type EstadoDeLaLectura =
  | { tipo: 'cargando' }
  | { tipo: 'error' }
  | { tipo: 'sin_permiso' }
  | { tipo: 'lista'; lectura: LecturaDeLaTarjeta }

// La tarjeta de una versión de la fórmula, leída desde el navegador al montarse (el modal se monta la primera vez que se abre). `leerTarjeta` la recuerda 5 minutos por versión:
// cerrar y volver a abrir no lee de nuevo. «Reintentar» vuelve a pedirla. El mensaje de la base no se muestra nunca.
export function useLecturaDeLaTarjeta(formulaId: string): {
  estado: EstadoDeLaLectura
  reintentar: () => void
} {
  const [intento, setIntento] = useState(0)
  const llave = `${formulaId}:${String(intento)}`
  const [leida, setLeida] = useState<{ llave: string; estado: EstadoDeLaLectura } | null>(null)
  useEffect(() => {
    let vigente = true
    void leerTarjeta(formulaId).then((resultado) => {
      if (!vigente) {
        return
      }
      if (resultado.ok) {
        setLeida({ llave, estado: { tipo: 'lista', lectura: resultado.data } })
      } else {
        const tipo = resultado.error.codigo === 'sin_permiso' ? 'sin_permiso' : 'error'
        setLeida({ llave, estado: { tipo } })
      }
    })
    return () => {
      vigente = false
    }
  }, [formulaId, llave])
  return {
    estado: leida?.llave === llave ? leida.estado : { tipo: 'cargando' },
    reintentar: () => {
      setIntento((i) => i + 1)
    },
  }
}
