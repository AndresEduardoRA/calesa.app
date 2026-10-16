'use client'

import { useState } from 'react'
import { avisarError } from '@/shared/ui/toasts'
import { leerMasSeguimientos } from '../../../composicion.client'
import { PAGINAS_PARA_BUSCAR_UN_SEGUIMIENTO } from '../../../entities/edicion-de-seguimiento'
import {
  conSeguimiento,
  cursorDeSeguimientos,
  sumarPagina,
  TAMANO_DE_PAGINA_DE_SEGUIMIENTOS,
  type PaginaDeSeguimientos,
  type Seguimiento,
} from '../../../entities/seguimiento'

// Lo que identifica la página que trae el servidor: si cambia (se volvió a leer la ficha), la lista
// local se vuelve a sembrar con lo que llegó.
const firmaDe = (pagina: PaginaDeSeguimientos) =>
  `${String(pagina.puedoAnotar)}|${String(pagina.hayMas)}|${pagina.seguimientos
    .map((s) => `${s.id}:${s.actualizadoEn}`)
    .join(',')}`

type Leido = { lista: Seguimiento[]; hayMas: boolean; puedoAnotar: boolean }

// Páginas desde `desde` (con su cursor) hasta que `basta` diga que alcanza, no haya más o se lean
// `tope`. Nulo si una lectura falló (ya se avisó).
async function leerPaginas(
  leadId: string,
  desde: Leido,
  basta: (lista: readonly Seguimiento[]) => boolean,
  tope: number,
): Promise<Leido | null> {
  let actual = desde
  for (let leidas = 0; leidas < tope && actual.hayMas && !basta(actual.lista); leidas += 1) {
    const leido = await leerMasSeguimientos({
      leadId,
      antes: cursorDeSeguimientos(actual.lista),
    }).catch(() => null)
    if (!leido?.ok) {
      avisarError(
        leido?.error ?? { codigo: 'inesperado', mensaje: 'No pudimos llegar al servidor.' },
      )
      return null
    }
    actual = {
      lista: sumarPagina(actual.lista, leido.data.seguimientos),
      hayMas: leido.data.hayMas,
      puedoAnotar: leido.data.puedoAnotar,
    }
  }
  return actual
}

// La línea de tiempo de un lead: la primera página la trae quien la monta (el servidor en la ficha, el
// navegador en el drawer); lo que se anota, edita o elimina se pone en su lugar con la respuesta (no
// se vuelve a leer la ficha), y «Ver más» pide la siguiente desde el navegador. `releer` vuelve a
// leer desde el principio tanto como había cargado (lo que trae «Recargar» tras un conflicto, sin
// perder lo de «Ver más»); `buscar` pide páginas hasta encontrar uno (el que nombra la URL al recargar).
export function useSeguimientos(leadId: string, inicial: PaginaDeSeguimientos) {
  const firma = firmaDe(inicial)
  const [vista, setVista] = useState(firma)
  const [leido, setLeido] = useState<Leido>({
    lista: inicial.seguimientos,
    hayMas: inicial.hayMas,
    puedoAnotar: inicial.puedoAnotar,
  })
  const [cargando, setCargando] = useState(false)
  if (vista !== firma) {
    setVista(firma)
    setLeido({
      lista: inicial.seguimientos,
      hayMas: inicial.hayMas,
      puedoAnotar: inicial.puedoAnotar,
    })
  }

  async function leer(
    desde: Leido,
    basta: (lista: readonly Seguimiento[]) => boolean,
    tope: number,
  ) {
    if (cargando) {
      return
    }
    setCargando(true)
    try {
      const nuevo = await leerPaginas(leadId, desde, basta, tope)
      if (nuevo) {
        setLeido(nuevo)
      }
    } finally {
      setCargando(false)
    }
  }

  return {
    ...leido,
    cargando,
    cargarMas: () => leer(leido, () => false, 1),
    releer: () => {
      const cuantos = Math.max(leido.lista.length, 1)
      return leer(
        { lista: [], hayMas: true, puedoAnotar: leido.puedoAnotar },
        (lista) => lista.length >= cuantos,
        Math.ceil(cuantos / TAMANO_DE_PAGINA_DE_SEGUIMIENTOS) + 1,
      )
    },
    buscar: (id: string) =>
      leer(leido, (lista) => lista.some((s) => s.id === id), PAGINAS_PARA_BUSCAR_UN_SEGUIMIENTO),
    // Lo que vuelve de una RPC: en su lugar, o fuera si quedó eliminado.
    poner: (uno: Seguimiento) => {
      setLeido((antes) => ({ ...antes, lista: conSeguimiento(antes.lista, uno) }))
    },
  }
}

export type Seguimientos = ReturnType<typeof useSeguimientos>
