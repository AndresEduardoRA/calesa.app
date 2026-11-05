'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import { useState } from 'react'
import { CLAVE_DE_CURSOR } from '@/shared/lib/filtros'
import {
  leerTextoDelPanel,
  queSePuedeTraer,
  type ContextoDeTraer,
  type TextoDelPanel,
} from '../../../entities/texto-del-panel'
import type { AltaDelPanel } from '../alta-del-panel'
import { CLAVE_DE_ALTA, CLAVE_DE_BUSQUEDA, type VistaDeAlta } from '../claves'
import type { ListaLeida } from './use-lista-del-panel'

const PARAMETROS = {
  [CLAVE_DE_ALTA]: parseAsString,
  [CLAVE_DE_BUSQUEDA]: parseAsString,
  [CLAVE_DE_CURSOR]: parseAsString,
}

// La vista de alta del panel del vehículo (`?alta=mano|subasta`): se abre y se cierra en la URL sin ir al servidor, reemplazando la entrada del
// historial, como la lista. Sin `alta` (quien mira no puede dar de alta en el origen) la URL no abre nada, y `?alta=subasta` en un origen manual
// es «a mano». «Traer» deja lo tipeado en `?buscar=`, para que recargar muestre lo pegado, y marca en memoria que hay que consultar: recargar con
// `?alta=subasta` no vuelve a consultar, porque cada consulta gasta cuota de apibara.
type Opciones = {
  alta: AltaDelPanel | null
  esSubasta: boolean
  // Lo que dice `?buscar=`, lo que se entiende de eso y lo que devolvió la búsqueda.
  texto: string
  leido: TextoDelPanel
  leida: ListaLeida
}

export function useVistaDeAlta({ alta, esSubasta, texto, leido, leida }: Opciones) {
  const [url, escribir] = useQueryStates(PARAMETROS, { history: 'replace' })
  const [traerAlMontar, setTraerAlMontar] = useState(false)
  const pedida = url[CLAVE_DE_ALTA]
  const vista: VistaDeAlta | null =
    alta === null || (pedida !== 'mano' && pedida !== 'subasta')
      ? null
      : pedida === 'subasta' && alta.origen.tipo === 'subasta'
        ? 'subasta'
        : 'mano'
  const contexto: ContextoDeTraer = {
    puedeCargar: alta !== null,
    esSubasta,
    apibaraActiva: alta?.apibara.activa ?? false,
  }
  const delTexto = queSePuedeTraer(leido.traer, contexto)
  // Enter trae un enlace; un VIN o un lote, sólo si su búsqueda ya volvió vacía: las repetidas se marcan después de consultar a apibara y cada
  // consulta gasta cuota. El botón «Traer» sigue ahí para quien lo quiera igual. Lo tipeado va adelante de la URL: se lee de nuevo.
  function traerDe(tipeado: string, porEnter: boolean) {
    const ahora = leerTextoDelPanel(tipeado).traer
    if (!queSePuedeTraer(ahora, contexto).puede) {
      return
    }
    const sinCoincidencias =
      tipeado.trim() === texto.trim() && leida.estado === 'lista' && leida.pagina.filas.length === 0
    if (!porEnter || ahora?.tipo === 'enlace' || sinCoincidencias) {
      traer(tipeado)
    }
  }
  function traer(tipeado: string) {
    setTraerAlMontar(true)
    void escribir({
      [CLAVE_DE_ALTA]: 'subasta',
      [CLAVE_DE_BUSQUEDA]: tipeado.trim(),
      [CLAVE_DE_CURSOR]: null,
    })
  }
  return {
    vista,
    traerAlMontar,
    // Lo que el buscador muestra: el aviso de un enlace que no se puede traer, el botón y si el campo ofrece traer.
    avisoDelEnlace: delTexto.aviso,
    etiquetaDeTraer: delTexto.etiqueta,
    conTraer: contexto.puedeCargar && contexto.esSubasta && contexto.apibaraActiva,
    traerDe,
    cargarAMano: () => {
      setTraerAlMontar(false)
      void escribir({ [CLAVE_DE_ALTA]: 'mano' })
    },
    volver: () => {
      void escribir({ [CLAVE_DE_ALTA]: null })
    },
  }
}
