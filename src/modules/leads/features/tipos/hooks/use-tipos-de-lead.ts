'use client'

import { useState } from 'react'
import { avisarConDeshacer, avisarExito } from '@/shared/ui/toasts'
import type { Movimiento } from '@/shared/ui/lista-de-catalogo/use-foco-tras-mover'
import {
  destinoDeTipo,
  firmaDeTipos,
  motivoParaNoDesactivar,
  textoDelLugar,
  type ClaseDeTipoDeLead,
  type Direccion,
  type ListaDeTipos,
  type TipoDeLeadConUso,
} from '../../../entities/tipo-de-lead'
import { useEscrituraDeTipos } from './use-escritura-de-tipos'
import { usePedidosDeTipos } from './use-pedidos-de-tipos'

// La lista de la página, sembrada por una firma: si lo que trae cambia (otra persona, «Recargar»), la
// local se vuelve a sembrar con eso.
function useListaSembrada(inicial: ListaDeTipos) {
  const firma = firmaDeTipos(inicial)
  const [visto, setVisto] = useState(firma)
  const [lista, setLista] = useState<ListaDeTipos>(inicial)
  if (visto !== firma) {
    setVisto(firma)
    setLista(inicial)
  }
  return [lista, setLista] as const
}

// Los tipos de lead de la pantalla de configuración. Cada acción devuelve la lista entera con las versiones nuevas (a lo sumo el
// tope) y esa reemplaza a la local: ningún pedido extra. Una escritura a la vez. Un conflicto o un tipo que ya no está se dicen
// y la página se vuelve a leer.
export function useTiposDeLead(inicial: ListaDeTipos) {
  const [lista, poner] = useListaSembrada(inicial)
  const { tipos } = lista
  const escritura = useEscrituraDeTipos(poner)
  const pedir = usePedidosDeTipos()
  // Lo que anuncia el lector de pantalla tras mover, y qué se movió (la pantalla devuelve el foco).
  const [anuncio, setAnuncio] = useState('')
  const [movimiento, setMovimiento] = useState<Movimiento | null>(null)

  // Activar o desactivar guarda solo, y es reversible: se ofrece «Deshacer» (con la versión nueva). Apagar el último activo de
  // su clase no se ofrece (la fila lo dice y lo apaga); la base lo rechaza igual si llegara.
  async function activar(tipo: TipoDeLeadConUso, activo: boolean) {
    if (!activo && motivoParaNoDesactivar(tipos, tipo) !== null) {
      return
    }
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

  async function mover(tipo: TipoDeLeadConUso, direccion: Direccion) {
    const destino = destinoDeTipo(tipos, tipo.id, direccion)
    const envio = destino && (await escritura.mandar(() => pedir.mover(tipo, destino.despuesDe)))
    if (!envio) {
      return
    }
    if (!envio.ok) {
      escritura.rechazar(envio)
      return
    }
    setAnuncio(textoDelLugar(envio.data.lista.tipos, tipo.id))
    setMovimiento((antes) => ({ id: tipo.id, direccion, veces: (antes?.veces ?? 0) + 1 }))
  }

  async function eliminar(tipo: TipoDeLeadConUso): Promise<boolean> {
    const envio = await escritura.mandar(() => pedir.eliminar(tipo))
    if (!envio?.ok) {
      if (envio) {
        escritura.rechazar(envio)
        // «Ya tiene leads» (llegó uno mientras se confirmaba): la fila debe mostrarse como con leads.
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
    crear: (id: string, nombre: string, clase: ClaseDeTipoDeLead, icono: string | null) =>
      escritura.mandar(() => pedir.crear(id, nombre, clase, icono)),
    guardar: (tipo: TipoDeLeadConUso, cambios: { nombre?: string; icono?: string | null }) =>
      escritura.mandar(() => pedir.guardar(tipo, cambios)),
    activar,
    mover,
    eliminar,
  }
}

export type TiposDeLead = ReturnType<typeof useTiposDeLead>
