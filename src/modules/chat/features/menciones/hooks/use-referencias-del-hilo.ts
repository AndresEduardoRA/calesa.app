'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { leerReferencias } from '../../../composicion.client'
import { claveDeReferencia, mencionesDelCuerpo, type Referencia } from '../../../entities/menciones'
import type { Mensaje } from '../../../entities/mensajes'
import {
  referenciaDeFicha,
  referenciasSinResolver,
  type EstadoDeReferencia,
  type MapaDeReferencias,
} from '../../../entities/referencias'
import type { LectorDeReferencias } from '../../../entities/repositorios'

type Props = {
  mensajes: readonly Mensaje[]
  // La mención abierta por la URL, si el hilo todavía no la leyó (un enlace pegado).
  adicional?: Referencia | null
  // Se inyecta en la prueba; en la pantalla, la lectura real.
  leer?: LectorDeReferencias
}

// Lo que mencionan los mensajes vivos y sus fichas (de vehículo, lead o cotización), sin repetir.
function referenciasDe(mensajes: readonly Mensaje[]): Referencia[] {
  const referencias: Referencia[] = []
  for (const m of mensajes) {
    if (m.eliminadoEn !== null) {
      continue
    }
    if (m.cuerpo !== null) {
      referencias.push(...mencionesDelCuerpo(m.cuerpo))
    }
    const deFicha = referenciaDeFicha(m.ficha)
    if (deFicha !== null) {
      referencias.push(deFicha)
    }
  }
  return referencias
}

// Resuelve lo mencionado en el hilo bajo la RLS de quien mira: una lectura por cambio de mensajes (por clase adentro), sólo de lo que aún no se
// resolvió. Un mensaje nuevo por Realtime lee únicamente sus referencias. Una lectura que falla deja esas referencias «pendientes de reintentar»:
// el chip lo dice y un clic repite la lectura; el hilo no se cae.
export function useReferenciasDelHilo({
  mensajes,
  adicional = null,
  leer = leerReferencias,
}: Props) {
  const [resueltas, setResueltas] = useState<MapaDeReferencias>(new Map())
  const [fallidas, setFallidas] = useState<ReadonlySet<string>>(new Set())
  const enVuelo = useRef(new Set<string>())
  const [intento, setIntento] = useState(0)

  useEffect(() => {
    const faltan = referenciasSinResolver(
      [...referenciasDe(mensajes), ...(adicional === null ? [] : [adicional])],
      resueltas,
    ).filter((r) => !enVuelo.current.has(claveDeReferencia(r)))
    if (faltan.length === 0) {
      return
    }
    const claves = faltan.map(claveDeReferencia)
    for (const clave of claves) {
      enVuelo.current.add(clave)
    }
    let respuesta: ReturnType<LectorDeReferencias>
    try {
      respuesta = leer(faltan)
    } catch {
      respuesta = Promise.resolve({
        ok: false,
        error: { codigo: 'inesperado', mensaje: 'No se pudo cargar.' },
      })
    }
    void respuesta
      .catch(() => ({ ok: false as const, error: { codigo: 'inesperado' as const, mensaje: '' } }))
      .then((resultado) => {
        for (const clave of claves) {
          enVuelo.current.delete(clave)
        }
        if (resultado.ok) {
          setResueltas((antes) => new Map([...antes, ...resultado.data]))
          setFallidas((antes) => new Set([...antes].filter((c) => !claves.includes(c))))
        } else {
          setFallidas((antes) => new Set([...antes, ...claves]))
        }
      })
  }, [mensajes, adicional, intento, leer, resueltas])

  // Repite la lectura de las que fallaron.
  const reintentar = useCallback(() => {
    setFallidas(new Set())
    setIntento((n) => n + 1)
  }, [])

  const estadoDe = useCallback(
    (referencia: Referencia): EstadoDeReferencia | 'error' | null => {
      const clave = claveDeReferencia(referencia)
      return resueltas.get(clave) ?? (fallidas.has(clave) ? 'error' : null)
    },
    [resueltas, fallidas],
  )

  return { resueltas, estadoDe, reintentar }
}
