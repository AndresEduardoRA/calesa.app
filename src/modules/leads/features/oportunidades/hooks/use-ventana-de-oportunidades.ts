'use client'

import { useEffect, useRef, useState } from 'react'
import { enElTope } from '@/shared/lib/paginacion'
import { avisarError } from '@/shared/ui/toasts'
import { leerMasOportunidades } from '../../../composicion.client'
import type { OportunidadDelLead } from '../../../entities/oportunidad'
import {
  cursorDeOportunidades,
  ponerOportunidadEnLaVentana,
  sumarPaginaDeOportunidades,
  type VentanaDeOportunidades,
} from '../../../entities/ventana-de-oportunidades'

export type PaginaDeOportunidades = {
  oportunidades: readonly OportunidadDelLead[]
  hayMas: boolean
}

const MENSAJE_SIN_RED = { codigo: 'inesperado', mensaje: 'No pudimos llegar al servidor.' } as const

// Lo que trajo el servidor, por versión: lo que cambia una oportunidad o la lista (o si hay más) vuelve a sembrar lo cargado.
const firmaDe = (pagina: PaginaDeOportunidades) =>
  `${pagina.hayMas ? '1' : '0'}|${pagina.oportunidades.map((o) => `${o.id}:${o.actualizadoEn}`).join('|')}`

const desdeLaPagina = (pagina: PaginaDeOportunidades): VentanaDeOportunidades => ({
  lista: [...pagina.oportunidades],
  hayMas: pagina.hayMas,
})

// Lo cargado de las oportunidades de un lead. La primera página la trae el servidor y «Ver más» pide la siguiente desde el navegador, hasta el
// tope. Lo que vuelve de una action se pone en su lugar con la respuesta (nunca con `router.refresh()`: releería la primera página y
// reiniciaría lo cargado). Lo que trae el servidor manda: si su página cambia (otra pestaña movió algo), lo cargado vuelve a ella.
export function useVentanaDeOportunidades(leadId: string, inicial: PaginaDeOportunidades) {
  const firma = firmaDe(inicial)
  const [vista, setVista] = useState(firma)
  const [ventana, setVentana] = useState<VentanaDeOportunidades>(() => desdeLaPagina(inicial))
  const [cargando, setCargando] = useState(false)
  // Una lectura a la vez, con una marca propia: dos clics en el mismo instante ven el mismo estado.
  const enVuelo = useRef(false)
  // Las eliminadas que todavía no se restauraron: ninguna página que llegue las trae de vuelta.
  const quitadas = useRef(new Set<string>())
  // La firma vigente: una página pedida antes de que el servidor cambiara lo cargado se descarta.
  const vigente = useRef(firma)
  useEffect(() => {
    vigente.current = firma
    quitadas.current = new Set()
  }, [firma])
  if (vista !== firma) {
    setVista(firma)
    setVentana(desdeLaPagina(inicial))
  }

  async function cargarMas() {
    const cursor = cursorDeOportunidades(ventana.lista)
    if (enVuelo.current || !cursor) {
      return
    }
    enVuelo.current = true
    setCargando(true)
    const alPedir = vigente.current
    try {
      const leida = await leerMasOportunidades({ leadId, antes: cursor }).catch(() => null)
      if (!leida?.ok) {
        avisarError(leida?.error ?? MENSAJE_SIN_RED)
      } else if (vigente.current === alPedir) {
        const pagina = { lista: leida.data.oportunidades, hayMas: leida.data.hayMas }
        setVentana((antes) => sumarPaginaDeOportunidades(antes, pagina, quitadas.current))
      }
    } finally {
      enVuelo.current = false
      setCargando(false)
    }
  }

  return {
    ...ventana,
    cargando,
    enElTope: enElTope(ventana.lista),
    cargarMas,
    // Lo que vuelve de una action, en su lugar si cae en la ventana (o fuera, si quedó eliminada).
    poner: (una: OportunidadDelLead) => {
      if (una.eliminada) {
        quitadas.current.add(una.id)
      } else {
        quitadas.current.delete(una.id)
      }
      setVentana((antes) => ponerOportunidadEnLaVentana(antes, una))
    },
    quitar: (id: string) => {
      quitadas.current.add(id)
      setVentana((antes) => ({ ...antes, lista: antes.lista.filter((o) => o.id !== id) }))
    },
    // El cambio que se ve enseguida (vuelve con `poner` si la base lo rechaza): en el mismo lugar, sin reordenar.
    cambiarEnSitio: (id: string, cambio: (o: OportunidadDelLead) => OportunidadDelLead) => {
      setVentana((antes) => ({
        ...antes,
        lista: antes.lista.map((o) => (o.id === id ? cambio(o) : o)),
      }))
    },
  }
}
