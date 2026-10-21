'use client'

import { useState } from 'react'
import { avisarConDeshacer, avisarExito } from '@/shared/ui/toasts'
import type { Movimiento } from '@/shared/ui/lista-de-catalogo/use-foco-tras-mover'
import {
  destinoDeOrigen,
  firmaDeOrigenes,
  motivoParaNoDesactivar,
  textoDelLugar,
  type Direccion,
  type OrigenDeLeadConUso,
} from '../../../entities/origen-de-lead'
import { useEscrituraDeOrigenes } from './use-escritura-de-origenes'
import { usePedidosDeOrigenes } from './use-pedidos-de-origenes'
import { usePorDefecto } from './use-por-defecto'

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
  const porDefecto = usePorDefecto(origenes, escritura, pedir)
  // Lo que anuncia el lector de pantalla tras mover, y qué se movió (la pantalla devuelve el foco).
  const [anuncio, setAnuncio] = useState('')
  const [movimiento, setMovimiento] = useState<Movimiento | null>(null)

  // Activar o desactivar guarda solo, y es reversible: se ofrece «Deshacer» (con la versión nueva). El origen por defecto no se apaga (la
  // lista lo dice y la base lo rechaza igual si llegara).
  async function activar(origen: OrigenDeLeadConUso, activo: boolean) {
    if (!activo && motivoParaNoDesactivar(origen) !== null) {
      return
    }
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
    crear: (id: string, nombre: string, icono: string | null) =>
      escritura.mandar(() => pedir.crear(id, nombre, icono)),
    guardar: (origen: OrigenDeLeadConUso, cambios: { nombre?: string; icono?: string | null }) =>
      escritura.mandar(() => pedir.guardar(origen, cambios)),
    activar,
    marcarPorDefecto: porDefecto.marcar,
    mover,
    eliminar,
  }
}

export type OrigenesDeLead = ReturnType<typeof useOrigenesDeLead>
