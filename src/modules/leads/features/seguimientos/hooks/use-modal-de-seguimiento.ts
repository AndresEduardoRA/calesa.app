'use client'

import { useEffect, useRef, useState } from 'react'
import { z } from 'zod'
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

const ES_GUID = z.guid()

type Busqueda = { id: string; resultado: 'hecha' | 'fallo' }

// El de la URL puede estar más allá de lo cargado (se editaba uno de «Ver más» y se recargó): antes
// de decir que no está, se piden páginas (sólo antes de abrir, con un id que es un id y con permiso).
// Si había otra lectura en vuelo se espera a que termine; si la lectura falla (ya se avisó), no se
// dice que no está: la URL queda y el modal no se abre. Devuelve si todavía se está buscando y si falló.
function useBusquedaDelEditado(seguimientos: Seguimientos, id: string | null, buscable: boolean) {
  const [busqueda, setBusqueda] = useState<Busqueda | null>(null)
  const yaBuscado = id !== null && busqueda?.id === id
  const falta =
    id !== null &&
    buscable &&
    seguimientos.hayMas &&
    seguimientos.puedoAnotar &&
    ES_GUID.safeParse(id).success &&
    !yaBuscado
  const buscar = useRef(seguimientos.buscar)
  useEffect(() => {
    buscar.current = seguimientos.buscar
  })
  const { cargando } = seguimientos
  useEffect(() => {
    if (!falta || cargando) {
      return
    }
    let vigente = true
    void buscar.current(id).then((resultado) => {
      if (vigente && resultado !== 'ocupada') {
        setBusqueda({ id, resultado })
      }
    })
    return () => {
      vigente = false
    }
  }, [falta, id, cargando])
  return { buscando: falta, fallo: yaBuscado && busqueda.resultado === 'fallo' }
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

// Si ya se puede decidir: lo abierto sigue; anotar, con permiso; editar, cuando ya se buscó (sin falla).
function estaListo(
  enLaUrl: 'anotar' | 'editar' | null,
  yaAbierta: boolean,
  puedoAnotar: boolean,
  busqueda: { buscando: boolean; fallo: boolean },
): boolean {
  if (yaAbierta) {
    return true
  }
  return enLaUrl === 'anotar' ? puedoAnotar : !busqueda.buscando && !busqueda.fallo
}

// Lo que ya se abrió no se vuelve a decidir: si después se pierde el permiso o deja de estar, el
// modal sigue y lo dice (no se cierra con lo escrito ni sale a buscar otra vez). `base` identifica la
// apertura (y a quién nombra).
function useYaAbierta(base: string | null) {
  const [abierta, setAbierta] = useState<string | null>(null)
  const yaAbierta = base !== null && abierta === base
  return {
    yaAbierta,
    // Se llama en el render: la primera vez que esta apertura se muestra, queda anotada.
    anotar: (abierto: boolean) => {
      if (abierto && !yaAbierta) {
        setAbierta(base)
      }
    },
  }
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
  const enLaUrl = modoDe(anotando, editando)
  const apertura = useApertura(enLaUrl !== null)
  const { yaAbierta, anotar } = useYaAbierta(claveDeRevision(apertura, enLaUrl, editando, true))
  const busqueda = useBusquedaDelEditado(seguimientos, editando, noEsta && !yaAbierta)
  const listo = estaListo(enLaUrl, yaAbierta, puedoAnotar, busqueda)
  const clave = claveDeRevision(apertura, enLaUrl, editando, listo)
  const rechazada = useRevisionAlAbrir(clave, motivoDe(anotando, hayTipos, noEsta), panel.cerrar)
  const abierto = clave !== null && !rechazada
  anotar(abierto)
  // Mientras se cierra (la URL ya no lo nombra) y si deja de estar, el último que se vio.
  const ultimo = useUltimo(editable)
  const modo = useUltimo(enLaUrl)
  const original = modo === 'editar' ? ultimo : null
  // Pasar de uno a otro sin cerrar también es una apertura nueva: no se mezcla lo escrito.
  const destino = useUltimo(anotando ? 'anotar' : editando)

  return {
    abierto,
    llave: `${String(apertura)}:${destino ?? ''}`,
    original,
    noDisponible: abierto && noEsta ? MENSAJE_DE_SEGUIMIENTO_NO_DISPONIBLE : null,
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
