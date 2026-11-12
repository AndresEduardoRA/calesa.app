'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { leerFichas } from '../../../composicion.client'
import {
  claveDeFicha,
  fichasSinResolver,
  type ClaseDeFicha,
  type EstadoDeFicha,
  type MapaDeFichas,
  type PedidoDeFicha,
} from '../../../entities/fichas'
import type { Mensaje } from '../../../entities/mensajes'
import type { LectorDeFichas } from '../../../entities/repositorios'
import type { ContextoDeFichas } from '../contexto-de-fichas'

// Las fichas de tarea y de evento de los mensajes vivos cuya FK sigue puesta.
function pedidasDe(mensajes: readonly Mensaje[]): PedidoDeFicha[] {
  const pedidas: PedidoDeFicha[] = []
  for (const m of mensajes) {
    const f = m.ficha
    if (m.eliminadoEn === null && f !== null && f.id !== null) {
      if (f.tipo === 'tarea' || f.tipo === 'evento') {
        pedidas.push({ clase: f.tipo, id: f.id })
      }
    }
  }
  return pedidas
}

// Resuelve las fichas del hilo bajo la RLS de quien mira: una lectura por cambio de mensajes, sólo de lo que aún no se resolvió (un mensaje nuevo por
// Realtime lee únicamente lo suyo). Una lectura que falla deja esas fichas «No se pudo cargar · Reintentar»: el hilo no se cae. Sin Realtime de tareas:
// si otra persona completa una, se ve al releer el hilo.
export function useFichasDelHilo(
  mensajes: readonly Mensaje[],
  leer: LectorDeFichas = leerFichas,
): ContextoDeFichas {
  const [resueltas, setResueltas] = useState<MapaDeFichas>(new Map())
  const [fallidas, setFallidas] = useState<ReadonlySet<string>>(new Set())
  const enVuelo = useRef(new Set<string>())
  const [intento, setIntento] = useState(0)

  useEffect(() => {
    const faltan = fichasSinResolver(pedidasDe(mensajes), resueltas).filter(
      (p) => !enVuelo.current.has(claveDeFicha(p.clase, p.id)),
    )
    if (faltan.length === 0) {
      return
    }
    const claves = faltan.map((p) => claveDeFicha(p.clase, p.id))
    for (const clave of claves) {
      enVuelo.current.add(clave)
    }
    let respuesta: ReturnType<LectorDeFichas>
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
  }, [mensajes, intento, leer, resueltas])

  const reintentar = useCallback(() => {
    setFallidas(new Set())
    setIntento((n) => n + 1)
  }, [])

  const estadoDe = useCallback(
    (clase: ClaseDeFicha, id: string): EstadoDeFicha | 'error' | null => {
      const clave = claveDeFicha(clase, id)
      return resueltas.get(clave) ?? (fallidas.has(clave) ? 'error' : null)
    },
    [resueltas, fallidas],
  )

  const releer = useCallback((clase: ClaseDeFicha, id: string) => {
    const clave = claveDeFicha(clase, id)
    setResueltas((antes) => new Map([...antes].filter(([c]) => c !== clave)))
  }, [])

  const marcarCompletada = useCallback((id: string, completada: boolean, actualizadoEn: string) => {
    const clave = claveDeFicha('tarea', id)
    setResueltas((antes) => {
      const actual = antes.get(clave)
      if (actual?.situacion !== 'visible' || actual.datos.clase !== 'tarea') {
        return antes
      }
      const datos = {
        ...actual.datos,
        estado: completada ? ('completado' as const) : ('pendiente' as const),
        completadaEn: completada ? actualizadoEn : null,
        actualizadoEn,
      }
      return new Map(antes).set(clave, { ...actual, datos })
    })
  }, [])

  return { estadoDe, reintentar, releer, marcarCompletada }
}
