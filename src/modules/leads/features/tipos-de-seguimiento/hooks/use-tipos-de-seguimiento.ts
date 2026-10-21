'use client'

import { useState } from 'react'
import { avisarConDeshacer, avisarExito } from '@/shared/ui/toasts'
import type { Movimiento } from '@/shared/ui/lista-de-catalogo/use-foco-tras-mover'
import {
  destinoDeTipoDeSeguimiento,
  firmaDeTiposDeSeguimiento,
  textoDelLugarDeTipoDeSeguimiento,
  type Direccion,
  type ListaDeTiposDeSeguimiento,
  type TipoDeSeguimientoConUso,
} from '../../../entities/tipo-de-seguimiento'
import { useEscrituraDeTiposDeSeguimiento } from './use-escritura-de-tipos-de-seguimiento'
import { usePedidosDeTiposDeSeguimiento } from './use-pedidos-de-tipos-de-seguimiento'

// La lista de la página, sembrada por una firma: si lo que trae cambia (otra persona, «Recargar»), la local se vuelve a sembrar con eso.
function useListaSembrada(inicial: ListaDeTiposDeSeguimiento) {
  const firma = firmaDeTiposDeSeguimiento(inicial)
  const [visto, setVisto] = useState(firma)
  const [lista, setLista] = useState<ListaDeTiposDeSeguimiento>(inicial)
  if (visto !== firma) {
    setVisto(firma)
    setLista(inicial)
  }
  return [lista, setLista] as const
}

// Los tipos de seguimiento de la pantalla de configuración. Cada acción devuelve la lista entera con las versiones nuevas (a lo sumo el
// tope) y esa reemplaza a la local: ningún pedido extra. Una escritura a la vez. Un conflicto o un tipo que ya no está se dicen y la
// página se vuelve a leer.
export function useTiposDeSeguimiento(inicial: ListaDeTiposDeSeguimiento) {
  const [lista, poner] = useListaSembrada(inicial)
  const { tipos } = lista
  const escritura = useEscrituraDeTiposDeSeguimiento(poner)
  const pedir = usePedidosDeTiposDeSeguimiento()
  // Lo que anuncia el lector de pantalla tras mover, y qué se movió (la pantalla devuelve el foco).
  const [anuncio, setAnuncio] = useState('')
  const [movimiento, setMovimiento] = useState<Movimiento | null>(null)

  // Activar o desactivar guarda solo, y es reversible: se ofrece «Deshacer» (con la versión nueva). Cualquiera se puede apagar.
  async function activar(tipo: TipoDeSeguimientoConUso, activo: boolean) {
    const envio = await escritura.mandar(() => pedir.guardar(tipo, { activo }))
    if (envio === null) {
      return
    }
    if (!envio.ok) {
      escritura.rechazar(envio)
      return
    }
    const quedo = envio.data.lista.tipos.find((uno) => uno.id === tipo.id)
    if (quedo) {
      const dicho = activo ? 'activado' : 'desactivado'
      avisarConDeshacer(`«${tipo.nombre}» ${dicho}.`, () => {
        void activar(quedo, !activo)
      })
    }
  }

  async function mover(tipo: TipoDeSeguimientoConUso, direccion: Direccion) {
    const destino = destinoDeTipoDeSeguimiento(tipos, tipo.id, direccion)
    const envio = destino && (await escritura.mandar(() => pedir.mover(tipo, destino.despuesDe)))
    if (!envio) {
      return
    }
    if (!envio.ok) {
      escritura.rechazar(envio)
      return
    }
    setAnuncio(textoDelLugarDeTipoDeSeguimiento(envio.data.lista.tipos, tipo.id))
    setMovimiento((antes) => ({ id: tipo.id, direccion, veces: (antes?.veces ?? 0) + 1 }))
  }

  async function eliminar(tipo: TipoDeSeguimientoConUso): Promise<boolean> {
    const envio = await escritura.mandar(() => pedir.eliminar(tipo))
    if (!envio?.ok) {
      if (envio) {
        escritura.rechazar(envio)
        // «Ya tiene seguimientos» (llegó uno mientras se confirmaba): la fila debe mostrarse como con seguimientos.
        escritura.releer()
      }
      return false
    }
    avisarExito(`«${tipo.nombre}» eliminado.`)
    return true
  }

  return {
    lista,
    tipos,
    anuncio,
    movimiento,
    enCurso: escritura.enCurso,
    // Los dos del modal devuelven el envío entero: el modal dice el motivo junto al campo.
    crear: (id: string, nombre: string, icono: string | null) =>
      escritura.mandar(() => pedir.crear(id, nombre, icono)),
    guardar: (tipo: TipoDeSeguimientoConUso, cambios: { nombre?: string; icono?: string | null }) =>
      escritura.mandar(() => pedir.guardar(tipo, cambios)),
    activar,
    mover,
    eliminar,
  }
}

export type TiposDeSeguimiento = ReturnType<typeof useTiposDeSeguimiento>
