'use client'

import { useEffect, useRef, useState } from 'react'
import type { ErrorApp } from '@/shared/lib/errores'
import { TOPE_DE_LO_CARGADO } from '@/shared/lib/paginacion'
import { avisarError } from '@/shared/ui/toasts'
import { leerPaginaDeRecordatorios, leerRecordatorio } from '../../../composicion.client'
import {
  cursorDeRecordatorios,
  ponerEnLasListas,
  type CursorDeRecordatorios,
  type ListaCargada,
  type ListasDeRecordatorios,
  type PaginaDeRecordatorios,
} from '../../../entities/pagina-de-recordatorios'
import type { Recordatorio } from '../../../entities/recordatorios'

export type EstadoDeLectura = 'cargando' | 'error' | 'listo'
type Cual = 'pendientes' | 'completados'

type Lectura = {
  leadId: string
  estado: EstadoDeLectura
  listas: ListasDeRecordatorios
  puedoAgendar: boolean
  // Los completados no se leen hasta abrir su plegado.
  completados: 'sin_leer' | EstadoDeLectura
  // Los leídos por su id (el de la URL que no estaba cargado): el modal los ve, las listas no.
  sueltos: Recordatorio[]
}

const vacia = (leadId: string): Lectura => ({
  leadId,
  estado: 'cargando',
  listas: { pendientes: { lista: [], hayMas: false }, completados: null, hayCompletados: false },
  puedoAgendar: false,
  completados: 'sin_leer',
  sueltos: [],
})

const SIN_RED: ErrorApp = { codigo: 'inesperado', mensaje: 'No pudimos llegar al servidor.' }

// Una página de una de las dos listas. Nulo si falló (`avisar`: con un toast; la primera lectura lo
// dice en su lugar, con «Reintentar»).
async function leerPagina(
  leadId: string,
  cual: Cual,
  desde: CursorDeRecordatorios | null,
  avisar = true,
): Promise<PaginaDeRecordatorios | null> {
  const leido = await leerPaginaDeRecordatorios({
    leadId,
    completados: cual === 'completados',
    desde,
  }).catch(() => null)
  if (!leido?.ok) {
    if (avisar) {
      avisarError(leido?.error ?? SIN_RED)
    }
    return null
  }
  return leido.data
}

// Una página más sobre lo cargado, sin repetir y nunca más que el tope (lo que pasa se corta).
function sumar(cargada: ListaCargada | null, pagina: PaginaDeRecordatorios): ListaCargada {
  const antes = cargada?.lista ?? []
  const vistos = new Set(antes.map((r) => r.id))
  const lista = [...antes, ...pagina.recordatorios.filter((r) => !vistos.has(r.id))]
  return {
    lista: lista.slice(0, TOPE_DE_LO_CARGADO),
    hayMas: pagina.hayMas || lista.length > TOPE_DE_LO_CARGADO,
  }
}

// Pone uno (o lo saca, si ya no está) en las listas y entre los sueltos.
function conUno(lectura: Lectura, uno: Recordatorio & { eliminado?: boolean }): Lectura {
  return {
    ...lectura,
    listas: ponerEnLasListas(lectura.listas, uno),
    sueltos: lectura.sueltos.flatMap((r) => (r.id !== uno.id ? [r] : uno.eliminado ? [] : [uno])),
  }
}

// Lo recargado por su id (lo está editando el modal): en su lugar y, si cae fuera de lo cargado,
// entre los sueltos (el modal lo sigue viendo, con su versión nueva).
function conUnoAunqueQuedeFuera(lectura: Lectura, uno: Recordatorio): Lectura {
  const puesto = conUno(lectura, uno)
  const { pendientes, completados } = puesto.listas
  const dentro = [...pendientes.lista, ...(completados?.lista ?? [])].some((r) => r.id === uno.id)
  return dentro || puesto.sueltos.some((r) => r.id === uno.id)
    ? puesto
    : { ...puesto, sueltos: [...puesto.sueltos, uno] }
}

// Saca uno que ya no está (lo dijo su lectura por id) de donde esté.
function sinUno(lectura: Lectura, id: string): Lectura {
  const fuera = (cargada: ListaCargada) => ({
    ...cargada,
    lista: cargada.lista.filter((r) => r.id !== id),
  })
  const { pendientes, completados } = lectura.listas
  return {
    ...lectura,
    listas: {
      ...lectura.listas,
      pendientes: fuera(pendientes),
      completados: completados && fuera(completados),
    },
    sueltos: lectura.sueltos.filter((r) => r.id !== id),
  }
}

// La primera página de pendientes, al montar (la pestaña o la sección se abrió) y al reintentar. Una
// lectura de otro lead (se cambió de lead) no vale.
function usePrimeraPagina(leadId: string) {
  const [lectura, setLectura] = useState<Lectura>(() => vacia(leadId))
  const [intento, setIntento] = useState(0)
  useEffect(() => {
    let vigente = true
    void leerPagina(leadId, 'pendientes', null, false).then((pagina) => {
      if (!vigente) {
        return
      }
      setLectura(
        pagina
          ? {
              ...vacia(leadId),
              estado: 'listo',
              listas: {
                pendientes: { lista: pagina.recordatorios, hayMas: pagina.hayMas },
                completados: null,
                hayCompletados: pagina.hayCompletados,
              },
              puedoAgendar: pagina.puedoAgendar,
            }
          : { ...vacia(leadId), estado: 'error' },
      )
    })
    return () => {
      vigente = false
    }
  }, [leadId, intento])
  return {
    lectura: lectura.leadId === leadId ? lectura : vacia(leadId),
    setLectura,
    reintentar: () => {
      setLectura(vacia(leadId))
      setIntento((n) => n + 1)
    },
  }
}

// Los recordatorios de quien mira sobre un lead, en dos listas por cursor (los pendientes al abrir;
// los completados al abrir su plegado), con «Ver más» hasta el tope. Ninguna lectura cuesta más con
// lo cargado: buscar uno o «Recargar» tras un conflicto lo leen por su id.
export function useListasDeRecordatorios(leadId: string) {
  const { lectura, setLectura, reintentar } = usePrimeraPagina(leadId)
  const [cargandoMas, setCargandoMas] = useState<Cual | null>(null)
  const enVuelo = useRef(new Set<Cual>())
  const deEste = (cambio: (antes: Lectura) => Lectura) => {
    setLectura((antes) => (antes.leadId === leadId ? cambio(antes) : antes))
  }

  // Una página más de una lista (una lectura a la vez por lista: el doble clic no pide dos).
  async function cargarMas(cual: Cual, desde: CursorDeRecordatorios | null) {
    if (enVuelo.current.has(cual)) {
      return
    }
    enVuelo.current.add(cual)
    setCargandoMas(cual)
    try {
      const pagina = await leerPagina(leadId, cual, desde)
      if (pagina) {
        deEste((antes) => ({
          ...antes,
          ...(cual === 'completados' ? { completados: 'listo' } : {}),
          listas: { ...antes.listas, [cual]: sumar(antes.listas[cual], pagina) },
        }))
      } else if (cual === 'completados' && desde === null) {
        deEste((antes) => ({ ...antes, completados: 'error' }))
      }
    } finally {
      enVuelo.current.delete(cual)
      setCargandoMas(null)
    }
  }

  // Uno por su id: `null` si ya no está (ajeno, eliminado o inexistente, todo igual).
  async function leerUno(id: string): Promise<{ uno: Recordatorio | null } | null> {
    const leido = await leerRecordatorio(id).catch(() => null)
    if (!leido?.ok) {
      avisarError(leido?.error ?? SIN_RED)
      return null
    }
    return { uno: leido.data }
  }

  const { listas } = lectura
  return {
    ...lectura,
    cargandoMas,
    reintentar,
    verMasPendientes: () =>
      void cargarMas('pendientes', cursorDeRecordatorios(listas.pendientes.lista, false)),
    verMasCompletados: () =>
      void cargarMas('completados', cursorDeRecordatorios(listas.completados?.lista ?? [], true)),
    // Al abrir el plegado (o reintentar): la primera página de completados, una sola vez.
    abrirCompletados: () => {
      if (lectura.completados === 'sin_leer' || lectura.completados === 'error') {
        deEste((antes) => ({ ...antes, completados: 'cargando' }))
        void cargarMas('completados', null)
      }
    },
    // El de la URL que no está cargado: queda entre los sueltos. «hecha» = se buscó de verdad.
    buscar: async (id: string): Promise<'hecha' | 'fallo'> => {
      const leido = await leerUno(id)
      if (!leido) {
        return 'fallo'
      }
      const { uno } = leido
      deEste((antes) => ({
        ...antes,
        sueltos: [...antes.sueltos.filter((r) => r.id !== id), ...(uno ? [uno] : [])],
      }))
      return 'hecha'
    },
    // «Recargar» tras un conflicto: sólo ése, por su id, en su lugar (un pedido, cargue lo que cargue).
    recargarUno: async (id: string) => {
      const leido = await leerUno(id)
      if (leido) {
        const { uno } = leido
        deEste((antes) => (uno ? conUnoAunqueQuedeFuera(antes, uno) : sinUno(antes, id)))
      }
    },
    // Lo que vuelve de una acción: en la lista que le toca, si cae dentro de lo cargado.
    poner: (uno: Recordatorio & { eliminado?: boolean }) => {
      deEste((antes) => conUno(antes, uno))
    },
  }
}

export type ListasDeRecordatoriosDelLead = ReturnType<typeof useListasDeRecordatorios>
