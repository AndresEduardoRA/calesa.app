'use client'

import { useState } from 'react'
import { avisarError } from '@/shared/ui/toasts'
import { leerMasSeguimientos } from '../../../composicion.client'
import {
  conSeguimiento,
  cursorDeSeguimientos,
  sumarPagina,
  type PaginaDeSeguimientos,
  type Seguimiento,
} from '../../../entities/seguimiento'

// Lo que identifica la página que trae el servidor: si cambia (se volvió a leer la ficha), la lista
// local se vuelve a sembrar con lo que llegó.
const firmaDe = (pagina: PaginaDeSeguimientos) =>
  `${String(pagina.puedoAnotar)}|${String(pagina.hayMas)}|${pagina.seguimientos
    .map((s) => `${s.id}:${s.actualizadoEn}`)
    .join(',')}`

// La línea de tiempo de un lead: la primera página la trae el servidor; lo que se anota, edita o
// elimina se pone en su lugar con la respuesta (no se vuelve a leer la ficha), y «Ver más» pide la
// siguiente desde el navegador.
export function useSeguimientos(leadId: string, inicial: PaginaDeSeguimientos) {
  const firma = firmaDe(inicial)
  const [vista, setVista] = useState(firma)
  const [lista, setLista] = useState<Seguimiento[]>(inicial.seguimientos)
  const [hayMas, setHayMas] = useState(inicial.hayMas)
  const [cargando, setCargando] = useState(false)
  if (vista !== firma) {
    setVista(firma)
    setLista(inicial.seguimientos)
    setHayMas(inicial.hayMas)
  }

  async function cargarMas() {
    if (cargando) {
      return
    }
    setCargando(true)
    try {
      const leido = await leerMasSeguimientos({ leadId, antes: cursorDeSeguimientos(lista) })
      if (leido.ok) {
        setLista((antes) => sumarPagina(antes, leido.data.seguimientos))
        setHayMas(leido.data.hayMas)
      } else {
        avisarError(leido.error)
      }
    } catch {
      avisarError({ codigo: 'inesperado', mensaje: 'No pudimos llegar al servidor.' })
    } finally {
      setCargando(false)
    }
  }

  return {
    lista,
    hayMas,
    cargando,
    cargarMas,
    // Lo que vuelve de una RPC: en su lugar, o fuera si quedó eliminado.
    poner: (uno: Seguimiento) => {
      setLista((antes) => conSeguimiento(antes, uno))
    },
  }
}

export type Seguimientos = ReturnType<typeof useSeguimientos>
