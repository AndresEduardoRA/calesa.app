'use client'

import { useState } from 'react'
import type { OportunidadDelLead } from '../../../entities/oportunidad'
import {
  ponerOportunidadEnLaVentana,
  type VentanaDeOportunidades,
} from '../../../entities/ventana-de-oportunidades'

export type PaginaDeOportunidades = {
  oportunidades: readonly OportunidadDelLead[]
  hayMas: boolean
}

// Lo que trajo el servidor, por versión: lo que cambia una oportunidad o la lista (o si hay más) vuelve a sembrar lo cargado.
const firmaDe = (pagina: PaginaDeOportunidades) =>
  `${pagina.hayMas ? '1' : '0'}|${pagina.oportunidades.map((o) => `${o.id}:${o.actualizadoEn}`).join('|')}`

const desdeLaPagina = (pagina: PaginaDeOportunidades): VentanaDeOportunidades => ({
  lista: [...pagina.oportunidades],
  hayMas: pagina.hayMas,
})

// Lo cargado de las oportunidades de un lead. La primera página la trae el servidor; lo que vuelve de una action se pone en su lugar con
// la respuesta (nunca con `router.refresh()`: releería la primera página y reiniciaría lo cargado). Lo que trae el servidor manda: si
// su página cambia (otra pestaña movió algo), lo cargado vuelve a ella.
export function useVentanaDeOportunidades(inicial: PaginaDeOportunidades) {
  const firma = firmaDe(inicial)
  const [vista, setVista] = useState(firma)
  const [ventana, setVentana] = useState<VentanaDeOportunidades>(() => desdeLaPagina(inicial))
  if (vista !== firma) {
    setVista(firma)
    setVentana(desdeLaPagina(inicial))
  }

  return {
    ...ventana,
    // Lo que vuelve de una action, en su lugar si cae en la ventana (o fuera, si quedó eliminada).
    poner: (una: OportunidadDelLead) => {
      setVentana((antes) => ponerOportunidadEnLaVentana(antes, una))
    },
    quitar: (id: string) => {
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
