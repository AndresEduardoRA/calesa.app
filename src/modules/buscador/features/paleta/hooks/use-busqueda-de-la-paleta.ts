'use client'

import { useEffect, useMemo, useState } from 'react'
import { interpretarBusqueda } from '@/modules/leads/client'
import { MENSAJE_INESPERADO, fallo, type ErrorApp, type Resultado } from '@/shared/lib/errores'
import { BUSCAR_POR_SECCION } from '../../../composicion.client'
import { estadoDeError, type EstadoDeLaBusqueda } from '../../../entities/estado-de-la-paleta'
import {
  agruparResultados,
  seccionesQueBuscan,
  type LeidasPorTipo,
  type TipoDelBuscador,
} from '../../../entities/ranking'
import { pareceTelefono } from '../../../entities/telefono-en-la-busqueda'

// Cuánto se espera tras la última tecla antes de pedir: el buscador fue una fuente de pedidos inútiles en `ip`.
export const ESPERA_DE_LA_PALETA_MS = 250

export type LecturasDeLaPaleta = typeof BUSCAR_POR_SECCION

type Guardado = { clave: string; estado: EstadoDeLaBusqueda }

const REPOSO: EstadoDeLaBusqueda = { tipo: 'reposo' }
const ESPERANDO: EstadoDeLaBusqueda = { tipo: 'esperando' }

// Una lectura no lanza (D14 de 7.12-2), pero la paleta nunca revienta por una que lo haga.
async function leer(
  tipo: TipoDelBuscador,
  lecturas: LecturasDeLaPaleta,
  texto: string,
  signal: AbortSignal,
): Promise<readonly [TipoDelBuscador, Resultado<readonly unknown[]>]> {
  try {
    return [tipo, await lecturas[tipo]({ texto, signal })]
  } catch {
    return [tipo, fallo('inesperado', MENSAJE_INESPERADO)]
  }
}

async function buscar(
  pedido: string,
  lecturas: LecturasDeLaPaleta,
  signal: AbortSignal,
): Promise<EstadoDeLaBusqueda> {
  const interp = interpretarBusqueda(pedido)
  if (interp === null) {
    return REPOSO
  }
  // Un teléfono no se busca: la sección de leads no pide nada (D4).
  const porTelefono = pareceTelefono(pedido)
  const tipos = seccionesQueBuscan(interp).filter((tipo) => !(porTelefono && tipo === 'lead'))
  const leidas = await Promise.all(tipos.map((tipo) => leer(tipo, lecturas, interp.texto, signal)))
  const errores: ErrorApp[] = leidas.flatMap(([, r]) => (r.ok ? [] : [r.error]))
  const porTipo = Object.fromEntries(leidas.flatMap(([tipo, r]) => (r.ok ? [[tipo, r.data]] : [])))
  const secciones = agruparResultados(interp, porTipo as LeidasPorTipo)
  const primerError = errores[0]
  if (secciones.length === 0 && primerError) {
    return estadoDeError(primerError, typeof navigator === 'undefined' || navigator.onLine)
  }
  return { tipo: 'listo', secciones, parcial: errores.length > 0, porTelefono }
}

// Busca lo que se escribe en la paleta: espera, pide en paralelo las secciones que busca el texto y descarta la respuesta de una búsqueda ya
// cancelada. El estado se deriva: lo guardado vale sólo si es de la búsqueda de ahora; si no, se espera. Cerrada o bajo el mínimo: en reposo, sin
// espera ni pedido (los «Últimos abiertos» y las acciones los dibuja la paleta).
export function useBusquedaDeLaPaleta({
  texto,
  abierta,
  lecturas = BUSCAR_POR_SECCION,
}: {
  texto: string
  abierta: boolean
  lecturas?: LecturasDeLaPaleta
}): { estado: EstadoDeLaBusqueda; reintentar: () => void } {
  const [intento, setIntento] = useState(0)
  const [guardado, setGuardado] = useState<Guardado | null>(null)
  // Sin memoria: al cerrar se olvida lo leído y al reabrir se vuelve a pedir.
  if (!abierta && guardado !== null) {
    setGuardado(null)
  }
  const interp = useMemo(() => interpretarBusqueda(texto), [texto])
  // Lo que se pide, como texto: dos escrituras que se interpretan igual (espacios de más) no repiten la búsqueda.
  const pedido =
    abierta && interp !== null ? `${interp.soloNumero ? '#' : ''}${interp.texto}` : null
  const clave = `${String(intento)}|${pedido ?? ''}`

  useEffect(() => {
    if (pedido === null) {
      return
    }
    const controlador = new AbortController()
    const espera = setTimeout(() => {
      setGuardado({ clave, estado: { tipo: 'buscando' } })
      void buscar(pedido, lecturas, controlador.signal).then((estado) => {
        if (!controlador.signal.aborted) {
          setGuardado({ clave, estado })
        }
      })
    }, ESPERA_DE_LA_PALETA_MS)
    return () => {
      clearTimeout(espera)
      controlador.abort()
    }
  }, [pedido, clave, lecturas])

  const estado = pedido === null ? REPOSO : guardado?.clave === clave ? guardado.estado : ESPERANDO
  return {
    estado,
    reintentar: () => {
      setIntento((n) => n + 1)
    },
  }
}
