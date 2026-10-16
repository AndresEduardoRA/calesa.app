'use client'

import { useEffect, useRef, useState } from 'react'
import { z } from 'zod'
import type { Recordatorio } from '../../../entities/recordatorios'
import type { EstadoDeLectura } from './use-listas-de-recordatorios'
import { usePanelDeRecordatorio } from './use-panel-de-recordatorio'

const ES_GUID = z.guid()

type Args = {
  estado: EstadoDeLectura
  // Todo lo que se tiene: pendientes, completados y sueltos.
  cargados: readonly Recordatorio[]
  buscar: (id: string) => Promise<'hecha' | 'fallo'>
}

type Busqueda = { id: string; resultado: 'hecha' | 'fallo' }

// Qué pasa con el de la URL: `esta` entre lo cargado, `falta` leerlo por su id (la lista ya llegó, es
// un id y no se buscó), o se sigue `buscando` (la lista no llegó, falta leerlo o la lectura falló).
function situacion(
  editando: string | null,
  { estado, cargados }: Pick<Args, 'estado' | 'cargados'>,
  busqueda: Busqueda | null,
) {
  if (editando === null || cargados.some((r) => r.id === editando)) {
    return { falta: false, buscando: false }
  }
  const buscado = busqueda?.id === editando ? busqueda.resultado : null
  const falta = estado === 'listo' && buscado === null && ES_GUID.safeParse(editando).success
  return { falta, buscando: estado !== 'listo' || falta || buscado === 'fallo' }
}

// El de `?recordatorio=<id>` puede no estar entre lo cargado (es de «Ver más», está completado y su
// plegado no se abrió, o se recargó): antes de decir que no está, se lee por su id (un pedido, cargue lo
// que cargue). Mientras se lee la lista o se busca, el modal no decide; si la lectura falla (ya se
// avisó), tampoco: la URL queda y el modal no se abre. Devuelve si todavía se está buscando.
export function useBusquedaDeRecordatorio({ estado, cargados, buscar }: Args): boolean {
  const { editando } = usePanelDeRecordatorio()
  const [busqueda, setBusqueda] = useState<Busqueda | null>(null)
  const { falta, buscando } = situacion(editando, { estado, cargados }, busqueda)
  const ref = useRef(buscar)
  useEffect(() => {
    ref.current = buscar
  })
  useEffect(() => {
    if (!falta || editando === null) {
      return
    }
    let vigente = true
    void ref.current(editando).then((resultado) => {
      if (vigente) {
        setBusqueda({ id: editando, resultado })
      }
    })
    return () => {
      vigente = false
    }
  }, [falta, editando])
  return buscando
}
