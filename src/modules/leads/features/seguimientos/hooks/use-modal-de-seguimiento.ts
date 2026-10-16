'use client'

import { useEffect, useRef, useState } from 'react'
import { useApertura } from '@/shared/ui/use-apertura'
import { useRevisionAlAbrir } from '@/shared/ui/use-revision-al-abrir'
import { useUltimo } from '@/shared/ui/use-ultimo'
import {
  MENSAJE_SIN_TIPOS_DE_SEGUIMIENTO,
  seguimientoParaEditar,
} from '../../../entities/edicion-de-seguimiento'
import { MENSAJE_DE_SEGUIMIENTO_NO_DISPONIBLE } from '../../../entities/seguimiento'
import { usePanelDeSeguimiento } from './use-panel-de-seguimiento'
import type { Seguimientos } from './use-seguimientos'

type Args = {
  seguimientos: Seguimientos
  // Hay tipos de seguimiento activos (sin ninguno no se anota).
  hayTipos: boolean
}

// El de la URL puede estar más allá de lo cargado (se editaba uno de «Ver más» y se recargó): antes
// de decir que no está, se piden páginas. Devuelve si todavía se está buscando.
function useBusquedaDelEditado(seguimientos: Seguimientos, id: string | null, noEsta: boolean) {
  const [buscado, setBuscado] = useState<string | null>(null)
  const falta = id !== null && noEsta && seguimientos.hayMas && buscado !== id
  const buscar = useRef(seguimientos.buscar)
  useEffect(() => {
    buscar.current = seguimientos.buscar
  })
  useEffect(() => {
    if (!falta) {
      return
    }
    let vigente = true
    void buscar.current(id).finally(() => {
      if (vigente) {
        setBuscado(id)
      }
    })
    return () => {
      vigente = false
    }
  }, [falta, id])
  return falta
}

// Por qué no se abre lo que pide la URL (nulo si se abre): anotar sin tipos activos, o editar uno que
// no está entre los propios.
function motivoDe(anotando: boolean, hayTipos: boolean, noEsta: boolean): string | null {
  if (anotando) {
    return hayTipos ? null : MENSAJE_SIN_TIPOS_DE_SEGUIMIENTO
  }
  return noEsta ? MENSAJE_DE_SEGUIMIENTO_NO_DISPONIBLE : null
}

// El de la URL entre los cargados: el que se puede editar (nulo si no) y si «no está».
function objetivoDe(seguimientos: Seguimientos, editando: string | null) {
  if (editando === null) {
    return { editable: null, noEsta: false }
  }
  const objetivo = seguimientoParaEditar(seguimientos.lista, editando, seguimientos.puedoAnotar)
  return objetivo.tipo === 'editable'
    ? { editable: objetivo.seguimiento, noEsta: false }
    : { editable: null, noEsta: true }
}

function modoDe(anotando: boolean, editando: string | null): 'anotar' | 'editar' | null {
  if (anotando) {
    return 'anotar'
  }
  return editando === null ? null : 'editar'
}

// Lo que se revisa al abrir: anotar con permiso, o editar cuando ya se buscó el de la URL. Nulo =
// nada que revisar (no hay panel, falta el permiso o se sigue buscando).
function claveDeRevision(
  apertura: number,
  modo: 'anotar' | 'editar' | null,
  editando: string | null,
  listo: boolean,
): string | null {
  return modo !== null && listo ? `${String(apertura)}:${editando ?? 'anotar'}` : null
}

// Qué muestra el modal de seguimientos según la URL. Anotar sólo con el lead en la cartera y
// `leads.editar` (sin eso, la URL escrita a mano no abre nada). Editar abre el de `?seguimiento=<id>`
// entre los propios (ajeno, eliminado o inventado «no está», con el mismo aviso). Lo que deja de estar
// con el modal abierto no lo cierra: el modal dice por qué ya no se guarda.
export function useModalDeSeguimiento({ seguimientos, hayTipos }: Args) {
  const panel = usePanelDeSeguimiento()
  const { puedoAnotar } = seguimientos
  const { anotando, editando } = panel
  const { editable, noEsta } = objetivoDe(seguimientos, editando)
  const buscando = useBusquedaDelEditado(seguimientos, editando, noEsta)
  const enLaUrl = modoDe(anotando, editando)
  const apertura = useApertura(enLaUrl !== null)
  const listo = enLaUrl === 'anotar' ? puedoAnotar : !buscando
  const clave = claveDeRevision(apertura, enLaUrl, editando, listo)
  const rechazada = useRevisionAlAbrir(clave, motivoDe(anotando, hayTipos, noEsta), panel.cerrar)
  const abierto = clave !== null && !rechazada
  // Mientras se cierra (la URL ya no lo nombra) y si deja de estar, el último que se vio.
  const ultimo = useUltimo(editable)
  const modo = useUltimo(enLaUrl)
  const original = modo === 'editar' ? ultimo : null
  // Pasar de uno a otro sin cerrar también es una apertura nueva: no se mezcla lo escrito.
  const destino = useUltimo(anotando ? 'anotar' : editando)
  const editandoAbierto = abierto && editando !== null

  return {
    abierto,
    llave: `${String(apertura)}:${destino ?? ''}`,
    original,
    noDisponible: editandoAbierto && noEsta ? MENSAJE_DE_SEGUIMIENTO_NO_DISPONIBLE : null,
    abrirAnotar: panel.abrirAnotar,
    abrirEdicion: panel.abrirEdicion,
    cerrar: panel.cerrar,
    // El «Editar» del que se estaba editando, si sigue en la lista.
    focoAlCerrar: (): HTMLElement | null =>
      original
        ? document.querySelector<HTMLElement>(`[data-seguimiento-editar="${original.id}"]`)
        : null,
  }
}
