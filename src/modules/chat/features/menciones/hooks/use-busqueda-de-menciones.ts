'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  agruparResultados,
  buscarCotizaciones,
  buscarLeads,
  buscarVehiculos,
  seccionesQueBuscan,
  type LeidasPorTipo,
  type Seccion,
} from '@/modules/buscador/client'
import { interpretarBusqueda } from '@/modules/leads/client'
import type { Resultado } from '@/shared/lib/errores'
import { leerPersonas } from '../../../composicion.client'
import {
  etiquetaDeMencion,
  type ClaseDeMencion,
  type OpcionDeMencion,
} from '../../../entities/menciones'
import {
  MINIMO_DE_BUSQUEDA_DE_PERSONAS,
  type PersonasEncontradas,
} from '../../../entities/personas'

export type GrupoDeOpciones = { clase: ClaseDeMencion; titulo: string; opciones: OpcionDeMencion[] }

// Lo que dibuja el selector: bajo el mínimo, buscando, una lista (con un aviso si una lectura no llegó), sin coincidencias o el error con «Reintentar».
export type EstadoDelSelector =
  | { tipo: 'minimo' }
  | { tipo: 'cargando' }
  | { tipo: 'vacia' }
  | { tipo: 'error'; mensaje: string }
  | { tipo: 'lista'; grupos: GrupoDeOpciones[]; parcial: boolean }

const ESTADO_MINIMO: EstadoDelSelector = { tipo: 'minimo' }
const ESTADO_CARGANDO: EstadoDelSelector = { tipo: 'cargando' }
const RETRASO_EN_MS = 250
const POR_CLASE = 5
const TITULOS: Record<ClaseDeMencion, string> = {
  lead: 'Leads',
  vehiculo: 'Vehículos',
  cotizacion: 'Cotizaciones',
  usuario: 'Personas',
}
const SIN_CONEXION = 'No pudimos llegar al servidor.'

function gruposDeSeccion(seccion: Seccion): GrupoDeOpciones {
  switch (seccion.tipo) {
    case 'lead':
      return {
        clase: 'lead',
        titulo: TITULOS.lead,
        opciones: seccion.filas.map((f) => ({
          clase: 'lead',
          id: f.id,
          etiqueta: etiquetaDeMencion(f.nombre ?? '', `Lead ${f.numero_visible ?? ''}`.trim()),
          detalle: f.numero_visible === null ? null : `N.º ${String(f.numero_visible)}`,
        })),
      }
    case 'vehiculo':
      return {
        clase: 'vehiculo',
        titulo: TITULOS.vehiculo,
        opciones: seccion.filas.map((f) => ({
          clase: 'vehiculo',
          id: f.id,
          etiqueta: etiquetaDeMencion(f.titulo, 'Vehículo'),
          detalle: f.vin ?? f.lote,
        })),
      }
    case 'cotizacion':
      return {
        clase: 'cotizacion',
        titulo: TITULOS.cotizacion,
        opciones: seccion.filas.map((f) => ({
          clase: 'cotizacion',
          id: f.id,
          etiqueta: etiquetaDeMencion(
            `${String(f.numero)} ${f.titulo ?? ''}`,
            `Cotización ${String(f.numero)}`,
          ),
          detalle: f.estado,
        })),
      }
  }
}

type Interpretada = NonNullable<ReturnType<typeof interpretarBusqueda>>
type Lectura = readonly [string, Resultado<unknown>]

const SIN_RESPUESTA = <T>(): Resultado<T> => ({
  ok: false,
  error: { codigo: 'inesperado', mensaje: SIN_CONEXION },
})
const atrapar = <T>(p: Promise<Resultado<T>>): Promise<Resultado<T>> =>
  p.catch(() => SIN_RESPUESTA<T>())

function lecturaDe(tipo: string, interp: Interpretada, signal: AbortSignal): Promise<Lectura> {
  const pedido = { texto: interp.texto, signal }
  const lectura =
    tipo === 'lead'
      ? buscarLeads(pedido)
      : tipo === 'vehiculo'
        ? buscarVehiculos(pedido)
        : buscarCotizaciones(pedido)
  return atrapar<unknown>(lectura).then((r) => [tipo, r] as const)
}

function gruposDePersonas(personas: PersonasEncontradas): GrupoDeOpciones[] {
  if (personas.personas.length === 0) {
    return []
  }
  const opciones = personas.personas.slice(0, POR_CLASE).map((p) => ({
    clase: 'usuario' as const,
    id: p.id,
    etiqueta: etiquetaDeMencion(p.nombre, 'Persona'),
    detalle: null,
  }))
  return [{ clase: 'usuario', titulo: TITULOS.usuario, opciones }]
}

async function leer(consulta: string, yo: string, signal: AbortSignal): Promise<EstadoDelSelector> {
  const interp = interpretarBusqueda(consulta)
  if (interp === null) {
    return { tipo: 'minimo' }
  }
  const pideLasPersonas =
    !interp.soloNumero && interp.texto.length >= MINIMO_DE_BUSQUEDA_DE_PERSONAS
  const [secciones, personas] = await Promise.all([
    Promise.all(seccionesQueBuscan(interp).map((tipo) => lecturaDe(tipo, interp, signal))),
    pideLasPersonas ? atrapar(leerPersonas(interp.texto, yo)) : null,
  ])
  const resultados: Resultado<unknown>[] = [
    ...secciones.map((l) => l[1]),
    ...(personas ? [personas] : []),
  ]
  const fallo = resultados.find((r) => !r.ok)
  const porTipo = Object.fromEntries(
    secciones.flatMap(([tipo, r]) => (r.ok ? [[tipo, r.data]] : [])),
  )
  const grupos = [
    ...agruparResultados(interp, porTipo as LeidasPorTipo).map(gruposDeSeccion),
    ...(personas?.ok ? gruposDePersonas(personas.data) : []),
  ]
  if (grupos.length > 0) {
    return { tipo: 'lista', grupos, parcial: fallo !== undefined }
  }
  return fallo?.ok === false ? { tipo: 'error', mensaje: fallo.error.mensaje } : { tipo: 'vacia' }
}

// Busca lo que se menciona mientras se tipea: espera un momento, pide en paralelo las secciones que busca el texto (y las personas) y descarta la
// respuesta de una búsqueda ya cancelada. El estado se deriva: lo guardado vale sólo si es de la búsqueda de ahora; si no, se está buscando.
export function useBusquedaDeMenciones(consulta: string | null, yo: string) {
  const [intento, setIntento] = useState(0)
  const [respuesta, setRespuesta] = useState<{ clave: string; estado: EstadoDelSelector } | null>(
    null,
  )
  const minimo = useMemo(
    () => consulta !== null && interpretarBusqueda(consulta) === null,
    [consulta],
  )
  const buscado = consulta !== null && !minimo ? consulta : null
  const clave = `${String(intento)}:${buscado ?? ''}`

  useEffect(() => {
    if (buscado === null) {
      return
    }
    const controlador = new AbortController()
    const espera = setTimeout(() => {
      void leer(buscado, yo, controlador.signal).then((estado) => {
        if (!controlador.signal.aborted) {
          setRespuesta({ clave, estado })
        }
      })
    }, RETRASO_EN_MS)
    return () => {
      clearTimeout(espera)
      controlador.abort()
    }
  }, [buscado, clave, yo])

  // Constantes y no objetos nuevos: quien las mira (el selector) depende de su identidad.
  const estado: EstadoDelSelector = minimo
    ? ESTADO_MINIMO
    : respuesta?.clave === clave
      ? respuesta.estado
      : ESTADO_CARGANDO
  return {
    estado,
    reintentar: () => {
      setIntento((n) => n + 1)
    },
  }
}
