'use client'

import { useState } from 'react'
import { avisarConDeshacer, avisarExito } from '@/shared/ui/toasts'
import {
  destinoDeOrigen,
  firmaDeOrigenes,
  textoDelLugar,
  type Direccion,
  type OrigenDeLeadConUso,
} from '../../../entities/origen-de-lead'
import { useEscrituraDeOrigenes } from './use-escritura-de-origenes'
import { usePedidosDeOrigenes } from './use-pedidos-de-origenes'

export type Movimiento = { id: string; direccion: Direccion; veces: number }

// La lista de la página, sembrada por una firma: si lo que trae cambia (otra persona, «Recargar»), la
// local se vuelve a sembrar con eso.
function useListaSembrada(inicial: readonly OrigenDeLeadConUso[]) {
  const firma = firmaDeOrigenes(inicial)
  const [visto, setVisto] = useState(firma)
  const [origenes, setOrigenes] = useState<readonly OrigenDeLeadConUso[]>(inicial)
  if (visto !== firma) {
    setVisto(firma)
    setOrigenes(inicial)
  }
  return [origenes, setOrigenes] as const
}

// Los orígenes del lead de la pantalla de configuración. Cada acción devuelve la lista entera con las
// versiones nuevas (a lo sumo 100 filas) y esa reemplaza a la local: ningún pedido extra. Una escritura
// a la vez. Un conflicto o un origen que ya no está se dicen y la página se vuelve a leer.
export function useOrigenesDeLead(inicial: readonly OrigenDeLeadConUso[]) {
  const [origenes, poner] = useListaSembrada(inicial)
  const escritura = useEscrituraDeOrigenes(poner)
  const pedir = usePedidosDeOrigenes()
  // Lo que anuncia el lector de pantalla tras mover, y qué se movió (la pantalla devuelve el foco).
  const [anuncio, setAnuncio] = useState('')
  const [movimiento, setMovimiento] = useState<Movimiento | null>(null)

  // El interruptor «Activo» guarda solo, y es reversible: se ofrece «Deshacer» (con la versión nueva).
  async function activar(origen: OrigenDeLeadConUso, activo: boolean) {
    const envio = await escritura.mandar(() => pedir.guardar(origen, { activo }))
    if (envio === null) {
      return
    }
    if (!envio.ok) {
      escritura.rechazar(envio)
      return
    }
    const quedo = envio.data.origenes.find((uno) => uno.id === origen.id)
    if (quedo) {
      const dicho = activo ? 'activado' : 'desactivado'
      avisarConDeshacer(`«${origen.nombre}» ${dicho}.`, () => {
        void activar(quedo, !activo)
      })
    }
  }

  async function mover(origen: OrigenDeLeadConUso, direccion: Direccion) {
    const destino = destinoDeOrigen(origenes, origen.id, direccion)
    const envio = destino && (await escritura.mandar(() => pedir.mover(origen, destino.despuesDe)))
    if (!envio) {
      return
    }
    if (!envio.ok) {
      escritura.rechazar(envio)
      return
    }
    setAnuncio(textoDelLugar(envio.data.origenes, origen.id))
    setMovimiento((antes) => ({ id: origen.id, direccion, veces: (antes?.veces ?? 0) + 1 }))
  }

  async function eliminar(origen: OrigenDeLeadConUso): Promise<boolean> {
    const envio = await escritura.mandar(() => pedir.eliminar(origen))
    if (!envio?.ok) {
      if (envio) {
        escritura.rechazar(envio)
        // «Ya tiene leads» (llegó uno mientras se confirmaba): la fila debe mostrarse como con leads.
        escritura.releer()
      }
      return false
    }
    avisarExito(`«${origen.nombre}» eliminado.`)
    return true
  }

  return {
    origenes,
    anuncio,
    movimiento,
    enCurso: escritura.enCurso,
    // Los dos del modal devuelven el envío entero: el modal dice el motivo junto al campo.
    crear: (id: string, nombre: string) => escritura.mandar(() => pedir.crear(id, nombre)),
    renombrar: (origen: OrigenDeLeadConUso, nombre: string) =>
      escritura.mandar(() => pedir.guardar(origen, { nombre })),
    activar,
    mover,
    eliminar,
  }
}

export type OrigenesDeLead = ReturnType<typeof useOrigenesDeLead>
