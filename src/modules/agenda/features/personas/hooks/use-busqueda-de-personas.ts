'use client'

import { useEffect, useState } from 'react'
import type { Resultado } from '@/shared/lib/errores'
import { textoDeBusqueda, type PersonasEncontradas } from '../../../entities/personas'

// Lo que dibuja el selector: nada que buscar todavía, buscando, una lista, sin coincidencias o un error con «Reintentar».
export type EstadoDeBusqueda =
  | { tipo: 'escribe' }
  | { tipo: 'cargando' }
  | { tipo: 'lista'; encontradas: PersonasEncontradas }
  | { tipo: 'vacia' }
  | { tipo: 'error'; mensaje: string }

const RETRASO_EN_MS = 250

type Lector = (texto: string) => Promise<Resultado<PersonasEncontradas>>

// Busca personas mientras se tipea: espera un momento, no pide con menos de 3 letras y descarta la respuesta de una búsqueda que ya no es la vigente.
// El estado se deriva: lo guardado vale sólo si es de la búsqueda de ahora; si no, se está buscando.
export function useBusquedaDePersonas(leer: Lector) {
  const [texto, setTexto] = useState('')
  const [intento, setIntento] = useState(0)
  const [respuesta, setRespuesta] = useState<{ clave: string; estado: EstadoDeBusqueda } | null>(
    null,
  )
  const buscado = textoDeBusqueda(texto)
  const clave = `${intento}:${buscado ?? ''}`

  useEffect(() => {
    if (buscado === null) {
      return
    }
    let vigente = true
    const espera = setTimeout(() => {
      void leer(buscado).then((leida) => {
        if (!vigente) {
          return
        }
        const estado: EstadoDeBusqueda = !leida.ok
          ? { tipo: 'error', mensaje: leida.error.mensaje }
          : leida.data.personas.length === 0
            ? { tipo: 'vacia' }
            : { tipo: 'lista', encontradas: leida.data }
        setRespuesta({ clave, estado })
      })
    }, RETRASO_EN_MS)
    return () => {
      vigente = false
      clearTimeout(espera)
    }
  }, [buscado, clave, leer])

  const estado: EstadoDeBusqueda =
    buscado === null
      ? { tipo: 'escribe' }
      : respuesta?.clave === clave
        ? respuesta.estado
        : { tipo: 'cargando' }

  return {
    texto,
    setTexto,
    estado,
    reintentar: () => {
      setIntento((n) => n + 1)
    },
  }
}
