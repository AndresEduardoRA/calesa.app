'use client'

import { useEffect, useRef } from 'react'
import type { TipoDelBuscador } from '../../../entities/resultados'
import { registrarVisita } from '../actions/registrar-visita'

// Sin DOM: al montarse una ficha deja su visita, una vez por (tipo, id). Es un gesto de fondo: si falla no se
// dice nada, porque no es un error para la persona.
export function RegistrarVisita({ tipo, id }: { tipo: TipoDelBuscador; id: string }) {
  const ultima = useRef<string | null>(null)
  useEffect(() => {
    const clave = `${tipo}:${id}`
    if (ultima.current === clave) {
      return
    }
    ultima.current = clave
    void Promise.resolve(registrarVisita({ tipo, id })).catch(() => undefined)
  }, [tipo, id])
  return null
}
